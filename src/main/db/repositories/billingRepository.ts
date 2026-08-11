import { getDb } from '../connection'
import type { BillingDetailItem, BillingSummaryItem, InvoiceData, InvoiceLineItem } from '../../../shared/types/entities'

// yearMonth("YYYY-MM")から、TransportDate列比較用の半開区間[from, to)を作る
function monthRange(yearMonth: string): { from: string; to: string } {
  const [yearStr, monthStr] = yearMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const from = `${yearStr}-${monthStr}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { from, to }
}

interface SummaryRow {
  userId: number
  userName: string
  kokuhorenClaimFlag: number
  amount: number
}

// 搬送先ごとの各種料金(運送サービス・介護基本・身体介助・付帯サービス・特別自費・立替費用)を
// 合計するSQL式。実績単位の金額(ResultId基準)として使う。
const DESTINATION_FEE_SUM_SQL = `(
  SELECT COALESCE(SUM(
    COALESCE(rd.CalculatedFee, 0) + COALESCE(rd.BaseCareFeeAmount, 0) +
    COALESCE(rd.PhysicalCareFeeAmount, 0) + COALESCE(rd.AncillaryServiceFeeAmount, 0) +
    COALESCE(rd.SpecialFeeAmount, 0) + COALESCE(rd.AdvancedExpense, 0)
  ), 0)
  FROM T_ResultDestination rd WHERE rd.ResultId = r.ResultId
)`

// 指定月の搬送実績を利用者ごとに集計する。国保連請求分とそれ以外(自費等)を分けて合計する。
export function getMonthlyBillingSummary(yearMonth: string): BillingSummaryItem[] {
  const { from, to } = monthRange(yearMonth)
  const rows = getDb()
    .prepare(
      `SELECT
        r.UserId AS userId,
        u.Name AS userName,
        r.KokuhorenClaimFlag AS kokuhorenClaimFlag,
        ${DESTINATION_FEE_SUM_SQL} + COALESCE(r.CancellationFeeAmount, 0) AS amount
       FROM T_TransportResult r
       JOIN M_User u ON u.UserId = r.UserId
       WHERE r.TransportDate >= ? AND r.TransportDate < ?`
    )
    .all(from, to) as unknown as SummaryRow[]

  const byUser = new Map<number, BillingSummaryItem>()
  for (const row of rows) {
    let item = byUser.get(row.userId)
    if (!item) {
      item = {
        userId: row.userId,
        userName: row.userName,
        kokuhorenAmount: 0,
        selfPayAmount: 0,
        totalAmount: 0,
        resultCount: 0
      }
      byUser.set(row.userId, item)
    }
    if (row.kokuhorenClaimFlag === 1) {
      item.kokuhorenAmount += row.amount
    } else {
      item.selfPayAmount += row.amount
    }
    item.totalAmount += row.amount
    item.resultCount += 1
  }

  return Array.from(byUser.values()).sort((a, b) => a.userName.localeCompare(b.userName, 'ja'))
}

interface DetailRow {
  resultId: number
  transportDate: string
  kokuhorenClaimFlag: number
  destinationNames: string | null
  amount: number | null
}

// 指定月・指定利用者の実績明細(集計表の内訳表示用)
export function getMonthlyBillingDetail(yearMonth: string, userId: number): BillingDetailItem[] {
  const { from, to } = monthRange(yearMonth)
  const rows = getDb()
    .prepare(
      `SELECT
        r.ResultId AS resultId,
        r.TransportDate AS transportDate,
        r.KokuhorenClaimFlag AS kokuhorenClaimFlag,
        (SELECT GROUP_CONCAT(d.Name, '、')
           FROM T_ResultDestination rd
           JOIN M_Destination d ON d.DestinationId = rd.DestinationId
          WHERE rd.ResultId = r.ResultId
          ORDER BY rd.SeqNo) AS destinationNames,
        ${DESTINATION_FEE_SUM_SQL} + COALESCE(r.CancellationFeeAmount, 0) AS amount
       FROM T_TransportResult r
       WHERE r.UserId = ? AND r.TransportDate >= ? AND r.TransportDate < ?
       ORDER BY r.TransportDate`
    )
    .all(userId, from, to) as unknown as DetailRow[]

  return rows.map((row) => ({
    resultId: row.resultId,
    transportDate: row.transportDate,
    kokuhorenClaimFlag: row.kokuhorenClaimFlag === 1,
    destinationNames: row.destinationNames ? row.destinationNames.split('、') : [],
    amount: row.amount ?? 0
  }))
}

interface InvoiceLineRow {
  resultId: number
  transportDate: string
  destinationName: string
  departureLocation: string | null
  departureTime: string | null
  arrivalTime: string | null
  transportFee: number | null
  baseCareFee: number | null
  physicalCareFee: number | null
  ancillaryServiceFee: number | null
  specialFee: number | null
  advancedExpense: number | null
}

function computeMinutes(departureTime: string | null, arrivalTime: string | null): number | null {
  if (!departureTime || !arrivalTime) return null
  const [dh, dm] = departureTime.split(':').map(Number)
  const [ah, am] = arrivalTime.split(':').map(Number)
  if ([dh, dm, ah, am].some((n) => Number.isNaN(n))) return null
  let diff = ah * 60 + am - (dh * 60 + dm)
  if (diff < 0) diff += 24 * 60
  return diff
}

// 請求書印刷用に、指定月・指定利用者の搬送先ごとの明細と利用者情報をまとめて取得する
export function getInvoiceData(yearMonth: string, userId: number): InvoiceData {
  const { from, to } = monthRange(yearMonth)
  const db = getDb()

  const user = db
    .prepare('SELECT UserId, Name, PostalCode, Address FROM M_User WHERE UserId = ?')
    .get(userId) as unknown as
    | { UserId: number; Name: string; PostalCode: string | null; Address: string | null }
    | undefined
  if (!user) throw new Error(`利用者 ${userId} が見つかりません`)

  const lineRows = db
    .prepare(
      `SELECT
        r.ResultId AS resultId,
        r.TransportDate AS transportDate,
        d.Name AS destinationName,
        leg.DepartureLocation AS departureLocation,
        leg.DepartureTime AS departureTime,
        leg.ArrivalTime AS arrivalTime,
        rd.CalculatedFee AS transportFee,
        rd.BaseCareFeeAmount AS baseCareFee,
        rd.PhysicalCareFeeAmount AS physicalCareFee,
        rd.AncillaryServiceFeeAmount AS ancillaryServiceFee,
        rd.SpecialFeeAmount AS specialFee,
        rd.AdvancedExpense AS advancedExpense
       FROM T_TransportResult r
       JOIN T_ResultDestination rd ON rd.ResultId = r.ResultId
       JOIN M_Destination d ON d.DestinationId = rd.DestinationId
       LEFT JOIN T_ResultLeg leg ON leg.ResultDestinationId = rd.ResultDestinationId AND leg.LegType = 1
       WHERE r.UserId = ? AND r.TransportDate >= ? AND r.TransportDate < ?
       ORDER BY r.TransportDate, rd.SeqNo`
    )
    .all(userId, from, to) as unknown as InvoiceLineRow[]

  const lineItems: InvoiceLineItem[] = lineRows.map((row) => ({
    resultId: row.resultId,
    transportDate: row.transportDate,
    destinationName: row.destinationName,
    departureLocation: row.departureLocation,
    departureTime: row.departureTime,
    arrivalTime: row.arrivalTime,
    minutes: computeMinutes(row.departureTime, row.arrivalTime),
    transportFee: row.transportFee ?? 0,
    baseCareFee: row.baseCareFee ?? 0,
    physicalCareFee: row.physicalCareFee ?? 0,
    ancillaryServiceFee: row.ancillaryServiceFee ?? 0,
    specialFee: row.specialFee ?? 0,
    advancedExpense: row.advancedExpense ?? 0
  }))

  const cancellationRow = db
    .prepare(
      `SELECT COALESCE(SUM(CancellationFeeAmount), 0) AS total
       FROM T_TransportResult
       WHERE UserId = ? AND TransportDate >= ? AND TransportDate < ?`
    )
    .get(userId, from, to) as unknown as { total: number }

  return {
    userId: user.UserId,
    userName: user.Name,
    userAddress: user.Address,
    userPostalCode: user.PostalCode,
    yearMonth,
    lineItems,
    cancellationFeeTotal: cancellationRow.total
  }
}
