import { getDb } from '../connection'
import { getCurrentOperator } from '../../operatorState'
import { readCsvFile } from '../../csv'
import type { ImportResult } from '../../../shared/types/entities'

// ヘッダ行の列名→インデックスの対応表を作る(カイポケ側の列順変更に強くするため、
// 固定インデックスではなくヘッダ名で参照する)
function headerIndex(header: string[]): (name: string) => number {
  const map = new Map(header.map((h, i) => [h.trim(), i]))
  return (name: string): number => {
    const idx = map.get(name)
    if (idx === undefined) throw new Error(`CSVにヘッダ「${name}」が見つかりません`)
    return idx
  }
}

function cell(row: string[], index: number): string {
  return (row[index] ?? '').trim()
}

function toNullable(s: string): string | null {
  return s === '' ? null : s
}

// "2024/01/05" 等をISO(YYYY-MM-DD)に正規化する。解釈できなければnull。
function parseDate(s: string): string | null {
  const trimmed = s.trim()
  if (!trimmed) return null
  const m = /^(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})日?$/.exec(trimmed)
  if (!m) return null
  const [, y, mo, d] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseSex(s: string): 1 | 2 | null {
  const trimmed = s.trim()
  if (trimmed === '男' || trimmed === '男性') return 1
  if (trimmed === '女' || trimmed === '女性') return 2
  return null
}

// "90%" "90" "0.9" のいずれでも受け付け、0〜1の小数(給付率)に正規化する
function parseBenefitRate(s: string): number | null {
  const trimmed = s.trim().replace(/%$/, '')
  if (!trimmed) return null
  const n = Number(trimmed)
  if (Number.isNaN(n)) return null
  return n > 1 ? n / 100 : n
}

function joinAddress(parts: (string | null)[]): string | null {
  const joined = parts.filter((p): p is string => !!p).join('')
  return joined || null
}

interface ExistingUserRow {
  UserId: number
  NameKana: string | null
}

// 利用者名(+カナ)で既存の有効な利用者を探す。同姓同名が複数いる場合はカナが一致するものを優先する。
function findExistingUserId(name: string, nameKana: string | null): number | null {
  const candidates = getDb()
    .prepare('SELECT UserId, NameKana FROM M_User WHERE Name = ? AND IsDeleted = 0')
    .all(name) as unknown as ExistingUserRow[]
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0].UserId
  const kanaMatch = candidates.find((c) => nameKana && c.NameKana === nameKana)
  return (kanaMatch ?? candidates[0]).UserId
}

// 「利用者情報.csv」(カイポケ形式)を読み込み、利用者名(+カナ)で既存の利用者マスタに
// 突き合わせて更新、見つからなければ新規作成する。
export function importUsersFromCsv(filePath: string): ImportResult {
  const rows = readCsvFile(filePath)
  if (rows.length === 0) throw new Error('CSVが空です')
  const [header, ...dataRows] = rows
  const col = headerIndex(header)

  const idx = {
    name: col('利用者名'),
    nameKana: col('利用者カナ'),
    birthDate: col('利用者生年月日'),
    sex: col('性別'),
    postalCode: col('郵便番号'),
    prefecture: col('都道府県'),
    city: col('市区町村'),
    town: col('町名以下'),
    building: col('建物名'),
    phone: col('利用者電話番号'),
    mobilePhone: col('利用者携帯電話番号'),
    status: col('利用者状態'),
    remarks: col('備考')
  }

  const db = getDb()
  const operator = getCurrentOperator()
  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  db.exec('BEGIN')
  try {
    dataRows.forEach((row, i) => {
      const rowNo = i + 2 // ヘッダ分+1オリジン
      const name = cell(row, idx.name)
      if (!name) {
        skipped++
        return
      }
      try {
        const nameKana = toNullable(cell(row, idx.nameKana))
        const values = {
          Name: name,
          NameKana: nameKana,
          Sex: parseSex(cell(row, idx.sex)),
          BirthDate: parseDate(cell(row, idx.birthDate)),
          PostalCode: toNullable(cell(row, idx.postalCode)),
          Address: joinAddress([
            toNullable(cell(row, idx.prefecture)),
            toNullable(cell(row, idx.city)),
            toNullable(cell(row, idx.town)),
            toNullable(cell(row, idx.building))
          ]),
          PhoneNumber: toNullable(cell(row, idx.phone)) ?? toNullable(cell(row, idx.mobilePhone)),
          TransactionStatus: toNullable(cell(row, idx.status)),
          Remarks: toNullable(cell(row, idx.remarks))
        }

        const existingId = findExistingUserId(name, nameKana)
        if (existingId !== null) {
          db.prepare(
            `UPDATE M_User SET
              NameKana = ?, Sex = ?, BirthDate = ?, PostalCode = ?, Address = ?, PhoneNumber = ?,
              TransactionStatus = ?, Remarks = ?, UpdatedAt = datetime('now','localtime'), UpdatedBy = ?
             WHERE UserId = ?`
          ).run(
            values.NameKana,
            values.Sex,
            values.BirthDate,
            values.PostalCode,
            values.Address,
            values.PhoneNumber,
            values.TransactionStatus,
            values.Remarks,
            operator,
            existingId
          )
          updated++
        } else {
          db.prepare(
            `INSERT INTO M_User
              (Name, NameKana, Sex, BirthDate, PostalCode, Address, PhoneNumber, TransactionStatus, Remarks, CreatedBy, UpdatedBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            values.Name,
            values.NameKana,
            values.Sex,
            values.BirthDate,
            values.PostalCode,
            values.Address,
            values.PhoneNumber,
            values.TransactionStatus,
            values.Remarks,
            operator,
            operator
          )
          created++
        }
      } catch (err) {
        errors.push(`${rowNo}行目(${name}): ${err instanceof Error ? err.message : String(err)}`)
      }
    })
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  return { created, updated, skipped, errors }
}

// 「被保険者証情報.csv」(カイポケ形式)を読み込み、利用者名(+カナ)で利用者マスタと
// 突き合わせて被保険者証を追加する(最新として登録し、既存の証はIsCurrent=0に落とす)。
// 対応する利用者が見つからない行はスキップしてエラー一覧に記録する(先に利用者情報.csvを
// インポートしておく必要がある)。
export function importCertificatesFromCsv(filePath: string): ImportResult {
  const rows = readCsvFile(filePath)
  if (rows.length === 0) throw new Error('CSVが空です')
  const [header, ...dataRows] = rows
  const col = headerIndex(header)

  const idx = {
    name: col('利用者名'),
    nameKana: col('利用者カナ'),
    certificationType: col('被保険者証認定区分'),
    insurerName: col('保険者名'),
    insurerNumber: col('保険者番号'),
    insuredNumber: col('被保険者番号'),
    careLevel: col('要介護度'),
    certificationDate: col('認定年月日'),
    validFrom: col('認定有効開始年月日'),
    validTo: col('認定有効終了年月日'),
    careSupportOffice: col('担当居宅支援事業所'),
    careManager: col('担当ケアマネ'),
    communityCareCenter: col('担当地域包括支援センター'),
    planRequestNotifiedDate: col('計画作成依頼届出年月日'),
    benefitRate: col('給付率')
  }

  const db = getDb()
  const operator = getCurrentOperator()
  let created = 0
  const skipped = 0
  const errors: string[] = []

  db.exec('BEGIN')
  try {
    dataRows.forEach((row, i) => {
      const rowNo = i + 2
      const name = cell(row, idx.name)
      if (!name) return

      const nameKana = toNullable(cell(row, idx.nameKana))
      const userId = findExistingUserId(name, nameKana)
      if (userId === null) {
        errors.push(`${rowNo}行目(${name}): 対応する利用者が見つかりません(先に利用者情報.csvを取り込んでください)`)
        return
      }

      try {
        db.prepare('UPDATE T_UserInsuranceCertificate SET IsCurrent = 0 WHERE UserId = ?').run(userId)
        db.prepare(
          `INSERT INTO T_UserInsuranceCertificate (
            UserId, CertificationType, InsurerName, InsurerNumber, InsuredNumber, CareLevel,
            CertificationDate, ValidFrom, ValidTo, CareSupportOffice, CareManager,
            CommunityCareCenter, PlanRequestNotifiedDate, BenefitRate, IsCurrent, CreatedBy, UpdatedBy
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        ).run(
          userId,
          toNullable(cell(row, idx.certificationType)),
          toNullable(cell(row, idx.insurerName)),
          toNullable(cell(row, idx.insurerNumber)),
          toNullable(cell(row, idx.insuredNumber)),
          toNullable(cell(row, idx.careLevel)),
          parseDate(cell(row, idx.certificationDate)),
          parseDate(cell(row, idx.validFrom)),
          parseDate(cell(row, idx.validTo)),
          toNullable(cell(row, idx.careSupportOffice)),
          toNullable(cell(row, idx.careManager)),
          toNullable(cell(row, idx.communityCareCenter)),
          parseDate(cell(row, idx.planRequestNotifiedDate)),
          parseBenefitRate(cell(row, idx.benefitRate)),
          operator,
          operator
        )
        created++
      } catch (err) {
        errors.push(`${rowNo}行目(${name}): ${err instanceof Error ? err.message : String(err)}`)
      }
    })
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  return { created, updated: 0, skipped, errors }
}
