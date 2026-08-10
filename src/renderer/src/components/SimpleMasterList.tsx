import { useEffect, useMemo, useState, type ReactElement } from 'react'

export interface SimpleMasterField<TNew> {
  key: keyof TNew
  label: string
  type: 'text' | 'number'
  required?: boolean
}

export interface SimpleMasterColumn<T> {
  key: keyof T
  label: string
}

export interface SimpleMasterApi<T, TNew> {
  list: (opts?: { includeInactive?: boolean }) => Promise<T[]>
  create: (input: TNew) => Promise<T>
  update: (id: number, input: Partial<TNew>) => Promise<T>
  setActive: (id: number, isActive: boolean) => Promise<void>
}

interface Props<T extends { isActive: boolean }, TNew extends Record<string, unknown>> {
  title: string
  fields: SimpleMasterField<TNew>[]
  listColumns: SimpleMasterColumn<T>[]
  searchableKeys: (keyof T)[]
  api: SimpleMasterApi<T, TNew>
  getId: (item: T) => number
  emptyItem: TNew
}

// 診療科・搬送先・運転手など、項目構成は違うが「一覧＋検索＋登録/編集＋有効/無効切替」という
// 操作の型が同じマスタをまとめて扱うための共通コンポーネント。
export function SimpleMasterList<
  T extends { isActive: boolean },
  TNew extends Record<string, unknown>
>({
  title,
  fields,
  listColumns,
  searchableKeys,
  api,
  getId,
  emptyItem
}: Props<T, TNew>): ReactElement {
  const [items, setItems] = useState<T[]>([])
  const [includeInactive, setIncludeInactive] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<TNew>(emptyItem)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reload(): Promise<void> {
    setLoading(true)
    try {
      const rows = await api.list({ includeInactive })
      setItems(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive])

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim()
    return items.filter((item) =>
      searchableKeys.some((key) => String(item[key] ?? '').includes(q))
    )
  }, [items, search, searchableKeys])

  function startNew(): void {
    setForm(emptyItem)
    setEditingId('new')
    setError(null)
  }

  function startEdit(item: T): void {
    const next: Record<string, unknown> = { ...emptyItem }
    for (const f of fields) {
      next[f.key as string] = (item as Record<string, unknown>)[f.key as string] ?? ''
    }
    setForm(next as TNew)
    setEditingId(getId(item))
    setError(null)
  }

  function updateField(key: keyof TNew, value: string): void {
    setForm((prev) => ({
      ...prev,
      [key]: value === '' ? null : value
    }))
  }

  async function save(): Promise<void> {
    const missing = fields.find((f) => f.required && !form[f.key])
    if (missing) {
      setError(`「${missing.label}」は必須項目です`)
      return
    }
    setError(null)
    try {
      if (editingId === 'new') {
        await api.create(form)
      } else if (editingId !== null) {
        await api.update(editingId, form)
      }
      setEditingId(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function toggleActive(item: T): Promise<void> {
    const label = String((item as Record<string, unknown>)['name'] ?? '')
    const willActivate = !item.isActive
    const ok = window.confirm(
      willActivate ? `「${label}」を有効に戻します。よろしいですか？` : `「${label}」を無効にします。よろしいですか？（データは削除されません）`
    )
    if (!ok) return
    await api.setActive(getId(item), willActivate)
    await reload()
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>{title}</h2>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input
          type="text"
          placeholder="検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 6, minWidth: 200 }}
        />
        <label>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />{' '}
          無効なものも表示
        </label>
        <button onClick={startNew}>+ 新規登録</button>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {listColumns.map((c) => (
                <th
                  key={String(c.key)}
                  style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6 }}
                >
                  {c.label}
                </th>
              ))}
              <th style={{ borderBottom: '1px solid #ccc', padding: 6 }}>状態</th>
              <th style={{ borderBottom: '1px solid #ccc', padding: 6 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={getId(item)} style={{ opacity: item.isActive ? 1 : 0.5 }}>
                {listColumns.map((c) => (
                  <td key={String(c.key)} style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                    {String((item as Record<string, unknown>)[c.key as string] ?? '')}
                  </td>
                ))}
                <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                  {item.isActive ? '有効' : '無効'}
                </td>
                <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                  <button onClick={() => startEdit(item)}>編集</button>{' '}
                  <button onClick={() => toggleActive(item)}>
                    {item.isActive ? '無効にする' : '有効に戻す'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingId !== null && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: '1px solid #ccc',
            maxWidth: 480
          }}
        >
          <h3>{editingId === 'new' ? '新規登録' : '編集'}</h3>
          {fields.map((f) => (
            <div key={String(f.key)} style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 2 }}>
                {f.label}
                {f.required && ' *'}
              </label>
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                value={(form[f.key] as string | number | null) ?? ''}
                onChange={(e) => updateField(f.key, e.target.value)}
                style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          ))}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button onClick={save}>保存</button>{' '}
          <button onClick={() => setEditingId(null)}>キャンセル</button>
        </div>
      )}
    </div>
  )
}
