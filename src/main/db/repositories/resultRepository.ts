import { getDb } from '../connection'
import type {
  NewResultDestination,
  NewTransportResultInput,
  RequestResultStatusItem,
  ResultDestinationDetail,
  ResultLeg,
  ResultStatus,
  TransportResult,
  TransportResultDetail
} from '../../../shared/types/entities'
import { getRequestDetail } from './requestRepository'

interface ResultRow {
  ResultId: number
  TransportDate: string
  UserId: number
  SourceRequestId: number | null
  KokuhorenClaimFlag: number
  SnapshotCareLevel: string | null
  SnapshotBenefitRate: number | null
  Remarks: string | null
  CreatedAt: string
  UpdatedAt: string
}

interface ResultDestinationRow {
  ResultDestinationId: number
  ResultId: number
  SeqNo: number
  DestinationId: number
  DepartmentId: number | null
  TsuuinKaigoKihonFlag: number
  PhysicalCareFlag: number
  InHospitalCareFlag: number
  AdvancedExpense: number | null
  HospitalStaffName: string | null
  CalculatedFee: number | null
}

interface ResultLegRow {
  ResultLegId: number
  ResultDestinationId: number
  LegType: number
  DepartureLocation: string | null
  DepartureTime: string | null
  ArrivalLocation: string | null
  ArrivalTime: string | null
  TransferTime: string | null
  VehicleNo: string | null
  DriverId: number | null
  DistanceKm: number | null
}

function mapResultRow(row: ResultRow): TransportResult {
  return {
    resultId: row.ResultId,
    transportDate: row.TransportDate,
    userId: row.UserId,
    sourceRequestId: row.SourceRequestId,
    kokuhorenClaimFlag: row.KokuhorenClaimFlag === 1,
    snapshotCareLevel: row.SnapshotCareLevel,
    snapshotBenefitRate: row.SnapshotBenefitRate,
    remarks: row.Remarks,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt
  }
}

function mapLegRow(row: ResultLegRow): ResultLeg {
  return {
    resultLegId: row.ResultLegId,
    resultDestinationId: row.ResultDestinationId,
    legType: row.LegType === 2 ? 2 : 1,
    departureLocation: row.DepartureLocation,
    departureTime: row.DepartureTime,
    arrivalLocation: row.ArrivalLocation,
    arrivalTime: row.ArrivalTime,
    transferTime: row.TransferTime,
    vehicleNo: row.VehicleNo,
    driverId: row.DriverId,
    distanceKm: row.DistanceKm
  }
}

function mapDestinationRow(row: ResultDestinationRow): Omit<ResultDestinationDetail, 'legs'> {
  return {
    resultDestinationId: row.ResultDestinationId,
    resultId: row.ResultId,
    seqNo: row.SeqNo,
    destinationId: row.DestinationId,
    departmentId: row.DepartmentId,
    tsuuinKaigoKihonFlag: row.TsuuinKaigoKihonFlag === 1,
    physicalCareFlag: row.PhysicalCareFlag === 1,
    inHospitalCareFlag: row.InHospitalCareFlag === 1,
    advancedExpense: row.AdvancedExpense,
    hospitalStaffName: row.HospitalStaffName,
    calculatedFee: row.CalculatedFee
  }
}

export function getResultDetail(resultId: number): TransportResultDetail | null {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM T_TransportResult WHERE ResultId = ?')
    .get(resultId) as unknown as ResultRow | undefined
  if (!row) return null

  const destRows = db
    .prepare('SELECT * FROM T_ResultDestination WHERE ResultId = ? ORDER BY SeqNo')
    .all(resultId) as unknown as ResultDestinationRow[]

  const destinations: ResultDestinationDetail[] = destRows.map((destRow) => {
    const legRows = db
      .prepare('SELECT * FROM T_ResultLeg WHERE ResultDestinationId = ? ORDER BY LegType')
      .all(destRow.ResultDestinationId) as unknown as ResultLegRow[]
    return { ...mapDestinationRow(destRow), legs: legRows.map(mapLegRow) }
  })

  return { result: mapResultRow(row), destinations }
}

function getResultIdByRequestId(requestId: number): number | null {
  const row = getDb()
    .prepare('SELECT ResultId FROM T_TransportResult WHERE SourceRequestId = ?')
    .get(requestId) as unknown as { ResultId: number } | undefined
  return row ? row.ResultId : null
}

// 依頼一覧に対して実績の入力状況(未入力/入力中/完了)を付与する。
// 「完了」は、各搬送先に往路(出発・到着時刻とも記入済み)が揃っていることを基準とする。
export function listRequestResultStatus(date: string): RequestResultStatusItem[] {
  const db = getDb()
  const requestRows = db
    .prepare(
      `SELECT req.*, u.Name AS UserName,
        (SELECT GROUP_CONCAT(d.Name, '、')
           FROM T_RequestDestination rd
           JOIN M_Destination d ON d.DestinationId = rd.DestinationId
          WHERE rd.RequestId = req.RequestId
          ORDER BY rd.SeqNo) AS DestinationNames
       FROM T_TransportRequest req
       JOIN M_User u ON u.UserId = req.UserId
       WHERE req.TransportDate = ?
       ORDER BY req.PickupTime`
    )
    .all(date) as unknown as (Record<string, unknown> & {
    RequestId: number
    UserName: string
    DestinationNames: string | null
  })[]

  return requestRows.map((row) => {
    const resultId = getResultIdByRequestId(row.RequestId)
    let status: ResultStatus = 'none'
    if (resultId !== null) {
      const destCount = db
        .prepare('SELECT COUNT(*) AS c FROM T_ResultDestination WHERE ResultId = ?')
        .get(resultId) as unknown as { c: number }
      const filledCount = db
        .prepare(
          `SELECT COUNT(*) AS c FROM T_ResultDestination rd
           JOIN T_ResultLeg rl ON rl.ResultDestinationId = rd.ResultDestinationId AND rl.LegType = 1
           WHERE rd.ResultId = ? AND rl.DepartureTime IS NOT NULL AND rl.ArrivalTime IS NOT NULL`
        )
        .get(resultId) as unknown as { c: number }
      status = destCount.c > 0 && filledCount.c >= destCount.c ? 'done' : 'in_progress'
    }

    return {
      request: {
        requestId: row.RequestId,
        receivedDate: row.ReceivedDate as string,
        isRecurring: row.IsRecurring === 1,
        recurringGroupId: row.RecurringGroupId as number | null,
        userId: row.UserId as number,
        requestedBy: row.RequestedBy as string | null,
        transportDate: row.TransportDate as string,
        pickupTime: row.PickupTime as string | null,
        suitableVehicle: row.SuitableVehicle as string | null,
        serviceTicketFlag: row.ServiceTicketFlag === 1,
        companionName: row.CompanionName as string | null,
        wheelchairFlag: row.WheelchairFlag === 1,
        specialTransportFlag: row.SpecialTransportFlag === 1,
        cancelDate: row.CancelDate as string | null,
        cancelReason: row.CancelReason as string | null,
        paidFlag: row.PaidFlag === 1,
        remarks: row.Remarks as string | null,
        createdAt: row.CreatedAt as string,
        updatedAt: row.UpdatedAt as string,
        userName: row.UserName,
        destinationNames: row.DestinationNames ? row.DestinationNames.split('、') : []
      },
      resultId,
      status
    }
  })
}

function insertDestinationsAndLegs(
  resultId: number,
  destinations: NewResultDestination[]
): void {
  const db = getDb()
  const destStmt = db.prepare(
    `INSERT INTO T_ResultDestination
      (ResultId, SeqNo, DestinationId, DepartmentId, TsuuinKaigoKihonFlag, PhysicalCareFlag, InHospitalCareFlag, AdvancedExpense, HospitalStaffName, CalculatedFee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const legStmt = db.prepare(
    `INSERT INTO T_ResultLeg
      (ResultDestinationId, LegType, DepartureLocation, DepartureTime, ArrivalLocation, ArrivalTime, TransferTime, VehicleNo, DriverId, DistanceKm)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  destinations.forEach((dest, index) => {
    const result = destStmt.run(
      resultId,
      index + 1,
      dest.destinationId,
      dest.departmentId ?? null,
      dest.tsuuinKaigoKihonFlag ? 1 : 0,
      dest.physicalCareFlag ? 1 : 0,
      dest.inHospitalCareFlag ? 1 : 0,
      dest.advancedExpense ?? null,
      dest.hospitalStaffName ?? null,
      dest.calculatedFee ?? null
    )
    const resultDestinationId = Number(result.lastInsertRowid)
    for (const leg of dest.legs) {
      legStmt.run(
        resultDestinationId,
        leg.legType,
        leg.departureLocation ?? null,
        leg.departureTime ?? null,
        leg.arrivalLocation ?? null,
        leg.arrivalTime ?? null,
        leg.transferTime ?? null,
        leg.vehicleNo ?? null,
        leg.driverId ?? null,
        leg.distanceKm ?? null
      )
    }
  })
}

// 搬送依頼から実績の下書きを1件作成する(既に下書きがあれば何もしない)
export function createDraftForRequest(requestId: number): number | null {
  const db = getDb()
  const existing = getResultIdByRequestId(requestId)
  if (existing !== null) return existing

  const detail = getRequestDetail(requestId)
  if (!detail) throw new Error(`搬送依頼 ${requestId} が見つかりません`)
  const { request, destinations } = detail
  if (destinations.length === 0) return null

  const cert = db
    .prepare(
      'SELECT CareLevel, BenefitRate FROM T_UserInsuranceCertificate WHERE UserId = ? AND IsCurrent = 1 LIMIT 1'
    )
    .get(request.userId) as unknown as { CareLevel: string | null; BenefitRate: number | null } | undefined

  db.exec('BEGIN')
  try {
    const insertResult = db
      .prepare(
        `INSERT INTO T_TransportResult
          (TransportDate, UserId, SourceRequestId, SnapshotCareLevel, SnapshotBenefitRate)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        request.transportDate,
        request.userId,
        request.requestId,
        cert?.CareLevel ?? null,
        cert?.BenefitRate ?? null
      )
    const resultId = Number(insertResult.lastInsertRowid)

    const newDestinations: NewResultDestination[] = destinations.map((d) => ({
      destinationId: d.destinationId,
      departmentId: d.departmentId,
      tsuuinKaigoKihonFlag: false,
      physicalCareFlag: false,
      inHospitalCareFlag: false,
      advancedExpense: null,
      hospitalStaffName: null,
      calculatedFee: null,
      legs: d.roundTripFlag
        ? [{ ...emptyLeg(1) }, { ...emptyLeg(2) }]
        : [{ ...emptyLeg(1) }]
    }))
    insertDestinationsAndLegs(resultId, newDestinations)

    db.exec('COMMIT')
    return resultId
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

function emptyLeg(legType: 1 | 2): NewResultDestination['legs'][number] {
  return {
    legType,
    departureLocation: null,
    departureTime: null,
    arrivalLocation: null,
    arrivalTime: null,
    transferTime: null,
    vehicleNo: null,
    driverId: null,
    distanceKm: null
  }
}

// 指定日の依頼のうち、キャンセル済みでなく実績未作成のものをまとめて下書き生成する
export function createDraftsForDate(date: string): { created: number; skipped: number } {
  const db = getDb()
  const requestIds = db
    .prepare(
      `SELECT RequestId FROM T_TransportRequest WHERE TransportDate = ? AND CancelDate IS NULL`
    )
    .all(date) as unknown as { RequestId: number }[]

  let created = 0
  let skipped = 0
  for (const { RequestId } of requestIds) {
    const existing = getResultIdByRequestId(RequestId)
    if (existing !== null) {
      skipped++
      continue
    }
    createDraftForRequest(RequestId)
    created++
  }
  return { created, skipped }
}

export function updateResult(
  resultId: number,
  input: NewTransportResultInput
): TransportResultDetail {
  const db = getDb()
  const current = db
    .prepare('SELECT * FROM T_TransportResult WHERE ResultId = ?')
    .get(resultId) as unknown as ResultRow | undefined
  if (!current) throw new Error(`搬送実績 ${resultId} が見つかりません`)

  db.exec('BEGIN')
  try {
    db.prepare(
      `UPDATE T_TransportResult SET
        KokuhorenClaimFlag = ?, SnapshotCareLevel = ?, SnapshotBenefitRate = ?, Remarks = ?,
        UpdatedAt = datetime('now','localtime')
       WHERE ResultId = ?`
    ).run(
      input.result.kokuhorenClaimFlag ? 1 : 0,
      input.result.snapshotCareLevel ?? null,
      input.result.snapshotBenefitRate ?? null,
      input.result.remarks ?? null,
      resultId
    )

    db.prepare('DELETE FROM T_ResultDestination WHERE ResultId = ?').run(resultId)
    insertDestinationsAndLegs(resultId, input.destinations)

    db.exec('COMMIT')
    return getResultDetail(resultId) as TransportResultDetail
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function deleteResult(resultId: number): void {
  getDb().prepare('DELETE FROM T_TransportResult WHERE ResultId = ?').run(resultId)
}
