import { useEffect, useState, type ReactElement } from 'react'
import type {
  NewServicePriceRevisionInput,
  NewServicePriceTier,
  ServicePriceRevision
} from '@shared/types/entities'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export function ServicePricesPage(): ReactElement {
  const [revisions, setRevisions] = useState<ServicePriceRevision[]>([])
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)

  async function reload(): Promise<void> {
    setRevisions(await window.api.servicePrices.list())
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 320, borderRight: '1px solid #ccc', padding: 16, overflowY: 'auto' }}>
        <h2>サービス単価</h2>
        <p style={{ fontSize: 12, color: '#888' }}>
          移動時間に応じた料金表。改定日を分けて登録すると、過去の実績には影響しません。
        </p>
        <button onClick={() => setSelectedId('new')} style={{ marginBottom: 8 }}>
          + 新規改定を登録
        </button>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {revisions.map((r) => (
            <li key={r.revisionId}>
              <button
                onClick={() => setSelectedId(r.revisionId)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: 6,
                  marginBottom: 2,
                  background: selectedId === r.revisionId ? '#eef' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <strong>{r.category}</strong>
                </div>
                <div>
                  適用開始 {r.effectiveFrom}　基本{r.baseFee}円+単価{r.unitPrice}円×
                  {r.intervalMinutes}分
                </div>
              </button>
            </li>
          ))}
          {revisions.length === 0 && <p style={{ color: '#888' }}>未登録です。</p>}
        </ul>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedId !== null ? (
          <RevisionDetail
            key={selectedId}
            revisionId={selectedId}
            onSaved={async (id) => {
              await reload()
              setSelectedId(id)
            }}
            onDeleted={async () => {
              await reload()
              setSelectedId(null)
            }}
          />
        ) : (
          <p style={{ padding: 16 }}>左の一覧から改定を選択するか、新規登録してください。</p>
        )}
      </div>
    </div>
  )
}

interface TierForm {
  lowerMinutes: string
  upperMinutes: string
  amount: string
}

interface RevisionFormState {
  category: string
  effectiveFrom: string
  baseFee: string
  unitPrice: string
  intervalMinutes: string
  remarks: string
  tiers: TierForm[]
}

function emptyForm(): RevisionFormState {
  return {
    category: '福祉有償運送',
    effectiveFrom: todayStr(),
    baseFee: '0',
    unitPrice: '700',
    intervalMinutes: '15',
    remarks: '',
    tiers: []
  }
}

function RevisionDetail(props: {
  revisionId: number | 'new'
  onSaved: (id: number) => void
  onDeleted: () => void
}): ReactElement {
  const { revisionId, onSaved, onDeleted } = props
  const [form, setForm] = useState<RevisionFormState>(emptyForm)
  const [tierCount, setTierCount] = useState('20')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (revisionId === 'new') {
      setForm(emptyForm())
      return
    }
    window.api.servicePrices.get(revisionId).then((detail) => {
      if (!detail) return
      setForm({
        category: detail.revision.category,
        effectiveFrom: detail.revision.effectiveFrom,
        baseFee: String(detail.revision.baseFee),
        unitPrice: String(detail.revision.unitPrice),
        intervalMinutes: String(detail.revision.intervalMinutes),
        remarks: detail.revision.remarks ?? '',
        tiers: detail.tiers.map((t) => ({
          lowerMinutes: String(t.lowerMinutes),
          upperMinutes: String(t.upperMinutes),
          amount: String(t.amount)
        }))
      })
    })
  }, [revisionId])

  function update<K extends keyof RevisionFormState>(key: K, value: RevisionFormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function generateTiers(): Promise<void> {
    const baseFee = Number(form.baseFee) || 0
    const unitPrice = Number(form.unitPrice) || 0
    const intervalMinutes = Number(form.intervalMinutes) || 15
    const count = Number(tierCount) || 0
    if (count <= 0) {
      setError('生成する時間帯の件数を入力してください')
      return
    }
    const tiers = await window.api.servicePrices.generateTiers({
      baseFee,
      unitPrice,
      intervalMinutes,
      tierCount: count
    })
    setForm((prev) => ({
      ...prev,
      tiers: tiers.map((t) => ({
        lowerMinutes: String(t.lowerMinutes),
        upperMinutes: String(t.upperMinutes),
        amount: String(t.amount)
      }))
    }))
  }

  function updateTier(index: number, patch: Partial<TierForm>): void {
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t))
    }))
  }

  function removeTier(index: number): void {
    setForm((prev) => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== index) }))
  }

  function addTier(): void {
    const last = form.tiers[form.tiers.length - 1]
    const lower = last ? Number(last.upperMinutes) + 1 : 1
    const interval = Number(form.intervalMinutes) || 15
    setForm((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        { lowerMinutes: String(lower), upperMinutes: String(lower + interval - 1), amount: '0' }
      ]
    }))
  }

  async function save(): Promise<void> {
    if (!form.category.trim()) {
      setError('サービス区分は必須項目です')
      return
    }
    if (form.tiers.length === 0) {
      setError('時間帯を1件以上登録してください')
      return
    }
    const tiers: NewServicePriceTier[] = form.tiers.map((t) => ({
      lowerMinutes: Number(t.lowerMinutes),
      upperMinutes: Number(t.upperMinutes),
      amount: Number(t.amount)
    }))

    const input: NewServicePriceRevisionInput = {
      revision: {
        category: form.category,
        effectiveFrom: form.effectiveFrom,
        baseFee: Number(form.baseFee) || 0,
        unitPrice: Number(form.unitPrice) || 0,
        intervalMinutes: Number(form.intervalMinutes) || 15,
        remarks: form.remarks || null
      },
      tiers
    }

    setError(null)
    try {
      if (revisionId === 'new') {
        const created = await window.api.servicePrices.create(input)
        onSaved(created.revision.revisionId)
      } else {
        const updated = await window.api.servicePrices.update(revisionId, input)
        onSaved(updated.revision.revisionId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function remove(): Promise<void> {
    if (revisionId === 'new') return
    const ok = window.confirm(`「${form.category}」(${form.effectiveFrom}〜)を削除します。よろしいですか？`)
    if (!ok) return
    await window.api.servicePrices.remove(revisionId)
    onDeleted()
  }

  return (
    <div style={{ padding: 16, maxWidth: 640 }}>
      <h2>{revisionId === 'new' ? 'サービス単価 新規登録' : 'サービス単価 編集'}</h2>

      <fieldset style={{ marginBottom: 12 }}>
        <legend>基本情報</legend>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 2 }}>サービス区分 *</label>
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
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 2 }}>基本料金</label>
            <input
              type="number"
              value={form.baseFee}
              onChange={(e) => update('baseFee', e.target.value)}
              style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 2 }}>単価(円)</label>
            <input
              type="number"
              value={form.unitPrice}
              onChange={(e) => update('unitPrice', e.target.value)}
              style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 2 }}>刻み幅(分)</label>
            <input
              type="number"
              value={form.intervalMinutes}
              onChange={(e) => update('intervalMinutes', e.target.value)}
              style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
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
      </fieldset>

      <fieldset style={{ marginBottom: 12 }}>
        <legend>時間帯の自動生成</legend>
        <p style={{ fontSize: 12, color: '#666' }}>
          上記の基本料金・単価・刻み幅から「基本料金 + 単価×区分番号」の時間帯を機械的に作り直します。
          個別に手直ししたい場合は生成後に下の表を編集してください。
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 2 }}>時間帯の件数</label>
            <input
              type="number"
              value={tierCount}
              onChange={(e) => setTierCount(e.target.value)}
              style={{ padding: 6, width: 100 }}
            />
          </div>
          <button type="button" onClick={generateTiers}>
            時間帯を自動生成(上書き)
          </button>
        </div>
      </fieldset>

      <fieldset style={{ marginBottom: 12 }}>
        <legend>時間帯別料金</legend>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={cellHeaderStyle}>下限(分)</th>
              <th style={cellHeaderStyle}>上限(分)</th>
              <th style={cellHeaderStyle}>料金(円)</th>
              <th style={cellHeaderStyle}></th>
            </tr>
          </thead>
          <tbody>
            {form.tiers.map((t, i) => (
              <tr key={i}>
                <td style={cellStyle}>
                  <input
                    type="number"
                    value={t.lowerMinutes}
                    onChange={(e) => updateTier(i, { lowerMinutes: e.target.value })}
                    style={{ padding: 4, width: 80 }}
                  />
                </td>
                <td style={cellStyle}>
                  <input
                    type="number"
                    value={t.upperMinutes}
                    onChange={(e) => updateTier(i, { upperMinutes: e.target.value })}
                    style={{ padding: 4, width: 80 }}
                  />
                </td>
                <td style={cellStyle}>
                  <input
                    type="number"
                    value={t.amount}
                    onChange={(e) => updateTier(i, { amount: e.target.value })}
                    style={{ padding: 4, width: 100 }}
                  />
                </td>
                <td style={cellStyle}>
                  <button type="button" onClick={() => removeTier(i)}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={addTier} style={{ marginTop: 8 }}>
          + 時間帯を1件追加
        </button>
      </fieldset>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={save}>保存</button>{' '}
      {revisionId !== 'new' && (
        <button onClick={remove} style={{ color: 'red' }}>
          削除
        </button>
      )}
    </div>
  )
}

const cellHeaderStyle = { textAlign: 'left' as const, borderBottom: '1px solid #ccc', padding: 6 }
const cellStyle = { borderBottom: '1px solid #eee', padding: 6 }
