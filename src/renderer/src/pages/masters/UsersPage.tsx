import { useEffect, useState, type ReactElement } from 'react'
import type { NewUser, NewUserInsuranceCertificate, User } from '@shared/types/entities'

const emptyUser: NewUser = {
  name: '',
  nameKana: null,
  sex: null,
  birthDate: null,
  postalCode: null,
  address: null,
  phoneNumber: null,
  transactionStatus: null,
  livelihoodProtectionFlag: false,
  specialTransportCategory: null,
  wheelchairFlag: false,
  careManager: null,
  contractDate: null,
  remarks: null
}

export function UsersPage(): ReactElement {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)

  async function reloadList(): Promise<void> {
    const rows = await window.api.users.list({ search: search || undefined })
    setUsers(rows)
  }

  useEffect(() => {
    reloadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 320, borderRight: '1px solid #ccc', padding: 16, overflowY: 'auto' }}>
        <h2>利用者マスタ</h2>
        <input
          type="text"
          placeholder="氏名・カナで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 6, width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
        />
        <button onClick={() => setSelectedId('new')} style={{ marginBottom: 8 }}>
          + 新規登録
        </button>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.map((u) => (
            <li key={u.userId}>
              <button
                onClick={() => setSelectedId(u.userId)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: 6,
                  background: selectedId === u.userId ? '#eef' : 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {u.name} {u.nameKana ? `(${u.nameKana})` : ''}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedId !== null ? (
          <UserDetail
            key={selectedId}
            userId={selectedId}
            onSaved={async (id) => {
              await reloadList()
              setSelectedId(id)
            }}
            onDeleted={async () => {
              await reloadList()
              setSelectedId(null)
            }}
          />
        ) : (
          <p style={{ padding: 16 }}>左の一覧から利用者を選択するか、新規登録してください。</p>
        )}
      </div>
    </div>
  )
}

function UserDetail(props: {
  userId: number | 'new'
  onSaved: (id: number) => void
  onDeleted: () => void
}): ReactElement {
  const { userId, onSaved, onDeleted } = props
  const [tab, setTab] = useState<'basic' | 'certificates'>('basic')
  const [form, setForm] = useState<NewUser>(emptyUser)
  const [error, setError] = useState<string | null>(null)
  const [savedUser, setSavedUser] = useState<User | null>(null)

  useEffect(() => {
    if (userId === 'new') {
      setForm(emptyUser)
      setSavedUser(null)
      setTab('basic')
      return
    }
    window.api.users.get(userId).then((u) => {
      if (!u) return
      setSavedUser(u)
      setForm({
        name: u.name,
        nameKana: u.nameKana,
        sex: u.sex,
        birthDate: u.birthDate,
        postalCode: u.postalCode,
        address: u.address,
        phoneNumber: u.phoneNumber,
        transactionStatus: u.transactionStatus,
        livelihoodProtectionFlag: u.livelihoodProtectionFlag,
        specialTransportCategory: u.specialTransportCategory,
        wheelchairFlag: u.wheelchairFlag,
        careManager: u.careManager,
        contractDate: u.contractDate,
        remarks: u.remarks
      })
    })
  }, [userId])

  function update<K extends keyof NewUser>(key: K, value: NewUser[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function save(): Promise<void> {
    if (!form.name.trim()) {
      setError('氏名は必須項目です')
      return
    }
    setError(null)
    try {
      if (userId === 'new') {
        const created = await window.api.users.create(form)
        onSaved(created.userId)
      } else {
        const updated = await window.api.users.update(userId, form)
        setSavedUser(updated)
        onSaved(userId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function remove(): Promise<void> {
    if (userId === 'new') return
    const ok = window.confirm(`「${form.name}」を削除（無効化）します。よろしいですか？`)
    if (!ok) return
    await window.api.users.softDelete(userId)
    onDeleted()
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setTab('basic')} disabled={tab === 'basic'}>
          基本情報
        </button>{' '}
        <button
          onClick={() => setTab('certificates')}
          disabled={tab === 'certificates' || userId === 'new'}
        >
          被保険者証情報履歴
        </button>
      </div>

      {tab === 'basic' && (
        <div style={{ maxWidth: 480 }}>
          <Field label="氏名 *" value={form.name} onChange={(v) => update('name', v)} />
          <Field
            label="カナ"
            value={form.nameKana ?? ''}
            onChange={(v) => update('nameKana', v || null)}
          />
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', marginBottom: 2 }}>性別</label>
            <select
              value={form.sex ?? ''}
              onChange={(e) =>
                update('sex', e.target.value ? (Number(e.target.value) as 1 | 2) : null)
              }
              style={{ padding: 6, width: '100%' }}
            >
              <option value="">未設定</option>
              <option value="1">男性</option>
              <option value="2">女性</option>
            </select>
          </div>
          <Field
            label="生年月日"
            type="date"
            value={form.birthDate ?? ''}
            onChange={(v) => update('birthDate', v || null)}
          />
          <Field
            label="郵便番号"
            value={form.postalCode ?? ''}
            onChange={(v) => update('postalCode', v || null)}
          />
          <Field
            label="住所"
            value={form.address ?? ''}
            onChange={(v) => update('address', v || null)}
          />
          <Field
            label="電話番号"
            value={form.phoneNumber ?? ''}
            onChange={(v) => update('phoneNumber', v || null)}
          />
          <Field
            label="取引状態"
            value={form.transactionStatus ?? ''}
            onChange={(v) => update('transactionStatus', v || null)}
          />
          <Field
            label="特別搬送区分"
            value={form.specialTransportCategory ?? ''}
            onChange={(v) => update('specialTransportCategory', v || null)}
          />
          <Field
            label="担当ケアマネージャー"
            value={form.careManager ?? ''}
            onChange={(v) => update('careManager', v || null)}
          />
          <Field
            label="契約日"
            type="date"
            value={form.contractDate ?? ''}
            onChange={(v) => update('contractDate', v || null)}
          />
          <div style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={form.wheelchairFlag}
                onChange={(e) => update('wheelchairFlag', e.target.checked)}
              />{' '}
              車椅子
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={form.livelihoodProtectionFlag}
                onChange={(e) => update('livelihoodProtectionFlag', e.target.checked)}
              />{' '}
              生活保護
            </label>
          </div>
          <Field
            label="備考"
            value={form.remarks ?? ''}
            onChange={(v) => update('remarks', v || null)}
          />

          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button onClick={save}>保存</button>{' '}
          {userId !== 'new' && (
            <button onClick={remove} style={{ color: 'red' }}>
              削除（無効化）
            </button>
          )}
          {savedUser?.isDeleted && (
            <p style={{ color: 'red' }}>この利用者は削除（無効化）済みです。</p>
          )}
        </div>
      )}

      {tab === 'certificates' && userId !== 'new' && <CertificateHistory userId={userId} />}
    </div>
  )
}

function Field(props: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}): ReactElement {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'block', marginBottom: 2 }}>{props.label}</label>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  )
}

const emptyCertificate: Omit<NewUserInsuranceCertificate, 'userId'> = {
  certificationType: null,
  insurerName: null,
  insurerNumber: null,
  insuredNumber: null,
  careLevel: null,
  certificationDate: null,
  validFrom: null,
  validTo: null,
  careSupportOffice: null,
  careManager: null,
  communityCareCenter: null,
  planRequestNotifiedDate: null,
  benefitRate: null,
  isCurrent: true
}

function CertificateHistory(props: { userId: number }): ReactElement {
  const { userId } = props
  const [certs, setCerts] = useState<
    Awaited<ReturnType<typeof window.api.users.listCertificates>>
  >([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyCertificate)

  async function reload(): Promise<void> {
    setCerts(await window.api.users.listCertificates(userId))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function save(): Promise<void> {
    await window.api.users.addCertificate({ ...form, userId })
    setAdding(false)
    setForm(emptyCertificate)
    await reload()
  }

  return (
    <div>
      <button onClick={() => setAdding(true)} style={{ marginBottom: 8 }}>
        + 新しい証を追加
      </button>

      {adding && (
        <div style={{ border: '1px solid #ccc', padding: 12, marginBottom: 12, maxWidth: 480 }}>
          <Field
            label="要介護度"
            value={form.careLevel ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, careLevel: v || null }))}
          />
          <Field
            label="有効開始日"
            type="date"
            value={form.validFrom ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, validFrom: v || null }))}
          />
          <Field
            label="有効終了日"
            type="date"
            value={form.validTo ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, validTo: v || null }))}
          />
          <Field
            label="保険者名"
            value={form.insurerName ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, insurerName: v || null }))}
          />
          <Field
            label="被保険者番号"
            value={form.insuredNumber ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, insuredNumber: v || null }))}
          />
          <Field
            label="居宅支援事業所"
            value={form.careSupportOffice ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, careSupportOffice: v || null }))}
          />
          <Field
            label="担当ケアマネ"
            value={form.careManager ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, careManager: v || null }))}
          />
          <button onClick={save}>登録（これが最新の証になります）</button>{' '}
          <button onClick={() => setAdding(false)}>キャンセル</button>
        </div>
      )}

      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6 }}>
              状態
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6 }}>
              要介護度
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6 }}>
              有効期間
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 6 }}>
              保険者
            </th>
          </tr>
        </thead>
        <tbody>
          {certs.map((c) => (
            <tr key={c.certificateId}>
              <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                {c.isCurrent ? '最新' : '履歴'}
              </td>
              <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>{c.careLevel}</td>
              <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                {c.validFrom} 〜 {c.validTo}
              </td>
              <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>{c.insurerName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
