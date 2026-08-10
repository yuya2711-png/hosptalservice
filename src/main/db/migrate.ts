import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { getDb } from './connection'

// 開発時はソースツリー、パッケージ後はelectron-builderのextraResourcesで
// resources/migrations にコピーされたものを参照する
function getMigrationsDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'migrations')
  }
  return join(process.cwd(), 'src', 'main', 'db', 'migrations')
}

export interface MigrationResult {
  appliedVersions: number[]
  currentVersion: number
}

export function runMigrations(): MigrationResult {
  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS SchemaVersion (
      Version INTEGER PRIMARY KEY,
      AppliedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  const appliedRows = db.prepare('SELECT Version FROM SchemaVersion').all() as {
    Version: number
  }[]
  const applied = new Set(appliedRows.map((r) => r.Version))

  const dir = getMigrationsDir()
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))

  const appliedVersions: number[] = []

  for (const file of files) {
    const versionMatch = file.match(/^(\d+)_/)
    if (!versionMatch) continue
    const version = parseInt(versionMatch[1], 10)
    if (applied.has(version)) continue

    const sql = readFileSync(join(dir, file), 'utf-8')
    db.exec('BEGIN')
    try {
      db.exec(sql)
      db.prepare('INSERT INTO SchemaVersion (Version) VALUES (?)').run(version)
      db.exec('COMMIT')
      appliedVersions.push(version)
      console.log(`[migrate] applied ${file}`)
    } catch (err) {
      db.exec('ROLLBACK')
      throw new Error(
        `Migration ${file} failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  const currentVersion = Math.max(0, ...Array.from(applied), ...appliedVersions)
  return { appliedVersions, currentVersion }
}
