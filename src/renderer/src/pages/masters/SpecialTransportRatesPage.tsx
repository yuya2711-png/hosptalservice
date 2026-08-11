import { useEffect, useState, type ReactElement } from 'react'
import type { NewSpecialTransportRate, SpecialTransportRate } from '@shared/types/entities'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export function SpecialTransportRatesPage(): ReactElement {
  const [rates, setRates] = useState<SpecialTransportRate[]>([])
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)

  async function reload(): Promise<void> {
    setRates(await window.api.specialTransportRates.list())
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>特別搬送料金</h2>
      <p style={{ fontSize: 12, color: '#888', maxWidth: 640 }}>
        利用者マスタの「特別搬送区分」に応じた固定額です。区分名は利用者マスタの入力内容と一致させてください。
        <strong>現在登録されている金額は暫定値です。</strong>正式な金額が決まり次第、ここから更新してください。
      </p>
      <button onClick={() => setSelectedId('new')} style={{ marginBottom: 12 }}>
        + 新規登録
      </button>

      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 640 }}>
        <thead>
          <tr>
            <th style={cellHeaderStyle}>区分</th>
            <th style={cellHeaderStyle}>適用開始日</th>
            <th style={cellHeaderStyle}>金額</th>
            <th style={cellHeaderStyle}>備考</th>
            <th style={cellHeaderStyle}></th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r) => (
            <tr key={r.rateId}>
              <td style={cellStyle}>{r.category}</td>
              <td style={cellStyle}>{r.effectiveFrom}</td>
              <td style={cellStyle}>{r.amount.toLocaleString()}円</td>
              <td style={cellStyle}>{r.remarks}</td>
              <td style={cellStyle}>
                <button onClick={() => setSelectedId(r.rateId)}>編集</button>
              </td>
            </tr>
          ))}
          {rates.length === 0 && (
            <tr>
              <td style={cellStyle} colSpan={5}>
                未登録です。
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedId !== null && (
        <RateDetail
          key={selectedId}
          rateId={selectedId}
          onSaved={async () => {
            await reload()
            setSelectedId(null)
          }}
          onDeleted={async () => {
            await reload()
            setSelectedId(null)
          }}
          onCancel={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

interface RateFormState {
  category: string
  effectiveFrom: string
  amount: string
  remarks: string
}

function emptyForm(): RateFormState {
  return { category: '', effectiveFrom: todayStr(), amount: '', remarks: '' }
}

function RateDetail(props: {
  rateId: number | 'new'
  onSaved: () => void
  onDeleted: () => void
  onCancel: () => void
}): ReactElement {
  const { rateId, onSaved, onDeleted, onCancel } = props
  const [form, setForm] = useState<RateFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (rateId === 'new') {
      setForm(emptyForm())
      return
    }
    window.api.specialTransportRates.get(rateId).then((rate) => {
      if (!rate) return
      setForm({
        category: rate.category,
        effectiveFrom: rate.effectiveFrom,
        amount: String(rate.amount),
        remarks: rate.remarks ?? ''
      })
    })
  }, [rateId])

  function update<K extends keyof RateFormState>(key: K, value: RateFormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function save(): Promise<void> {
    if (!form.category.trim()) {
      setError('区分は必須項目です')
      return
    }
    if (form.amount === '') {
      setError('金額は必須項目です')
      return
    }
    const input: NewSpecialTransportRate = {
      category: form.category,
      effectiveFrom: form.effectiveFrom,
      amount: Number(form.amount),
      remarks: form.remarks || null
    }
    setError(null)
    try {
      if (rateId === 'new') {
        await window.api.specialTransportRates.create(input)
      } else {
        await window.api.specialTransportRates.update(rateId, input)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function remove(): Promise<void> {
    if (rateId === 'new') return
    const ok = window.confirm(`「${form.category}」(${form.effectiveFrom}〜)を削除します。よろしいですか？`)
    if (!ok) return
    await window.api.specialTransportRates.remove(rateId)
    onDeleted()
  }

  return (
    <div style={{ marginTop: 16, padding: 16, border: '1px solid #ccc', maxWidth: 480 }}>
      <h3>{rateId === 'new' ? '新規登録' : '編集'}</h3>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 2 }}>区分 *</label>
        <input
          type="text"
          value={form.category}
          onChange={(e) => update('category', e.target.value)}
          style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 2 }}>適用開始日 *</label>
        <input
          type="date"
          value={form.effectiveFrom}
          onChange={(e) => update('effectiveFrom', e.target.value)}
          style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 2 }}>金額(円) *</label>
        <input
          type="number"
          value={form.amount}
          onChange={(e) => update('amount', e.target.value)}
          style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', marginBottom: 2 }}>備考</label>
        <input
          type="text"
          value={form.remarks}
          onChange={(e) => update('remarks', e.target.value)}
          style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
        />
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={save}>保存</button>{' '}
      {rateId !== 'new' && (
        <button onClick={remove} style={{ color: 'red' }}>
          削除
        </button>
      )}{' '}
      <button onClick={onCancel}>キャンセル</button>
    </div>
  )
}

const cellHeaderStyle = { textAlign: 'left' as const, borderBottom: '1px solid #ccc', padding: 6 }
const cellStyle = { borderBottom: '1px solid #eee', padding: 6 }
