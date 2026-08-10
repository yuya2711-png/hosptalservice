import { useState, type ReactElement } from 'react'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export function PrintPage(): ReactElement {
  const [date, setDate] = useState(todayStr())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function preview(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await window.api.print.previewDailySchedule(date)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 480 }}>
      <h2>印刷</h2>
      <p>
        指定した日の搬送依頼を、配車確認と実績記入欄を兼ねたA4用紙で印刷プレビューします。
        <br />
        別ウィンドウでPDFが開き、そこから印刷・PDF保存ができます。
      </p>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 2 }}>対象日</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
        />
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={preview} disabled={busy}>
        {busy ? '生成中...' : '搬送スケジュール表を印刷プレビュー'}
      </button>
    </div>
  )
}
