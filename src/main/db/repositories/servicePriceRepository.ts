import { getDb } from '../connection'
import type {
  NewServicePriceRevisionInput,
  NewServicePriceTier,
  ServicePriceRevision,
  ServicePriceRevisionDetail,
  ServicePriceTier
} from '../../../shared/types/entities'

interface RevisionRow {
  RevisionId: number
  Category: string
  EffectiveFrom: string
  BaseFee: number
  UnitPrice: number
  IntervalMinutes: number
  Remarks: string | null
  CreatedAt: string
  UpdatedAt: string
}

interface TierRow {
  TierId: number
  RevisionId: number
  SeqNo: number
  LowerMinutes: number
  UpperMinutes: number
  Amount: number
}

function mapRevisionRow(row: RevisionRow): ServicePriceRevision {
  return {
    revisionId: row.RevisionId,
    category: row.Category,
    effectiveFrom: row.EffectiveFrom,
    baseFee: row.BaseFee,
    unitPrice: row.UnitPrice,
    intervalMinutes: row.IntervalMinutes,
    remarks: row.Remarks,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt
  }
}

function mapTierRow(row: TierRow): ServicePriceTier {
  return {
    tierId: row.TierId,
    revisionId: row.RevisionId,
    seqNo: row.SeqNo,
    lowerMinutes: row.LowerMinutes,
    upperMinutes: row.UpperMinutes,
    amount: row.Amount
  }
}

export function listRevisions(opts?: { category?: string }): ServicePriceRevision[] {
  const db = getDb()
  const conditions: string[] = []
  const params: string[] = []
  if (opts?.category) {
    conditions.push('Category = ?')
    params.push(opts.category)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db
    .prepare(`SELECT * FROM M_ServicePriceRevision ${where} ORDER BY Category, EffectiveFrom DESC`)
    .all(...params) as unknown as RevisionRow[]
  return rows.map(mapRevisionRow)
}

export function getRevisionDetail(revisionId: number): ServicePriceRevisionDetail | null {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM M_ServicePriceRevision WHERE RevisionId = ?')
    .get(revisionId) as unknown as RevisionRow | undefined
  if (!row) return null

  const tierRows = db
    .prepare('SELECT * FROM M_ServicePriceTier WHERE RevisionId = ? ORDER BY SeqNo')
    .all(revisionId) as unknown as TierRow[]

  return { revision: mapRevisionRow(row), tiers: tierRows.map(mapTierRow) }
}

function insertTiers(db: ReturnType<typeof getDb>, revisionId: number, tiers: NewServicePriceTier[]): void {
  const stmt = db.prepare(
    `INSERT INTO M_ServicePriceTier (RevisionId, SeqNo, LowerMinutes, UpperMinutes, Amount)
     VALUES (?, ?, ?, ?, ?)`
  )
  tiers.forEach((tier, index) => {
    stmt.run(revisionId, index + 1, tier.lowerMinutes, tier.upperMinutes, tier.amount)
  })
}

export function createRevision(input: NewServicePriceRevisionInput): ServicePriceRevisionDetail {
  const db = getDb()
  db.exec('BEGIN')
  try {
    const result = db
      .prepare(
        `INSERT INTO M_ServicePriceRevision (Category, EffectiveFrom, BaseFee, UnitPrice, IntervalMinutes, Remarks)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.revision.category,
        input.revision.effectiveFrom,
        input.revision.baseFee,
        input.revision.unitPrice,
        input.revision.intervalMinutes,
        input.revision.remarks ?? null
      )
    const revisionId = Number(result.lastInsertRowid)
    insertTiers(db, revisionId, input.tiers)
    db.exec('COMMIT')
    return getRevisionDetail(revisionId) as ServicePriceRevisionDetail
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function updateRevision(
  revisionId: number,
  input: NewServicePriceRevisionInput
): ServicePriceRevisionDetail {
  const db = getDb()
  const current = db
    .prepare('SELECT * FROM M_ServicePriceRevision WHERE RevisionId = ?')
    .get(revisionId) as unknown as RevisionRow | undefined
  if (!current) throw new Error(`サービス単価改定 ${revisionId} が見つかりません`)

  db.exec('BEGIN')
  try {
    db.prepare(
      `UPDATE M_ServicePriceRevision SET
        Category = ?, EffectiveFrom = ?, BaseFee = ?, UnitPrice = ?, IntervalMinutes = ?, Remarks = ?,
        UpdatedAt = datetime('now','localtime')
       WHERE RevisionId = ?`
    ).run(
      input.revision.category,
      input.revision.effectiveFrom,
      input.revision.baseFee,
      input.revision.unitPrice,
      input.revision.intervalMinutes,
      input.revision.remarks ?? null,
      revisionId
    )

    db.prepare('DELETE FROM M_ServicePriceTier WHERE RevisionId = ?').run(revisionId)
    insertTiers(db, revisionId, input.tiers)

    db.exec('COMMIT')
    return getRevisionDetail(revisionId) as ServicePriceRevisionDetail
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function deleteRevision(revisionId: number): void {
  getDb().prepare('DELETE FROM M_ServicePriceRevision WHERE RevisionId = ?').run(revisionId)
}

// 基本料金・単価・刻み幅から、旧Access画面と同じ「単価×区分番号」の時間帯テーブルを機械的に生成する
export function generateTiers(
  baseFee: number,
  unitPrice: number,
  intervalMinutes: number,
  tierCount: number
): NewServicePriceTier[] {
  const tiers: NewServicePriceTier[] = []
  for (let i = 1; i <= tierCount; i++) {
    tiers.push({
      lowerMinutes: (i - 1) * intervalMinutes + 1,
      upperMinutes: i * intervalMinutes,
      amount: baseFee + unitPrice * i
    })
  }
  return tiers
}

// 指定サービス区分・日付に適用される改定(EffectiveFromが対象日以前で最も新しいもの)を探し、
// 移動時間(分)に該当する時間帯の料金を返す。該当なしはnull。
export function findFeeForMinutes(
  category: string,
  date: string,
  minutes: number
): number | null {
  const db = getDb()
  const revisionRow = db
    .prepare(
      `SELECT RevisionId FROM M_ServicePriceRevision
       WHERE Category = ? AND EffectiveFrom <= ?
       ORDER BY EffectiveFrom DESC LIMIT 1`
    )
    .get(category, date) as unknown as { RevisionId: number } | undefined
  if (!revisionRow) return null

  const tierRow = db
    .prepare(
      `SELECT Amount FROM M_ServicePriceTier
       WHERE RevisionId = ? AND ? BETWEEN LowerMinutes AND UpperMinutes
       LIMIT 1`
    )
    .get(revisionRow.RevisionId, minutes) as unknown as { Amount: number } | undefined
  return tierRow ? tierRow.Amount : null
}
