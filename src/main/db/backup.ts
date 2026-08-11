import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { basename, join } from 'node:path'
import { closeDb, getBackupDir, getDb, getDbPath } from './connection'
import type { BackupFileInfo } from '../../shared/types/entities'

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

// 復元画面用に、バックアップフォルダにある .db ファイルを新しい順で一覧する
export function listBackups(): BackupFileInfo[] {
  const backupDir = getBackupDir()
  mkdirSync(backupDir, { recursive: true })
  return readdirSync(backupDir)
    .filter((f) => f.startsWith('kurofune_') && f.endsWith('.db'))
    .map((f) => {
      const stat = statSync(join(backupDir, f))
      return { fileName: f, sizeBytes: stat.size, modifiedAt: stat.mtime.toISOString() }
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
}

// 指定したバックアップファイルで現在のDBを上書きする。
// 復元前の状態も念のため退避してから差し替える。呼び出し元でアプリの再起動が必要。
export function restoreFromBackup(fileName: string): void {
  const backupDir = getBackupDir()
  // パストラバーサル対策: ディレクトリ区切りを含まないファイル名のみ許可する
  if (fileName !== basename(fileName) || !fileName.startsWith('kurofune_') || !fileName.endsWith('.db')) {
    throw new Error('不正なバックアップファイル名です')
  }
  const src = join(backupDir, fileName)
  if (!existsSync(src)) throw new Error(`バックアップファイルが見つかりません: ${fileName}`)

  closeDb()
  const dbPath = getDbPath()

  if (existsSync(dbPath)) {
    const safetyPath = join(backupDir, `pre_restore_${Date.now()}.db`)
    copyFileSync(dbPath, safetyPath)
  }

  copyFileSync(src, dbPath)
  for (const suffix of ['-wal', '-shm']) {
    const sidecar = `${dbPath}${suffix}`
    if (existsSync(sidecar)) unlinkSync(sidecar)
  }
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
