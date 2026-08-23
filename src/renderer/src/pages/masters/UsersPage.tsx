import { useEffect, useRef, useState, type ReactElement } from 'react'
import type {
  Department,
  Destination,
  NewRequestDestination,
  NewUser,
  NewUserInsuranceCertificate,
  RecurringDayPattern,
  RecurringGroupSummary,
  RecurringRequestInput,
  User
} from '@shared/types/entities'

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

interface DayPatternForm {
  enabled: boolean
  pickupTime: string
  returnPickupTime: string
}

function emptyDayPatterns(): DayPatternForm[] {
  return WEEKDAY_LABELS.map(() => ({ enabled: false, pickupTime: '', returnPickupTime: '' }))
}

interface RecurDestForm {
  destinationId: number | null
  departmentId: number | null
  reason: string
  roundTripFlag: boolean
  kaigoKihonFlag: boolean
}

const emptyRecurDestination: RecurDestForm = {
  destinationId: null,
  departmentId: null,
  reason: '',
  roundTripFlag: true,
  kaigoKihonFlag: false
}

const dayCellHeaderStyle = { textAlign: 'left' as const, borderBottom: '1px solid #ccc', padding: 6 }
const dayCellStyle = { borderBottom: '1px solid #eee', padding: 6 }

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

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
  const [tab, setTab] = useState<'basic' | 'certificates' | 'recurring'>('basic')
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
        </button>{' '}
        <button
          onClick={() => setTab('recurring')}
          disabled={tab === 'recurring' || userId === 'new'}
        >
          定期搬送
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

      {tab === 'recurring' && userId !== 'new' && <RecurringTab userId={userId} />}
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

function RecurringTab(props: { userId: number }): ReactElement {
  const { userId } = props
  const [groups, setGroups] = useState<RecurringGroupSummary[]>([])
  const [destinationsMaster, setDestinationsMaster] = useState<Destination[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [receivedDate, setReceivedDate] = useState(todayStr())
  const [requestedBy, setRequestedBy] = useState('')
  const [suitableVehicle, setSuitableVehicle] = useState('')
  const [paidFlag, setPaidFlag] = useState(true)
  const [wheelchairFlag, setWheelchairFlag] = useState(false)
  const [specialTransportFlag, setSpecialTransportFlag] = useState(false)
  const [serviceTicketFlag, setServiceTicketFlag] = useState(false)
  const [companionName, setCompanionName] = useState('')
  const [remarks, setRemarks] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dayPatterns, setDayPatterns] = useState<DayPatternForm[]>(emptyDayPatterns)
  const [destinations, setDestinations] = useState<RecurDestForm[]>([{ ...emptyRecurDestination }])

  const startDateRef = useRef<HTMLInputElement>(null)
  const destinationRefs = useRef<(HTMLSelectElement | null)[]>([])

  async function reload(): Promise<void> {
    setGroups(await window.api.requests.listRecurringGroupsForUser(userId))
  }

  useEffect(() => {
    reload()
    window.api.destinations.list().then(setDestinationsMaster)
    window.api.departments.list().then(setDepartments)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function resetForm(): void {
    setReceivedDate(todayStr())
    setRequestedBy('')
    setSuitableVehicle('')
    setPaidFlag(true)
    setWheelchairFlag(false)
    setSpecialTransportFlag(false)
    setServiceTicketFlag(false)
    setCompanionName('')
    setRemarks('')
    setStartDate('')
    setEndDate('')
    setDayPatterns(emptyDayPatterns())
    setDestinations([{ ...emptyRecurDestination }])
    setError(null)
  }

  function updateDayPattern(day: number, patch: Partial<DayPatternForm>): void {
    setDayPatterns((prev) => prev.map((p, i) => (i === day ? { ...p, ...patch } : p)))
  }

  function updateDestination(index: number, patch: Partial<RecurDestForm>): void {
    setDestinations((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function addDestinationRow(): void {
    if (destinations.length >= 3) return
    setDestinations((prev) => [...prev, { ...emptyRecurDestination }])
  }

  function removeDestinationRow(index: number): void {
    setDestinations((prev) => prev.filter((_, i) => i !== index))
  }

  async function save(): Promise<void> {
    const enabledPatterns: RecurringDayPattern[] = dayPatterns
      .map((p, day) => ({ day, ...p }))
      .filter((p) => p.enabled)
      .map((p) => ({
        weekday: p.day,
        pickupTime: p.pickupTime || null,
        returnPickupTime: p.returnPickupTime || null
      }))
    if (enabledPatterns.length === 0) {
      setError('曜日を1つ以上選択してください')
      return
    }
    if (!startDate || !endDate) {
      setError('開始日・終了日を入力してください')
      startDateRef.current?.focus()
      return
    }
    const destInputs: NewRequestDestination[] = destinations
      .filter((d) => d.destinationId !== null)
      .map((d) => ({
        destinationId: d.destinationId as number,
        departmentId: d.departmentId,
        reason: d.reason || null,
        roundTripFlag: d.roundTripFlag,
        kaigoKihonFlag: d.kaigoKihonFlag
      }))
    if (destInputs.length === 0) {
      setError('搬送先を1件以上指定してください')
      destinationRefs.current[0]?.focus()
      return
    }

    setError(null)
    try {
      const input: RecurringRequestInput = {
        request: {
          userId,
          requestedBy: requestedBy || null,
          suitableVehicle: suitableVehicle || null,
          serviceTicketFlag,
          companionName: companionName || null,
          wheelchairFlag,
          specialTransportFlag,
          cancelDate: null,
          cancelReason: null,
          paidFlag,
          remarks: remarks || null
        },
        destinations: destInputs,
        receivedDate,
        dayPatterns: enabledPatterns,
        startDate,
        endDate
      }
      await window.api.requests.createRecurring(input)
      setFormOpen(false)
      resetForm()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function deleteSeries(groupId: number): Promise<void> {
    const ok = window.confirm(
      'この定期搬送に属する依頼をまとめて削除します。実績が既に入力されている日は削除されません。よろしいですか？'
    )
    if (!ok) return
    const result = await window.api.requests.deleteRecurringGroup(groupId)
    window.alert(
      `${result.deleted}件削除しました${result.skipped > 0 ? `(実績が既にある${result.skipped}件はスキップ)` : ''}`
    )
    await reload()
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {groups.length === 0 && (
        <p style={{ color: '#888' }}>現在登録されている定期搬送はありません。</p>
      )}
      {groups.map((g) => (
        <div
          key={g.recurringGroupId}
          style={{ border: '1px solid #ddd', padding: 12, marginBottom: 12 }}
        >
          <div>
            <strong>{g.startDate} 〜 {g.endDate}</strong>（毎週{' '}
            {g.weekdays.map((w) => WEEKDAY_LABELS[w]).join('・')}）
          </div>
          <div>搬送先: {g.destinationNames.join('、') || '(未設定)'}</div>
          <div>
            全{g.totalCount}件（残り{g.upcomingCount}件）
          </div>
          <button onClick={() => deleteSeries(g.recurringGroupId)} style={{ color: 'red' }}>
            このシリーズをまとめて削除
          </button>
        </div>
      ))}

      {!formOpen && (
        <button
          onClick={() => {
            resetForm()
            setFormOpen(true)
          }}
        >
          + 新規定期搬送を登録
        </button>
      )}

      {formOpen && (
        <div style={{ border: '1px dashed #999', padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>新規定期搬送</h3>

          <Field
            label="受付日"
            type="date"
            value={receivedDate}
            onChange={setReceivedDate}
          />
          <Field label="依頼者" value={requestedBy} onChange={setRequestedBy} />

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 2 }}>開始日 *</label>
              <input
                ref={startDateRef}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 2 }}>終了日 *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <label style={{ display: 'block', marginBottom: 4 }}>
            曜日・往路/復路の予定時刻 *（曜日ごとに時刻を変えられます）
          </label>
          <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={dayCellHeaderStyle}></th>
                <th style={dayCellHeaderStyle}>曜日</th>
                <th style={dayCellHeaderStyle}>往路時刻</th>
                <th style={dayCellHeaderStyle}>復路時刻</th>
              </tr>
            </thead>
            <tbody>
              {WEEKDAY_LABELS.map((label, day) => (
                <tr key={day}>
                  <td style={dayCellStyle}>
                    <input
                      type="checkbox"
                      checked={dayPatterns[day].enabled}
                      onChange={(e) => updateDayPattern(day, { enabled: e.target.checked })}
                    />
                  </td>
                  <td style={dayCellStyle}>{label}</td>
                  <td style={dayCellStyle}>
                    <input
                      type="time"
                      value={dayPatterns[day].pickupTime}
                      disabled={!dayPatterns[day].enabled}
                      onChange={(e) => updateDayPattern(day, { pickupTime: e.target.value })}
                      style={{ padding: 4, width: '100%', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={dayCellStyle}>
                    <input
                      type="time"
                      value={dayPatterns[day].returnPickupTime}
                      disabled={!dayPatterns[day].enabled}
                      onChange={(e) =>
                        updateDayPattern(day, { returnPickupTime: e.target.value })
                      }
                      style={{ padding: 4, width: '100%', boxSizing: 'border-box' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <fieldset style={{ marginBottom: 12 }}>
            <legend>搬送先（最大3件）</legend>
            {destinations.map((dest, index) => (
              <div key={index} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', marginBottom: 2 }}>搬送先{index + 1}</label>
                  <select
                    ref={(el) => {
                      destinationRefs.current[index] = el
                    }}
                    value={dest.destinationId ?? ''}
                    onChange={(e) =>
                      updateDestination(index, {
                        destinationId: e.target.value ? Number(e.target.value) : null
                      })
                    }
                    style={{ padding: 6, width: '100%' }}
                  >
                    <option value="">選択してください</option>
                    {destinationsMaster.map((d) => (
                      <option key={d.destinationId} value={d.destinationId}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', marginBottom: 2 }}>診療科</label>
                  <select
                    value={dest.departmentId ?? ''}
                    onChange={(e) =>
                      updateDestination(index, {
                        departmentId: e.target.value ? Number(e.target.value) : null
                      })
                    }
                    style={{ padding: 6, width: '100%' }}
                  >
                    <option value="">指定なし</option>
                    {departments.map((d) => (
                      <option key={d.departmentId} value={d.departmentId}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', marginBottom: 2 }}>理由</label>
                  <input
                    type="text"
                    value={dest.reason}
                    onChange={(e) => updateDestination(index, { reason: e.target.value })}
                    style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <label style={{ marginRight: 12 }}>
                  <input
                    type="checkbox"
                    checked={dest.roundTripFlag}
                    onChange={(e) => updateDestination(index, { roundTripFlag: e.target.checked })}
                  />{' '}
                  往復
                </label>
                <label style={{ marginRight: 12 }}>
                  <input
                    type="checkbox"
                    checked={dest.kaigoKihonFlag}
                    onChange={(e) => updateDestination(index, { kaigoKihonFlag: e.target.checked })}
                  />{' '}
                  介護基本
                </label>
                {destinations.length > 1 && (
                  <button type="button" onClick={() => removeDestinationRow(index)}>
                    この搬送先を削除
                  </button>
                )}
              </div>
            ))}
            {destinations.length < 3 && (
              <button type="button" onClick={addDestinationRow}>
                + 搬送先を追加
              </button>
            )}
          </fieldset>

          <Field label="適合車種" value={suitableVehicle} onChange={setSuitableVehicle} />
          <div style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={paidFlag}
                onChange={(e) => setPaidFlag(e.target.checked)}
              />{' '}
              有償
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={wheelchairFlag}
                onChange={(e) => setWheelchairFlag(e.target.checked)}
              />{' '}
              車椅子
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={specialTransportFlag}
                onChange={(e) => setSpecialTransportFlag(e.target.checked)}
              />{' '}
              特別搬送
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={serviceTicketFlag}
                onChange={(e) => setServiceTicketFlag(e.target.checked)}
              />{' '}
              提供票
            </label>
          </div>
          <Field label="同乗者" value={companionName} onChange={setCompanionName} />
          <Field label="備考" value={remarks} onChange={setRemarks} />

          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button onClick={save}>保存（依頼を一括生成）</button>{' '}
          <button
            onClick={() => {
              setFormOpen(false)
              resetForm()
            }}
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  )
}
