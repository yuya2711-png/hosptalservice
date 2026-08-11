import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDataDir } from './db/connection'

// 「今このアプリを操作している職員名」をプロセス内に保持し、CreatedBy/UpdatedByの記入に使う。
// ログイン機能は持たず、起動時・切り替え時に手入力した名前をファイルに保存して次回起動時も引き継ぐだけの簡易な仕組み。
function getSettingsPath(): string {
  return join(getDataDir(), 'operator.json')
}

let currentOperator: string | null = null
let loaded = false

function load(): void {
  if (loaded) return
  loaded = true
  try {
    const raw = readFileSync(getSettingsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as { operator?: string }
    currentOperator = parsed.operator?.trim() || null
  } catch {
    currentOperator = null
  }
}

export function getCurrentOperator(): string | null {
  load()
  return currentOperator
}

export function setCurrentOperator(name: string | null): void {
  const trimmed = name?.trim() || null
  currentOperator = trimmed
  loaded = true
  mkdirSync(getDataDir(), { recursive: true })
  writeFileSync(getSettingsPath(), JSON.stringify({ operator: trimmed }), 'utf-8')
}
