import { useEffect, useState, type ReactElement } from 'react'
import type { AppStatus } from '@shared/types/ipc'

export function SystemStatusPage(): ReactElement {
  const [status, setStatus] = useState<AppStatus | null>(null)

  useEffect(() => {
    window.api.getAppStatus().then(setStatus)
  }, [])

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
    </div>
  )
}
