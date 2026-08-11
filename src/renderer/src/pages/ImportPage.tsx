import { useState, type ReactElement } from 'react'
import type { ImportResult } from '@shared/types/entities'

function ResultView(props: { title: string; result: ImportResult }): ReactElement {
  const { title, result } = props
  return (
    <div style={{ border: '1px solid #ccc', padding: 12, marginTop: 12, maxWidth: 640 }}>
      <h4 style={{ margin: '0 0 8px' }}>{title}</h4>
      <p style={{ margin: '0 0 8px' }}>
        新規作成 {result.created}件 / 更新 {result.updated}件 / スキップ {result.skipped}件
      </p>
      {result.errors.length > 0 && (
        <div>
          <p style={{ color: '#b00', margin: '0 0 4px' }}>エラー({result.errors.length}件):</p>
          <ul style={{ color: '#b00', margin: 0, paddingLeft: 20, maxHeight: 200, overflowY: 'auto' }}>
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function ImportPage(): ReactElement {
  const [busy, setBusy] = useState(false)
  const [usersResult, setUsersResult] = useState<ImportResult | null>(null)
  const [certificatesResult, setCertificatesResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleImportUsers(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const result = await window.api.csvImport.pickAndImportUsers()
      if (result) setUsersResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleImportCertificates(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const result = await window.api.csvImport.pickAndImportCertificates()
      if (result) setCertificatesResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>CSVインポート</h2>
      <p style={{ color: '#666', maxWidth: 640 }}>
        カイポケからエクスポートした「利用者情報.csv」「被保険者証情報.csv」を取り込みます(文字コードはShift_JIS想定)。
        <br />
        利用者名(＋カナ)で既存の利用者を探し、見つかれば内容を更新、見つからなければ新規登録します。
        <br />
        被保険者証情報は利用者名で利用者と突き合わせるため、<strong>先に利用者情報.csvを取り込んでください。</strong>
      </p>

      <div style={{ marginBottom: 8 }}>
        <button onClick={handleImportUsers} disabled={busy}>
          利用者情報.csv を選んで取り込む
        </button>
      </div>
      <div>
        <button onClick={handleImportCertificates} disabled={busy}>
          被保険者証情報.csv を選んで取り込む
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {usersResult && <ResultView title="利用者情報.csv の取り込み結果" result={usersResult} />}
      {certificatesResult && (
        <ResultView title="被保険者証情報.csv の取り込み結果" result={certificatesResult} />
      )}
    </div>
  )
}
