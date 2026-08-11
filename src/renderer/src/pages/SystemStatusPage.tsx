import { useEffect, useState, type ReactElement } from 'react'
import type { BackupFileInfo } from '@shared/types/entities'
import type { AppStatus } from '@shared/types/ipc'

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ja-JP')
}

export function SystemStatusPage(): ReactElement {
  const [status, setStatus] = useState<AppStatus | null>(null)
  const [backups, setBackups] = useState<BackupFileInfo[]>([])
  const [busy, setBusy] = useState(false)

  async function reload(): Promise<void> {
    const [s, b] = await Promise.all([window.api.getAppStatus(), window.api.backup.list()])
    setStatus(s)
    setBackups(b)
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleRestore(file: BackupFileInfo): Promise<void> {
    const ok = window.confirm(
      `バックアップ「${file.fileName}」(${formatDateTime(file.modifiedAt)}時点)で現在のデータを上書きします。\n` +
        `この操作の後、アプリが自動的に再起動します。よろしいですか？`
    )
    if (!ok) return
    setBusy(true)
    try {
      await window.api.backup.restore(file.fileName)
      // 成功時はここでアプリが再起動するため、以降のUI更新は基本的に走らない
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>システム情報</h2>
      {status === null ? (
        <p>確認中...</p>
      ) : (
        <ul>
          <li>バージョン: {status.appVersion}</li>
          <li>DBファイル: {status.dbPath}</li>
          <li>スキーマバージョン: {status.schemaVersion}</li>
          <li>
            バックアップ: {status.lastBackup.created ? '本日分を新規作成' : '本日分は作成済み'} (
            {status.lastBackup.path})
          </li>
        </ul>
      )}

      <h3 style={{ marginTop: 24 }}>バックアップから復元</h3>
      <p style={{ color: '#666' }}>
        毎日自動保存されるバックアップ(最大30世代)から、現在のデータを上書き復元できます。
        <br />
        復元すると、それ以降に入力したデータは失われます。慎重に選んでください。
      </p>
      {backups.length === 0 ? (
        <p style={{ color: '#888' }}>バックアップはまだありません。</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6 }}>
                日時
              </th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: 6 }}>
                サイズ
              </th>
              <th style={{ borderBottom: '1px solid #ccc', padding: 6 }} />
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.fileName}>
                <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                  {formatDateTime(b.modifiedAt)}
                </td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee', textAlign: 'right' }}>
                  {formatSize(b.sizeBytes)}
                </td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                  <button onClick={() => handleRestore(b)} disabled={busy}>
                    このバックアップに復元
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
