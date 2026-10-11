import { getDb } from '../connection'
import { getCurrentOperator } from '../../operatorState'
import type {
  NewUser,
  NewUserInsuranceCertificate,
  User,
  UserInsuranceCertificate
} from '../../../shared/types/entities'

interface UserRow {
  UserId: number
  Name: string
  NameKana: string | null
  Sex: number | null
  BirthDate: string | null
  PostalCode: string | null
  Address: string | null
  PhoneNumber: string | null
  TransactionStatus: string | null
  LivelihoodProtectionFlag: number
  SpecialTransportCategory: string | null
  WheelchairFlag: number
  CareManager: string | null
  ContractDate: string | null
  IsContractor: number
  KaisouFeeFlag: number
  Remarks: string | null
  IsDeleted: number
  CreatedAt: string
  UpdatedAt: string
}

function mapUserRow(row: UserRow): User {
  return {
    userId: row.UserId,
    name: row.Name,
    nameKana: row.NameKana,
    sex: row.Sex === 1 || row.Sex === 2 ? row.Sex : null,
    birthDate: row.BirthDate,
    postalCode: row.PostalCode,
    address: row.Address,
    phoneNumber: row.PhoneNumber,
    transactionStatus: row.TransactionStatus,
    livelihoodProtectionFlag: row.LivelihoodProtectionFlag === 1,
    specialTransportCategory: row.SpecialTransportCategory,
    wheelchairFlag: row.WheelchairFlag === 1,
    careManager: row.CareManager,
    contractDate: row.ContractDate,
    isContractor: row.IsContractor === 1,
    kaisouFeeFlag: row.KaisouFeeFlag === 1,
    remarks: row.Remarks,
    isDeleted: row.IsDeleted === 1,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt
  }
}

export function listUsers(opts?: { includeDeleted?: boolean; search?: string }): User[] {
  const db = getDb()
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (!opts?.includeDeleted) conditions.push('IsDeleted = 0')
  if (opts?.search) {
    conditions.push('(Name LIKE ? OR NameKana LIKE ?)')
    params.push(`%${opts.search}%`, `%${opts.search}%`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db
    .prepare(`SELECT * FROM M_User ${where} ORDER BY NameKana, Name`)
    .all(...params) as unknown as UserRow[]
  return rows.map(mapUserRow)
}

export function getUser(id: number): User | null {
  const row = getDb()
    .prepare('SELECT * FROM M_User WHERE UserId = ?')
    .get(id) as unknown as UserRow | undefined
  return row ? mapUserRow(row) : null
}

export function createUser(input: NewUser): User {
  const db = getDb()
  const operator = getCurrentOperator()
  const result = db
    .prepare(
      `INSERT INTO M_User (
        Name, NameKana, Sex, BirthDate, PostalCode, Address, PhoneNumber,
        TransactionStatus, LivelihoodProtectionFlag, SpecialTransportCategory,
        WheelchairFlag, CareManager, ContractDate, IsContractor, KaisouFeeFlag, Remarks, CreatedBy, UpdatedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.nameKana ?? null,
      input.sex ?? null,
      input.birthDate ?? null,
      input.postalCode ?? null,
      input.address ?? null,
      input.phoneNumber ?? null,
      input.transactionStatus ?? null,
      input.livelihoodProtectionFlag ? 1 : 0,
      input.specialTransportCategory ?? null,
      input.wheelchairFlag ? 1 : 0,
      input.careManager ?? null,
      input.contractDate ?? null,
      input.isContractor ? 1 : 0,
      input.kaisouFeeFlag ? 1 : 0,
      input.remarks ?? null,
      operator,
      operator
    )
  return mapUserRow(
    db.prepare('SELECT * FROM M_User WHERE UserId = ?').get(result.lastInsertRowid) as unknown as UserRow
  )
}

export function updateUser(id: number, input: Partial<NewUser>): User {
  const db = getDb()
  const current = db.prepare('SELECT * FROM M_User WHERE UserId = ?').get(id) as unknown as
    | UserRow
    | undefined
  if (!current) throw new Error(`User ${id} not found`)

  const m = {
    name: input.name ?? current.Name,
    nameKana: input.nameKana !== undefined ? input.nameKana : current.NameKana,
    sex: input.sex !== undefined ? input.sex : current.Sex,
    birthDate: input.birthDate !== undefined ? input.birthDate : current.BirthDate,
    postalCode: input.postalCode !== undefined ? input.postalCode : current.PostalCode,
    address: input.address !== undefined ? input.address : current.Address,
    phoneNumber: input.phoneNumber !== undefined ? input.phoneNumber : current.PhoneNumber,
    transactionStatus:
      input.transactionStatus !== undefined ? input.transactionStatus : current.TransactionStatus,
    livelihoodProtectionFlag:
      input.livelihoodProtectionFlag !== undefined
        ? input.livelihoodProtectionFlag
          ? 1
          : 0
        : current.LivelihoodProtectionFlag,
    specialTransportCategory:
      input.specialTransportCategory !== undefined
        ? input.specialTransportCategory
        : current.SpecialTransportCategory,
    wheelchairFlag:
      input.wheelchairFlag !== undefined
        ? input.wheelchairFlag
          ? 1
          : 0
        : current.WheelchairFlag,
    careManager: input.careManager !== undefined ? input.careManager : current.CareManager,
    contractDate: input.contractDate !== undefined ? input.contractDate : current.ContractDate,
    isContractor:
      input.isContractor !== undefined ? (input.isContractor ? 1 : 0) : current.IsContractor,
    kaisouFeeFlag:
      input.kaisouFeeFlag !== undefined ? (input.kaisouFeeFlag ? 1 : 0) : current.KaisouFeeFlag,
    remarks: input.remarks !== undefined ? input.remarks : current.Remarks
  }

  db.prepare(
    `UPDATE M_User SET
      Name = ?, NameKana = ?, Sex = ?, BirthDate = ?, PostalCode = ?, Address = ?, PhoneNumber = ?,
      TransactionStatus = ?, LivelihoodProtectionFlag = ?, SpecialTransportCategory = ?,
      WheelchairFlag = ?, CareManager = ?, ContractDate = ?, IsContractor = ?, KaisouFeeFlag = ?, Remarks = ?,
      UpdatedAt = datetime('now','localtime'), UpdatedBy = ?
     WHERE UserId = ?`
  ).run(
    m.name,
    m.nameKana,
    m.sex,
    m.birthDate,
    m.postalCode,
    m.address,
    m.phoneNumber,
    m.transactionStatus,
    m.livelihoodProtectionFlag,
    m.specialTransportCategory,
    m.wheelchairFlag,
    m.careManager,
    m.contractDate,
    m.isContractor,
    m.kaisouFeeFlag,
    m.remarks,
    getCurrentOperator(),
    id
  )

  return mapUserRow(
    db.prepare('SELECT * FROM M_User WHERE UserId = ?').get(id) as unknown as UserRow
  )
}

// 物理削除はしない（過去の依頼・実績から参照され続けるため論理削除に留める）
export function softDeleteUser(id: number): void {
  getDb()
    .prepare(
      `UPDATE M_User SET IsDeleted = 1, UpdatedAt = datetime('now','localtime'), UpdatedBy = ? WHERE UserId = ?`
    )
    .run(getCurrentOperator(), id)
}

interface CertificateRow {
  CertificateId: number
  UserId: number
  CertificationType: string | null
  InsurerName: string | null
  InsurerNumber: string | null
  InsuredNumber: string | null
  CareLevel: string | null
  CertificationDate: string | null
  ValidFrom: string | null
  ValidTo: string | null
  CareSupportOffice: string | null
  CareManager: string | null
  CommunityCareCenter: string | null
  PlanRequestNotifiedDate: string | null
  BenefitRate: number | null
  IsCurrent: number
  CreatedAt: string
  UpdatedAt: string
}

function mapCertificateRow(row: CertificateRow): UserInsuranceCertificate {
  return {
    certificateId: row.CertificateId,
    userId: row.UserId,
    certificationType: row.CertificationType,
    insurerName: row.InsurerName,
    insurerNumber: row.InsurerNumber,
    insuredNumber: row.InsuredNumber,
    careLevel: row.CareLevel,
    certificationDate: row.CertificationDate,
    validFrom: row.ValidFrom,
    validTo: row.ValidTo,
    careSupportOffice: row.CareSupportOffice,
    careManager: row.CareManager,
    communityCareCenter: row.CommunityCareCenter,
    planRequestNotifiedDate: row.PlanRequestNotifiedDate,
    benefitRate: row.BenefitRate,
    isCurrent: row.IsCurrent === 1,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt
  }
}

export function listUserCertificates(userId: number): UserInsuranceCertificate[] {
  const rows = getDb()
    .prepare('SELECT * FROM T_UserInsuranceCertificate WHERE UserId = ? ORDER BY ValidFrom DESC')
    .all(userId) as unknown as CertificateRow[]
  return rows.map(mapCertificateRow)
}

// 新しい証を「最新」として追加し、それ以外は IsCurrent=0 に落とす
export function addUserCertificate(
  input: NewUserInsuranceCertificate
): UserInsuranceCertificate {
  const db = getDb()

  db.prepare('BEGIN').run()
  try {
    db.prepare('UPDATE T_UserInsuranceCertificate SET IsCurrent = 0 WHERE UserId = ?').run(
      input.userId
    )

    const operator = getCurrentOperator()
    const result = db
      .prepare(
        `INSERT INTO T_UserInsuranceCertificate (
          UserId, CertificationType, InsurerName, InsurerNumber, InsuredNumber, CareLevel,
          CertificationDate, ValidFrom, ValidTo, CareSupportOffice, CareManager,
          CommunityCareCenter, PlanRequestNotifiedDate, BenefitRate, IsCurrent, CreatedBy, UpdatedBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        input.userId,
        input.certificationType ?? null,
        input.insurerName ?? null,
        input.insurerNumber ?? null,
        input.insuredNumber ?? null,
        input.careLevel ?? null,
        input.certificationDate ?? null,
        input.validFrom ?? null,
        input.validTo ?? null,
        input.careSupportOffice ?? null,
        input.careManager ?? null,
        input.communityCareCenter ?? null,
        input.planRequestNotifiedDate ?? null,
        input.benefitRate ?? null,
        operator,
        operator
      )

    db.prepare('COMMIT').run()

    return mapCertificateRow(
      db
        .prepare('SELECT * FROM T_UserInsuranceCertificate WHERE CertificateId = ?')
        .get(result.lastInsertRowid) as unknown as CertificateRow
    )
  } catch (err) {
    db.prepare('ROLLBACK').run()
    throw err
  }
}
