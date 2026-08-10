import { getDb } from '../connection'
import type { Destination, NewDestination } from '../../../shared/types/entities'

interface DestinationRow {
  DestinationId: number
  Name: string
  NameKana: string | null
  PostalCode: string | null
  Address: string | null
  PhoneNumber: string | null
  Remarks: string | null
  IsActive: number
  CreatedAt: string
  UpdatedAt: string
}

function mapRow(row: DestinationRow): Destination {
  return {
    destinationId: row.DestinationId,
    name: row.Name,
    nameKana: row.NameKana,
    postalCode: row.PostalCode,
    address: row.Address,
    phoneNumber: row.PhoneNumber,
    remarks: row.Remarks,
    isActive: row.IsActive === 1,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt
  }
}

export function listDestinations(opts?: {
  includeInactive?: boolean
  search?: string
}): Destination[] {
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
    .prepare(`SELECT * FROM M_Destination ${where} ORDER BY NameKana, Name`)
    .all(...params) as unknown as DestinationRow[]
  return rows.map(mapRow)
}

export function createDestination(input: NewDestination): Destination {
  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO M_Destination (Name, NameKana, PostalCode, Address, PhoneNumber, Remarks)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.nameKana ?? null,
      input.postalCode ?? null,
      input.address ?? null,
      input.phoneNumber ?? null,
      input.remarks ?? null
    )
  const row = db
    .prepare('SELECT * FROM M_Destination WHERE DestinationId = ?')
    .get(result.lastInsertRowid) as unknown as DestinationRow
  return mapRow(row)
}

export function updateDestination(id: number, input: Partial<NewDestination>): Destination {
  const db = getDb()
  const current = db
    .prepare('SELECT * FROM M_Destination WHERE DestinationId = ?')
    .get(id) as unknown as DestinationRow | undefined
  if (!current) throw new Error(`Destination ${id} not found`)

  const merged = {
    name: input.name ?? current.Name,
    nameKana: input.nameKana !== undefined ? input.nameKana : current.NameKana,
    postalCode: input.postalCode !== undefined ? input.postalCode : current.PostalCode,
    address: input.address !== undefined ? input.address : current.Address,
    phoneNumber: input.phoneNumber !== undefined ? input.phoneNumber : current.PhoneNumber,
    remarks: input.remarks !== undefined ? input.remarks : current.Remarks
  }

  db.prepare(
    `UPDATE M_Destination
     SET Name = ?, NameKana = ?, PostalCode = ?, Address = ?, PhoneNumber = ?, Remarks = ?,
         UpdatedAt = datetime('now','localtime')
     WHERE DestinationId = ?`
  ).run(
    merged.name,
    merged.nameKana,
    merged.postalCode,
    merged.address,
    merged.phoneNumber,
    merged.remarks,
    id
  )

  const row = db
    .prepare('SELECT * FROM M_Destination WHERE DestinationId = ?')
    .get(id) as unknown as DestinationRow
  return mapRow(row)
}

export function setDestinationActive(id: number, isActive: boolean): void {
  getDb()
    .prepare(
      `UPDATE M_Destination SET IsActive = ?, UpdatedAt = datetime('now','localtime') WHERE DestinationId = ?`
    )
    .run(isActive ? 1 : 0, id)
}
