import { getDb } from '../connection'
import type {
  NewRequestDestination,
  NewTransportRequestInput,
  RecurringRequestInput,
  RequestDestination,
  TransportRequest,
  TransportRequestDetail,
  TransportRequestListItem
} from '../../../shared/types/entities'

const MAX_DESTINATIONS = 3

interface RequestRow {
  RequestId: number
  ReceivedDate: string
  IsRecurring: number
  RecurringGroupId: number | null
  UserId: number
  RequestedBy: string | null
  TransportDate: string
  PickupTime: string | null
  ReturnPickupTime: string | null
  SuitableVehicle: string | null
  ServiceTicketFlag: number
  CompanionName: string | null
  WheelchairFlag: number
  SpecialTransportFlag: number
  CancelDate: string | null
  CancelReason: string | null
  PaidFlag: number
  Remarks: string | null
  CreatedAt: string
  UpdatedAt: string
}

interface RequestDestinationRow {
  RequestDestinationId: number
  RequestId: number
  SeqNo: number
  DestinationId: number
  DepartmentId: number | null
  Reason: string | null
  RoundTripFlag: number
  KaigoKihonFlag: number
}

function mapRequestRow(row: RequestRow): TransportRequest {
  return {
    requestId: row.RequestId,
    receivedDate: row.ReceivedDate,
    isRecurring: row.IsRecurring === 1,
    recurringGroupId: row.RecurringGroupId,
    userId: row.UserId,
    requestedBy: row.RequestedBy,
    transportDate: row.TransportDate,
    pickupTime: row.PickupTime,
    returnPickupTime: row.ReturnPickupTime,
    suitableVehicle: row.SuitableVehicle,
    serviceTicketFlag: row.ServiceTicketFlag === 1,
    companionName: row.CompanionName,
    wheelchairFlag: row.WheelchairFlag === 1,
    specialTransportFlag: row.SpecialTransportFlag === 1,
    cancelDate: row.CancelDate,
    cancelReason: row.CancelReason,
    paidFlag: row.PaidFlag === 1,
    remarks: row.Remarks,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt
  }
}

function mapDestinationRow(row: RequestDestinationRow): RequestDestination {
  return {
    requestDestinationId: row.RequestDestinationId,
    requestId: row.RequestId,
    seqNo: row.SeqNo,
    destinationId: row.DestinationId,
    departmentId: row.DepartmentId,
    reason: row.Reason,
    roundTripFlag: row.RoundTripFlag === 1,
    kaigoKihonFlag: row.KaigoKihonFlag === 1
  }
}

export function listRequests(opts?: {
  dateFrom?: string
  dateTo?: string
  userId?: number
  search?: string
}): TransportRequestListItem[] {
  const db = getDb()
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (opts?.dateFrom) {
    conditions.push('r.TransportDate >= ?')
    params.push(opts.dateFrom)
  }
  if (opts?.dateTo) {
    conditions.push('r.TransportDate <= ?')
    params.push(opts.dateTo)
  }
  if (opts?.userId) {
    conditions.push('r.UserId = ?')
    params.push(opts.userId)
  }
  if (opts?.search) {
    conditions.push('(u.Name LIKE ? OR u.NameKana LIKE ?)')
    params.push(`%${opts.search}%`, `%${opts.search}%`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db
    .prepare(
      `SELECT r.*, u.Name AS UserName,
        (SELECT GROUP_CONCAT(d.Name, '、')
           FROM T_RequestDestination rd
           JOIN M_Destination d ON d.DestinationId = rd.DestinationId
          WHERE rd.RequestId = r.RequestId
          ORDER BY rd.SeqNo) AS DestinationNames
       FROM T_TransportRequest r
       JOIN M_User u ON u.UserId = r.UserId
       ${where}
       ORDER BY r.TransportDate, r.PickupTime`
    )
    .all(...params) as unknown as (RequestRow & {
    UserName: string
    DestinationNames: string | null
  })[]

  return rows.map((row) => ({
    ...mapRequestRow(row),
    userName: row.UserName,
    destinationNames: row.DestinationNames ? row.DestinationNames.split('、') : []
  }))
}

export function getRequestDetail(id: number): TransportRequestDetail | null {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM T_TransportRequest WHERE RequestId = ?')
    .get(id) as unknown as RequestRow | undefined
  if (!row) return null

  const destRows = db
    .prepare('SELECT * FROM T_RequestDestination WHERE RequestId = ? ORDER BY SeqNo')
    .all(id) as unknown as RequestDestinationRow[]

  return {
    request: mapRequestRow(row),
    destinations: destRows.map(mapDestinationRow)
  }
}

function insertDestinations(
  requestId: number,
  destinations: NewRequestDestination[]
): void {
  if (destinations.length === 0) throw new Error('搬送先を1件以上指定してください')
  if (destinations.length > MAX_DESTINATIONS) {
    throw new Error(`搬送先は最大${MAX_DESTINATIONS}件までです`)
  }
  const db = getDb()
  const stmt = db.prepare(
    `INSERT INTO T_RequestDestination
      (RequestId, SeqNo, DestinationId, DepartmentId, Reason, RoundTripFlag, KaigoKihonFlag)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  destinations.forEach((dest, index) => {
    stmt.run(
      requestId,
      index + 1,
      dest.destinationId,
      dest.departmentId ?? null,
      dest.reason ?? null,
      dest.roundTripFlag ? 1 : 0,
      dest.kaigoKihonFlag ? 1 : 0
    )
  })
}

function insertRequestHeader(
  input: NewTransportRequestInput['request'],
  isRecurring: boolean
): number {
  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO T_TransportRequest (
        ReceivedDate, IsRecurring, UserId, RequestedBy, TransportDate, PickupTime, ReturnPickupTime,
        SuitableVehicle, ServiceTicketFlag, CompanionName, WheelchairFlag,
        SpecialTransportFlag, CancelDate, CancelReason, PaidFlag, Remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.receivedDate,
      isRecurring ? 1 : 0,
      input.userId,
      input.requestedBy ?? null,
      input.transportDate,
      input.pickupTime ?? null,
      input.returnPickupTime ?? null,
      input.suitableVehicle ?? null,
      input.serviceTicketFlag ? 1 : 0,
      input.companionName ?? null,
      input.wheelchairFlag ? 1 : 0,
      input.specialTransportFlag ? 1 : 0,
      input.cancelDate ?? null,
      input.cancelReason ?? null,
      input.paidFlag ? 1 : 0,
      input.remarks ?? null
    )
  return Number(result.lastInsertRowid)
}

export function createRequest(input: NewTransportRequestInput): TransportRequestDetail {
  const db = getDb()
  db.exec('BEGIN')
  try {
    const requestId = insertRequestHeader(input.request, false)
    insertDestinations(requestId, input.destinations)
    db.exec('COMMIT')
    return getRequestDetail(requestId) as TransportRequestDetail
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function updateRequest(
  id: number,
  input: NewTransportRequestInput
): TransportRequestDetail {
  const db = getDb()
  const current = db
    .prepare('SELECT * FROM T_TransportRequest WHERE RequestId = ?')
    .get(id) as unknown as RequestRow | undefined
  if (!current) throw new Error(`搬送依頼 ${id} が見つかりません`)

  db.exec('BEGIN')
  try {
    db.prepare(
      `UPDATE T_TransportRequest SET
        ReceivedDate = ?, UserId = ?, RequestedBy = ?, TransportDate = ?, PickupTime = ?, ReturnPickupTime = ?,
        SuitableVehicle = ?, ServiceTicketFlag = ?, CompanionName = ?, WheelchairFlag = ?,
        SpecialTransportFlag = ?, CancelDate = ?, CancelReason = ?, PaidFlag = ?, Remarks = ?,
        UpdatedAt = datetime('now','localtime')
       WHERE RequestId = ?`
    ).run(
      input.request.receivedDate,
      input.request.userId,
      input.request.requestedBy ?? null,
      input.request.transportDate,
      input.request.pickupTime ?? null,
      input.request.returnPickupTime ?? null,
      input.request.suitableVehicle ?? null,
      input.request.serviceTicketFlag ? 1 : 0,
      input.request.companionName ?? null,
      input.request.wheelchairFlag ? 1 : 0,
      input.request.specialTransportFlag ? 1 : 0,
      input.request.cancelDate ?? null,
      input.request.cancelReason ?? null,
      input.request.paidFlag ? 1 : 0,
      input.request.remarks ?? null,
      id
    )

    db.prepare('DELETE FROM T_RequestDestination WHERE RequestId = ?').run(id)
    insertDestinations(id, input.destinations)

    db.exec('COMMIT')
    return getRequestDetail(id) as TransportRequestDetail
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function deleteRequest(id: number): void {
  getDb().prepare('DELETE FROM T_TransportRequest WHERE RequestId = ?').run(id)
}

// 曜日別パターン(0=日〜6=土、それぞれ往路/復路の予定時刻を持つ)＋期間から該当日を列挙し、
// 共有のRecurringGroupIdを持つ個別の搬送依頼として展開する
// （冪等ではなく、呼び出すたびに新規グループを作る）
export function createRecurringRequests(input: RecurringRequestInput): TransportRequestDetail[] {
  if (input.dayPatterns.length === 0) throw new Error('曜日を1つ以上選択してください')
  const start = new Date(`${input.startDate}T00:00:00`)
  const end = new Date(`${input.endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new Error('定期搬送の期間が不正です')
  }

  const patternByWeekday = new Map(input.dayPatterns.map((p) => [p.weekday, p]))

  const occurrences: { transportDate: string; pickupTime: string | null; returnPickupTime: string | null }[] =
    []
  const cursor = new Date(start)
  while (cursor <= end) {
    const pattern = patternByWeekday.get(cursor.getDay())
    if (pattern) {
      const y = cursor.getFullYear()
      const m = String(cursor.getMonth() + 1).padStart(2, '0')
      const d = String(cursor.getDate()).padStart(2, '0')
      occurrences.push({
        transportDate: `${y}-${m}-${d}`,
        pickupTime: pattern.pickupTime,
        returnPickupTime: pattern.returnPickupTime
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  if (occurrences.length === 0) throw new Error('指定した期間・曜日に該当する日がありません')

  const db = getDb()
  db.exec('BEGIN')
  try {
    const requestIds: number[] = []
    for (const occurrence of occurrences) {
      const requestId = insertRequestHeader(
        {
          ...input.request,
          receivedDate: input.receivedDate,
          transportDate: occurrence.transportDate,
          pickupTime: occurrence.pickupTime,
          returnPickupTime: occurrence.returnPickupTime
        },
        true
      )
      insertDestinations(requestId, input.destinations)
      requestIds.push(requestId)
    }

    const groupId = requestIds[0]
    const placeholders = requestIds.map(() => '?').join(',')
    db.prepare(
      `UPDATE T_TransportRequest SET RecurringGroupId = ? WHERE RequestId IN (${placeholders})`
    ).run(groupId, ...requestIds)

    db.exec('COMMIT')
    return requestIds.map((id) => getRequestDetail(id) as TransportRequestDetail)
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

// 定期搬送グループに属する依頼をまとめて削除する。既に実績が入力されている日は
// (T_TransportResult.SourceRequestIdの外部キー制約により)削除できないためスキップする。
export function deleteRecurringGroup(groupId: number): { deleted: number; skipped: number } {
  const db = getDb()
  const rows = db
    .prepare('SELECT RequestId FROM T_TransportRequest WHERE RecurringGroupId = ?')
    .all(groupId) as unknown as { RequestId: number }[]

  let deleted = 0
  let skipped = 0
  for (const { RequestId } of rows) {
    const hasResult = db
      .prepare('SELECT 1 FROM T_TransportResult WHERE SourceRequestId = ? LIMIT 1')
      .get(RequestId)
    if (hasResult) {
      skipped++
      continue
    }
    db.prepare('DELETE FROM T_TransportRequest WHERE RequestId = ?').run(RequestId)
    deleted++
  }
  return { deleted, skipped }
}
