import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Windowsアカウントに依存しない固定パスに置く（perMachineインストール・PC間独立データという方針に合わせるため）
const DATA_ROOT = join(process.env.PROGRAMDATA ?? 'C:\\ProgramData', 'Kurofune')
const DB_DIR = join(DATA_ROOT, 'data')
const DB_PATH = join(DB_DIR, 'kurofune.db')
const BACKUP_DIR = join(DATA_ROOT, 'backup')

let db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!db) {
    mkdirSync(DB_DIR, { recursive: true })
    db = new DatabaseSync(DB_PATH)
    db.exec('PRAGMA foreign_keys = ON')
  }
  return db
}

export function getDbPath(): string {
  return DB_PATH
}

export function getBackupDir(): string {
  return BACKUP_DIR
}

export function getDataDir(): string {
  return DB_DIR
}

// バックアップ復元でDBファイルを差し替える前に、開いている接続を閉じるために使う。
// 呼び出し後に getDb() すると新しいファイルに対して再接続される。
export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
