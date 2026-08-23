import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import type {
  Department,
  Destination,
  NewRequestDestination,
  NewTransportRequestInput,
  RecurringDayPattern,
  RecurringRequestInput,
  TransportRequestDetail,
  TransportRequestListItem,
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

const cellHeaderStyle = { textAlign: 'left' as const, borderBottom: '1px solid #ccc', padding: 6 }
const cellStyle = { borderBottom: '1px solid #eee', padding: 6 }

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export interface OpenRequestRequest {
  id: number | 'new'
  token: number
  defaultTransportDate?: string
}

export function RequestsPage(props: { openRequest?: OpenRequestRequest }): ReactElement {
  const { openRequest } = props
  const [dateFrom, setDateFrom] = useState(todayStr())
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [list, setList] = useState<TransportRequestListItem[]>([])
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [defaultTransportDate, setDefaultTransportDate] = useState<string | undefined>(undefined)

  const [departments, setDepartments] = useState<Department[]>([])
  const [destinationsMaster, setDestinationsMaster] = useState<Destination[]>([])
  const [usersMaster, setUsersMaster] = useState<User[]>([])

  async function reloadList(): Promise<void> {
    const rows = await window.api.requests.list({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: search || undefined
    })
    setList(rows)
  }

  useEffect(() => {
    reloadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, search])

  useEffect(() => {
    window.api.departments.list().then(setDepartments)
    window.api.destinations.list().then(setDestinationsMaster)
    window.api.users.list().then(setUsersMaster)
  }, [])

  useEffect(() => {
    if (!openRequest) return
    setDefaultTransportDate(openRequest.defaultTransportDate)
    setSelectedId(openRequest.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest?.token])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 360, borderRight: '1px solid #ccc', padding: 16, overflowY: 'auto' }}>
        <h2>搬送依頼</h2>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: 6, flex: 1 }}
          />
          <span style={{ alignSelf: 'center' }}>〜</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ padding: 6, flex: 1 }}
          />
        </div>
        <button
          onClick={() => {
            setDateFrom('')
            setDateTo('')
          }}
          style={{ marginBottom: 8, fontSize: 12 }}
        >
          期間指定を解除
        </button>
        <input
          type="text"
          placeholder="利用者名・カナで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 6, width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
        />
        <button onClick={() => setSelectedId('new')} style={{ marginBottom: 8 }}>
          + 新規登録
        </button>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {list.map((r) => (
            <li key={r.requestId}>
              <button
                onClick={() => setSelectedId(r.requestId)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: 6,
                  marginBottom: 2,
                  background: selectedId === r.requestId ? '#eef' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <strong>{r.transportDate}</strong> {r.pickupTime ?? ''}{' '}
                  {r.isRecurring && <span title="定期搬送">🔁</span>}{' '}
                  {r.cancelDate && <span style={{ color: 'red' }}>キャンセル</span>}
                </div>
                <div>
                  {r.userName} / {r.destinationNames.join('、') || '(搬送先未設定)'}
                </div>
              </button>
            </li>
          ))}
          {list.length === 0 && <p style={{ color: '#888' }}>該当する依頼はありません。</p>}
        </ul>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedId !== null ? (
          <RequestDetail
            key={`${selectedId}-${openRequest?.token ?? 0}`}
            requestId={selectedId}
            defaultTransportDate={selectedId === 'new' ? defaultTransportDate : undefined}
            departments={departments}
            destinationsMaster={destinationsMaster}
            usersMaster={usersMaster}
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
          <p style={{ padding: 16 }}>左の一覧から搬送依頼を選択するか、新規登録してください。</p>
        )}
      </div>
    </div>
  )
}

interface DestForm {
  destinationId: number | null
  departmentId: number | null
  reason: string
  roundTripFlag: boolean
  kaigoKihonFlag: boolean
}

const emptyDestination: DestForm = {
  destinationId: null,
  departmentId: null,
  reason: '',
  roundTripFlag: true,
  kaigoKihonFlag: false
}

interface RequestFormState {
  receivedDate: string
  userId: number | null
  requestedBy: string
  transportDate: string
  pickupTime: string
  returnPickupTime: string
  suitableVehicle: string
  serviceTicketFlag: boolean
  companionName: string
  wheelchairFlag: boolean
  specialTransportFlag: boolean
  cancelDate: string
  cancelReason: string
  paidFlag: boolean
  remarks: string
  destinations: DestForm[]
}

function emptyForm(defaultTransportDate?: string): RequestFormState {
  return {
    receivedDate: todayStr(),
    userId: null,
    requestedBy: '',
    transportDate: defaultTransportDate ?? '',
    pickupTime: '',
    returnPickupTime: '',
    suitableVehicle: '',
    serviceTicketFlag: false,
    companionName: '',
    wheelchairFlag: false,
    specialTransportFlag: false,
    cancelDate: '',
    cancelReason: '',
    paidFlag: true,
    remarks: '',
    destinations: [{ ...emptyDestination }]
  }
}

function detailToForm(detail: TransportRequestDetail): RequestFormState {
  const { request, destinations } = detail
  return {
    receivedDate: request.receivedDate,
    userId: request.userId,
    requestedBy: request.requestedBy ?? '',
    transportDate: request.transportDate,
    pickupTime: request.pickupTime ?? '',
    returnPickupTime: request.returnPickupTime ?? '',
    suitableVehicle: request.suitableVehicle ?? '',
    serviceTicketFlag: request.serviceTicketFlag,
    companionName: request.companionName ?? '',
    wheelchairFlag: request.wheelchairFlag,
    specialTransportFlag: request.specialTransportFlag,
    cancelDate: request.cancelDate ?? '',
    cancelReason: request.cancelReason ?? '',
    paidFlag: request.paidFlag,
    remarks: request.remarks ?? '',
    destinations:
      destinations.length > 0
        ? destinations.map((d) => ({
            destinationId: d.destinationId,
            departmentId: d.departmentId,
            reason: d.reason ?? '',
            roundTripFlag: d.roundTripFlag,
            kaigoKihonFlag: d.kaigoKihonFlag
          }))
        : [{ ...emptyDestination }]
  }
}

function RequestDetail(props: {
  requestId: number | 'new'
  defaultTransportDate?: string
  departments: Department[]
  destinationsMaster: Destination[]
  usersMaster: User[]
  onSaved: (id: number) => void
  onDeleted: () => void
}): ReactElement {
  const {
    requestId,
    defaultTransportDate,
    departments,
    destinationsMaster,
    usersMaster,
    onSaved,
    onDeleted
  } = props
  const [form, setForm] = useState<RequestFormState>(() => emptyForm(defaultTransportDate))
  const [error, setError] = useState<string | null>(null)
  const [wheelchairOpen, setWheelchairOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [recurringEnabled, setRecurringEnabled] = useState(false)
  const [dayPatterns, setDayPatterns] = useState<DayPatternForm[]>(emptyDayPatterns)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const [seriesInfo, setSeriesInfo] = useState<{
    isRecurring: boolean
    recurringGroupId: number | null
  } | null>(null)

  const userInputRef = useRef<HTMLInputElement>(null)
  const transportDateRef = useRef<HTMLInputElement>(null)
  const startDateRef = useRef<HTMLInputElement>(null)
  const destinationRefs = useRef<(HTMLSelectElement | null)[]>([])

  useEffect(() => {
    if (requestId === 'new') {
      setForm(emptyForm(defaultTransportDate))
      setUserQuery('')
      setWheelchairOpen(false)
      setCancelOpen(false)
      setSeriesInfo(null)
      setRecurringEnabled(false)
      setDayPatterns(emptyDayPatterns())
      setStartDate('')
      setEndDate('')
      return
    }
    window.api.requests.get(requestId).then((detail) => {
      if (!detail) return
      const f = detailToForm(detail)
      setForm(f)
      const u = usersMaster.find((x) => x.userId === f.userId)
      setUserQuery(u ? `${u.name}${u.nameKana ? `(${u.nameKana})` : ''}` : '')
      setWheelchairOpen(f.wheelchairFlag || f.specialTransportFlag || f.serviceTicketFlag)
      setCancelOpen(!!f.cancelDate)
      setSeriesInfo({
        isRecurring: detail.request.isRecurring,
        recurringGroupId: detail.request.recurringGroupId
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  function update<K extends keyof RequestFormState>(key: K, value: RequestFormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateDestination(index: number, patch: Partial<DestForm>): void {
    setForm((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d, i) => (i === index ? { ...d, ...patch } : d))
    }))
  }

  function addDestinationRow(): void {
    if (form.destinations.length >= 3) return
    setForm((prev) => ({ ...prev, destinations: [...prev.destinations, { ...emptyDestination }] }))
  }

  function removeDestinationRow(index: number): void {
    setForm((prev) => ({
      ...prev,
      destinations: prev.destinations.filter((_, i) => i !== index)
    }))
  }

  const matchingUsers = useMemo(() => {
    const q = userQuery.trim()
    if (!q) return usersMaster
    return usersMaster.filter((u) => u.name.includes(q) || (u.nameKana && u.nameKana.includes(q)))
  }, [userQuery, usersMaster])

  function updateDayPattern(day: number, patch: Partial<DayPatternForm>): void {
    setDayPatterns((prev) => prev.map((p, i) => (i === day ? { ...p, ...patch } : p)))
  }

  async function save(): Promise<void> {
    if (!form.userId) {
      setError('利用者を選択してください')
      userInputRef.current?.focus()
      return
    }

    const destinations: NewRequestDestination[] = form.destinations
      .filter((d) => d.destinationId !== null)
      .map((d) => ({
        destinationId: d.destinationId as number,
        departmentId: d.departmentId,
        reason: d.reason || null,
        roundTripFlag: d.roundTripFlag,
        kaigoKihonFlag: d.kaigoKihonFlag
      }))
    if (destinations.length === 0) {
      setError('搬送先を1件以上指定してください')
      destinationRefs.current[0]?.focus()
      return
    }

    const requestCommon = {
      userId: form.userId,
      requestedBy: form.requestedBy || null,
      suitableVehicle: form.suitableVehicle || null,
      serviceTicketFlag: form.serviceTicketFlag,
      companionName: form.companionName || null,
      wheelchairFlag: form.wheelchairFlag,
      specialTransportFlag: form.specialTransportFlag,
      cancelDate: form.cancelDate || null,
      cancelReason: form.cancelReason || null,
      paidFlag: form.paidFlag,
      remarks: form.remarks || null
    }

    setError(null)
    try {
      if (requestId === 'new' && recurringEnabled) {
        const enabledPatterns: RecurringDayPattern[] = dayPatterns
          .map((p, day) => ({ day, ...p }))
          .filter((p) => p.enabled)
          .map((p) => ({
            weekday: p.day,
            pickupTime: p.pickupTime || null,
            returnPickupTime: p.returnPickupTime || null
          }))
        if (enabledPatterns.length === 0) {
          setError('定期搬送の曜日を1つ以上選択してください')
          return
        }
        if (!startDate || !endDate) {
          setError('定期搬送の開始日・終了日を入力してください')
          startDateRef.current?.focus()
          return
        }
        const input: RecurringRequestInput = {
          request: requestCommon,
          destinations,
          receivedDate: form.receivedDate,
          dayPatterns: enabledPatterns,
          startDate,
          endDate
        }
        const created = await window.api.requests.createRecurring(input)
        onSaved(created[0].request.requestId)
        return
      }

      if (!form.transportDate) {
        setError('搬送日を入力してください')
        transportDateRef.current?.focus()
        return
      }

      const input: NewTransportRequestInput = {
        request: {
          receivedDate: form.receivedDate,
          transportDate: form.transportDate,
          pickupTime: form.pickupTime || null,
          returnPickupTime: form.returnPickupTime || null,
          ...requestCommon
        },
        destinations
      }

      if (requestId === 'new') {
        const created = await window.api.requests.create(input)
        onSaved(created.request.requestId)
      } else {
        const updated = await window.api.requests.update(requestId, input)
        onSaved(updated.request.requestId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function remove(): Promise<void> {
    if (requestId === 'new') return
    const ok = window.confirm(
      `${form.transportDate} ${userQuery} の搬送依頼を削除します。よろしいですか？`
    )
    if (!ok) return
    await window.api.requests.remove(requestId)
    onDeleted()
  }

  async function deleteSeries(): Promise<void> {
    if (!seriesInfo?.recurringGroupId) return
    const ok = window.confirm(
      'この定期搬送に属する依頼をまとめて削除します。実績が既に入力されている日は削除されません。よろしいですか？'
    )
    if (!ok) return
    const result = await window.api.requests.deleteRecurringGroup(seriesInfo.recurringGroupId)
    window.alert(
      `${result.deleted}件削除しました${result.skipped > 0 ? `(実績が既にある${result.skipped}件はスキップ)` : ''}`
    )
    onDeleted()
  }

  return (
    <div style={{ padding: 16, maxWidth: 640 }}>
      <h2>{requestId === 'new' ? '搬送依頼 新規登録' : '搬送依頼 編集'}</h2>

      <fieldset style={{ marginBottom: 12 }}>
        <legend>基本情報</legend>
        <DateField
          label="受付日 *"
          value={form.receivedDate}
          onChange={(v) => update('receivedDate', v)}
        />

        <div style={{ marginBottom: 8, position: 'relative' }}>
          <label style={{ display: 'block', marginBottom: 2 }}>利用者 *</label>
          <input
            ref={userInputRef}
            type="text"
            value={userQuery}
            onChange={(e) => {
              setUserQuery(e.target.value)
              setUserPickerOpen(true)
              update('userId', null)
            }}
            onFocus={() => setUserPickerOpen(true)}
            onBlur={() => setTimeout(() => setUserPickerOpen(false), 150)}
            placeholder="クリックして一覧表示、または氏名・カナで検索"
            style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
          />
          {userPickerOpen && (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 4,
                position: 'absolute',
                zIndex: 10,
                background: 'white',
                border: '1px solid #ccc',
                width: '100%',
                boxSizing: 'border-box',
                maxHeight: 260,
                overflowY: 'auto'
              }}
            >
              {matchingUsers.length === 0 && (
                <li style={{ padding: 6, color: '#888' }}>該当する利用者がいません</li>
              )}
              {matchingUsers.map((u) => (
                <li key={u.userId}>
                  <button
                    type="button"
                    onClick={() => {
                      update('userId', u.userId)
                      setUserQuery(`${u.name}${u.nameKana ? `(${u.nameKana})` : ''}`)
                      setUserPickerOpen(false)
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: 6,
                      border: 'none',
                      background:
                        form.userId === u.userId ? '#eef' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    {u.name} {u.nameKana ? `(${u.nameKana})` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Field
          label="依頼者"
          value={form.requestedBy}
          onChange={(v) => update('requestedBy', v)}
        />

        {requestId === 'new' && (
          <div style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={recurringEnabled}
                onChange={(e) => setRecurringEnabled(e.target.checked)}
              />{' '}
              定期搬送として登録する
            </label>
          </div>
        )}

        {recurringEnabled && requestId === 'new' ? (
          <div style={{ border: '1px dashed #999', padding: 8, marginBottom: 8 }}>
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
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={cellHeaderStyle}></th>
                  <th style={cellHeaderStyle}>曜日</th>
                  <th style={cellHeaderStyle}>往路時刻</th>
                  <th style={cellHeaderStyle}>復路時刻</th>
                </tr>
              </thead>
              <tbody>
                {WEEKDAY_LABELS.map((label, day) => (
                  <tr key={day}>
                    <td style={cellStyle}>
                      <input
                        type="checkbox"
                        checked={dayPatterns[day].enabled}
                        onChange={(e) => updateDayPattern(day, { enabled: e.target.checked })}
                      />
                    </td>
                    <td style={cellStyle}>{label}</td>
                    <td style={cellStyle}>
                      <input
                        type="time"
                        value={dayPatterns[day].pickupTime}
                        disabled={!dayPatterns[day].enabled}
                        onChange={(e) => updateDayPattern(day, { pickupTime: e.target.value })}
                        style={{ padding: 4, width: '100%', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={cellStyle}>
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
          </div>
        ) : (
          <>
            <DateField
              label="搬送日 *"
              inputRef={transportDateRef}
              value={form.transportDate}
              onChange={(v) => update('transportDate', v)}
            />
            <Field
              label="迎え時刻"
              type="time"
              value={form.pickupTime}
              onChange={(v) => update('pickupTime', v)}
            />
            <Field
              label="復路予定時刻"
              type="time"
              value={form.returnPickupTime}
              onChange={(v) => update('returnPickupTime', v)}
            />
          </>
        )}

        <Field
          label="適合車種"
          value={form.suitableVehicle}
          onChange={(v) => update('suitableVehicle', v)}
        />
        <div style={{ marginBottom: 8 }}>
          <label>
            <input
              type="checkbox"
              checked={form.paidFlag}
              onChange={(e) => update('paidFlag', e.target.checked)}
            />{' '}
            有償
          </label>
        </div>
      </fieldset>

      <fieldset style={{ marginBottom: 12 }}>
        <legend>搬送先（最大3件）</legend>
        {form.destinations.map((dest, index) => (
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
            {form.destinations.length > 1 && (
              <button type="button" onClick={() => removeDestinationRow(index)}>
                この搬送先を削除
              </button>
            )}
          </div>
        ))}
        {form.destinations.length < 3 && (
          <button type="button" onClick={addDestinationRow}>
            + 搬送先を追加
          </button>
        )}
      </fieldset>

      <fieldset style={{ marginBottom: 12 }}>
        <legend>
          <button type="button" onClick={() => setWheelchairOpen((v) => !v)}>
            {wheelchairOpen ? '▼' : '▶'} 車椅子・特別搬送
          </button>
        </legend>
        {wheelchairOpen && (
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={form.wheelchairFlag}
                onChange={(e) => update('wheelchairFlag', e.target.checked)}
              />{' '}
              車椅子
            </label>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={form.specialTransportFlag}
                onChange={(e) => update('specialTransportFlag', e.target.checked)}
              />{' '}
              特別搬送
            </label>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={form.serviceTicketFlag}
                onChange={(e) => update('serviceTicketFlag', e.target.checked)}
              />{' '}
              提供票
            </label>
            <Field
              label="同乗者"
              value={form.companionName}
              onChange={(v) => update('companionName', v)}
            />
          </div>
        )}
      </fieldset>

      <fieldset style={{ marginBottom: 12 }}>
        <legend>
          <button type="button" onClick={() => setCancelOpen((v) => !v)}>
            {cancelOpen ? '▼' : '▶'} キャンセル情報
          </button>
        </legend>
        {cancelOpen && (
          <div>
            <DateField
              label="キャンセル日"
              value={form.cancelDate}
              onChange={(v) => update('cancelDate', v)}
            />
            <Field
              label="キャンセル理由"
              value={form.cancelReason}
              onChange={(v) => update('cancelReason', v)}
            />
          </div>
        )}
      </fieldset>

      <Field label="備考" value={form.remarks} onChange={(v) => update('remarks', v)} />

      {seriesInfo?.isRecurring && seriesInfo.recurringGroupId && (
        <div style={{ border: '1px dashed #999', padding: 8, marginBottom: 12 }}>
          <p style={{ margin: '0 0 8px' }}>
            🔁 この依頼は定期搬送(グループ#{seriesInfo.recurringGroupId})の一部です。
          </p>
          <button onClick={deleteSeries} style={{ color: 'red' }}>
            このシリーズの依頼をまとめて削除
          </button>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={save}>保存</button>{' '}
      {requestId !== 'new' && (
        <button onClick={remove} style={{ color: 'red' }}>
          削除
        </button>
      )}
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

function DateField(props: {
  label: string
  value: string
  onChange: (v: string) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
}): ReactElement {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'block', marginBottom: 2 }}>{props.label}</label>
      <input
        ref={props.inputRef}
        type="date"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  )
}
