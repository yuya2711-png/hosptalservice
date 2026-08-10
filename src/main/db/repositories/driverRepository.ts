import { getDb } from '../connection'
import type { Driver, NewDriver } from '../../../shared/types/entities'

interface DriverRow {
  DriverId: number
  Name: string
  NameKana: string | null
  PhoneNumber: string | null
  Remarks: string | null
  IsActive: number
  CreatedAt: string
  UpdatedAt: string
}

function mapRow(row: DriverRow): Driver {
  return {
    driverId: row.DriverId,
    name: row.Name,
    nameKana: row.NameKana,
    phoneNumber: row.PhoneNumber,
    remarks: row.Remarks,
    isActive: row.IsActive === 1,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt
  }
}

export function listDrivers(opts?: { includeInactive?: boolean; search?: string }): Driver[] {
  const db = getDb()
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (!opts?.includeInactive) conditions.push('IsActive = 1')
  if (opts?.search) {
    conditions.push('(Name LIKE ? OR NameKana LIKE ?)')
    params.push(`%${opts.search}%`, `%${opts.search}%`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db
    .prepare(`SELECT * FROM M_Driver ${where} ORDER BY NameKana, Name`)
    .all(...params) as unknown as DriverRow[]
  return rows.map(mapRow)
}

export function createDriver(input: NewDriver): Driver {
  const db = getDb()
  const result = db
    .prepare('INSERT INTO M_Driver (Name, NameKana, PhoneNumber, Remarks) VALUES (?, ?, ?, ?)')
    .run(input.name, input.nameKana ?? null, input.phoneNumber ?? null, input.remarks ?? null)
  const row = db
    .prepare('SELECT * FROM M_Driver WHERE DriverId = ?')
    .get(result.lastInsertRowid) as unknown as DriverRow
  return mapRow(row)
}

export function updateDriver(id: number, input: Partial<NewDriver>): Driver {
  const db = getDb()
  const current = db
    .prepare('SELECT * FROM M_Driver WHERE DriverId = ?')
    .get(id) as unknown as DriverRow | undefined
  if (!current) throw new Error(`Driver ${id} not found`)

  const merged = {
    name: input.name ?? current.Name,
    nameKana: input.nameKana !== undefined ? input.nameKana : current.NameKana,
    phoneNumber: input.phoneNumber !== undefined ? input.phoneNumber : current.PhoneNumber,
    remarks: input.remarks !== undefined ? input.remarks : current.Remarks
  }

  db.prepare(
    `UPDATE M_Driver SET Name = ?, NameKana = ?, PhoneNumber = ?, Remarks = ?,
     UpdatedAt = datetime('now','localtime') WHERE DriverId = ?`
  ).run(merged.name, merged.nameKana, merged.phoneNumber, merged.remarks, id)

  const row = db
    .prepare('SELECT * FROM M_Driver WHERE DriverId = ?')
    .get(id) as unknown as DriverRow
  return mapRow(row)
}

export function setDriverActive(id: number, isActive: boolean): void {
  getDb()
    .prepare(
      `UPDATE M_Driver SET IsActive = ?, UpdatedAt = datetime('now','localtime') WHERE DriverId = ?`
    )
    .run(isActive ? 1 : 0, id)
}
