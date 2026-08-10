import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { getBackupDir, getDb, getDbPath } from './connection'

const MAX_GENERATIONS = 30

function todayStamp(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

// 1日1回、日付入りのファイルコピーとしてバックアップを作る。
// アクティブなトランザクション中に呼ばないこと（呼び出し元は起動時などの安全なタイミングに限定する）。
export function backupDatabaseIfNeeded(): { created: boolean; path: string } {
  const backupDir = getBackupDir()
  mkdirSync(backupDir, { recursive: true })

  const dest = join(backupDir, `kurofune_${todayStamp()}.db`)
  if (existsSync(dest)) {
    return { created: false, path: dest }
  }

  // 未コミットの変更がファイルに残らないよう明示的にチェックポイントしてからコピーする
  getDb().exec('PRAGMA wal_checkpoint(TRUNCATE)')
  copyFileSync(getDbPath(), dest)

  pruneOldBackups(backupDir)
  return { created: true, path: dest }
}

function pruneOldBackups(backupDir: string): void {
  const files = readdirSync(backupDir)
    .filter((f) => f.startsWith('kurofune_') && f.endsWith('.db'))
    .map((f) => ({ name: f, mtime: statSync(join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)

  for (const file of files.slice(MAX_GENERATIONS)) {
    unlinkSync(join(backupDir, file.name))
  }
}
