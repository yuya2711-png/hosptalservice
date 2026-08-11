import { getDb } from '../connection'
import { getCurrentOperator } from '../../operatorState'
import type { Department, NewDepartment } from '../../../shared/types/entities'

interface DepartmentRow {
  DepartmentId: number
  Name: string
  SortOrder: number | null
  IsActive: number
  CreatedAt: string
  UpdatedAt: string
}

function mapRow(row: DepartmentRow): Department {
  return {
    departmentId: row.DepartmentId,
    name: row.Name,
    sortOrder: row.SortOrder,
    isActive: row.IsActive === 1,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt
  }
}

export function listDepartments(opts?: { includeInactive?: boolean }): Department[] {
  const db = getDb()
  const sql = opts?.includeInactive
    ? 'SELECT * FROM M_Department ORDER BY SortOrder IS NULL, SortOrder, Name'
    : 'SELECT * FROM M_Department WHERE IsActive = 1 ORDER BY SortOrder IS NULL, SortOrder, Name'
  const rows = db.prepare(sql).all() as unknown as DepartmentRow[]
  return rows.map(mapRow)
}

export function createDepartment(input: NewDepartment): Department {
  const db = getDb()
  const operator = getCurrentOperator()
  const result = db
    .prepare('INSERT INTO M_Department (Name, SortOrder, CreatedBy, UpdatedBy) VALUES (?, ?, ?, ?)')
    .run(input.name, input.sortOrder ?? null, operator, operator)
  const row = db
    .prepare('SELECT * FROM M_Department WHERE DepartmentId = ?')
    .get(result.lastInsertRowid) as unknown as DepartmentRow
  return mapRow(row)
}

export function updateDepartment(id: number, input: Partial<NewDepartment>): Department {
  const db = getDb()
  const current = db
    .prepare('SELECT * FROM M_Department WHERE DepartmentId = ?')
    .get(id) as unknown as DepartmentRow | undefined
  if (!current) throw new Error(`Department ${id} not found`)

  const name = input.name ?? current.Name
  const sortOrder = input.sortOrder !== undefined ? input.sortOrder : current.SortOrder

  db.prepare(
    `UPDATE M_Department SET Name = ?, SortOrder = ?, UpdatedAt = datetime('now','localtime'), UpdatedBy = ? WHERE DepartmentId = ?`
  ).run(name, sortOrder, getCurrentOperator(), id)

  const row = db
    .prepare('SELECT * FROM M_Department WHERE DepartmentId = ?')
    .get(id) as unknown as DepartmentRow
  return mapRow(row)
}

export function setDepartmentActive(id: number, isActive: boolean): void {
  getDb()
    .prepare(
      `UPDATE M_Department SET IsActive = ?, UpdatedAt = datetime('now','localtime'), UpdatedBy = ? WHERE DepartmentId = ?`
    )
    .run(isActive ? 1 : 0, getCurrentOperator(), id)
}
