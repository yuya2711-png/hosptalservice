import { getDb } from '../connection'
import type { NewSpecialTransportRate, SpecialTransportRate } from '../../../shared/types/entities'

interface RateRow {
  RateId: number
  Category: string
  EffectiveFrom: string
  Amount: number
  Remarks: string | null
  CreatedAt: string
  UpdatedAt: string
}

function mapRateRow(row: RateRow): SpecialTransportRate {
  return {
    rateId: row.RateId,
    category: row.Category,
    effectiveFrom: row.EffectiveFrom,
    amount: row.Amount,
    remarks: row.Remarks,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt
  }
}

export function listRates(): SpecialTransportRate[] {
  const rows = getDb()
    .prepare('SELECT * FROM M_SpecialTransportRate ORDER BY Category, EffectiveFrom DESC')
    .all() as unknown as RateRow[]
  return rows.map(mapRateRow)
}

export function getRate(rateId: number): SpecialTransportRate | null {
  const row = getDb()
    .prepare('SELECT * FROM M_SpecialTransportRate WHERE RateId = ?')
    .get(rateId) as unknown as RateRow | undefined
  return row ? mapRateRow(row) : null
}

export function createRate(input: NewSpecialTransportRate): SpecialTransportRate {
  const db = getDb()
  const result = db
    .prepare(
      `INSERT INTO M_SpecialTransportRate (Category, EffectiveFrom, Amount, Remarks)
       VALUES (?, ?, ?, ?)`
    )
    .run(input.category, input.effectiveFrom, input.amount, input.remarks ?? null)
  return getRate(Number(result.lastInsertRowid)) as SpecialTransportRate
}

export function updateRate(rateId: number, input: NewSpecialTransportRate): SpecialTransportRate {
  const db = getDb()
  const current = db.prepare('SELECT * FROM M_SpecialTransportRate WHERE RateId = ?').get(rateId)
  if (!current) throw new Error(`特別搬送料金 ${rateId} が見つかりません`)

  db.prepare(
    `UPDATE M_SpecialTransportRate SET
      Category = ?, EffectiveFrom = ?, Amount = ?, Remarks = ?, UpdatedAt = datetime('now','localtime')
     WHERE RateId = ?`
  ).run(input.category, input.effectiveFrom, input.amount, input.remarks ?? null, rateId)

  return getRate(rateId) as SpecialTransportRate
}

export function deleteRate(rateId: number): void {
  getDb().prepare('DELETE FROM M_SpecialTransportRate WHERE RateId = ?').run(rateId)
}

// 指定区分・日付に適用される料金(EffectiveFromが対象日以前で最も新しいもの)を返す。該当なしはnull。
export function findRateForCategory(category: string, date: string): number | null {
  const row = getDb()
    .prepare(
      `SELECT Amount FROM M_SpecialTransportRate
       WHERE Category = ? AND EffectiveFrom <= ?
       ORDER BY EffectiveFrom DESC LIMIT 1`
    )
    .get(category, date) as unknown as { Amount: number } | undefined
  return row ? row.Amount : null
}
