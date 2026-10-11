import { useEffect, useState, type ReactElement } from 'react'
import type {
  Department,
  Destination,
  Driver,
  NewResultDestination,
  NewTransportResultInput,
  RequestResultStatusItem,
  ResultStatus,
  TransportResultDetail
} from '@shared/types/entities'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

const STATUS_LABEL: Record<ResultStatus, string> = {
  none: '未入力',
  in_progress: '入力中',
  done: '完了'
}
const STATUS_COLOR: Record<ResultStatus, string> = {
  none: '#888',
  in_progress: '#b8860b',
  done: '#2e7d46'
}

export function ResultsPage(): ReactElement {
  const [date, setDate] = useState(todayStr())
  const [items, setItems] = useState<RequestResultStatusItem[]>([])
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [draftResultMessage, setDraftResultMessage] = useState<string | null>(null)

  const [departments, setDepartments] = useState<Department[]>([])
  const [destinationsMaster, setDestinationsMaster] = useState<Destination[]>([])
  const [driversMaster, setDriversMaster] = useState<Driver[]>([])

  async function reload(): Promise<void> {
    const rows = await window.api.results.listStatusForDate(date)
    setItems(rows)
  }

  useEffect(() => {
    reload()
    setSelectedResultId(null)
    setDraftResultMessage(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  useEffect(() => {
    window.api.departments.list().then(setDepartments)
    window.api.destinations.list().then(setDestinationsMaster)
    window.api.drivers.list().then(setDriversMaster)
  }, [])

  async function handleBulkDraft(): Promise<void> {
    setBusy(true)
    setDraftResultMessage(null)
    try {
      const result = await window.api.results.createDraftsForDate(date)
      await reload()
      // window.alert()はElectronではOSのネイティブダイアログになり、閉じた直後にウィンドウの
      // フォーカスが不安定になって<input type="date">のカレンダーが開かなくなることがあるため、
      // 画面内にメッセージを表示するだけにする(ブロッキングしない)。
      setDraftResultMessage(`下書きを${result.created}件作成しました(既存${result.skipped}件はスキップ)`)
    } finally {
      setBusy(false)
    }
  }

  async function openRow(item: RequestResultStatusItem): Promise<void> {
    let resultId = item.resultId
    if (resultId === null) {
      resultId = await window.api.results.createDraftForRequest(item.request.requestId)
      await reload()
    }
    if (resultId !== null) setSelectedResultId(resultId)
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 400, borderRight: '1px solid #ccc', padding: 16, overflowY: 'auto' }}>
        <h2>搬送実績</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: 6, width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
        />
        <button onClick={handleBulkDraft} disabled={busy} style={{ marginBottom: 12 }}>
          この日の下書きをまとめて作成
        </button>
        {draftResultMessage && (
          <p style={{ fontSize: 12, color: '#2e7d46', margin: '0 0 12px' }}>{draftResultMessage}</p>
        )}

        {items.length === 0 && <p style={{ color: '#888' }}>この日の搬送依頼はありません。</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map((item) => (
            <li key={item.request.requestId}>
              <button
                onClick={() => openRow(item)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: 6,
                  marginBottom: 2,
                  background:
                    selectedResultId !== null && selectedResultId === item.resultId
                      ? '#eef'
                      : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer'
                }}
              >
                <div>
                  {item.request.pickupTime ?? '未設定'} {item.request.userName}{' '}
                  {item.request.cancelDate && <span style={{ color: '#c0392b' }}>(キャンセル)</span>}
                </div>
                <div>
                  {item.request.destinationNames.join('、') || '(搬送先未設定)'}
                  {'　'}
                  <span style={{ color: STATUS_COLOR[item.status], fontWeight: 'bold' }}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedResultId !== null ? (
          <ResultDetailForm
            key={selectedResultId}
            resultId={selectedResultId}
            departments={departments}
            destinationsMaster={destinationsMaster}
            driversMaster={driversMaster}
            onSaved={reload}
            onDeleted={async () => {
              setSelectedResultId(null)
              await reload()
            }}
          />
        ) : (
          <p style={{ padding: 16 }}>
            左の一覧から搬送依頼を選択してください。実績が未作成の場合は自動的に下書きを作成します。
          </p>
        )}
      </div>
    </div>
  )
}

interface LegForm {
  departureLocation: string
  departureTime: string
  arrivalLocation: string
  arrivalTime: string
  transferTime: string
  vehicleNo: string
  driverId: number | null
  distanceKm: string
  cancelFlag: boolean
  // 通院等乗降介助に該当するか。falseの場合、介護基本料に基本乗車料1,500円を自動加算する
  tsuuinKaigoKihonFlag: boolean
}

function emptyLeg(): LegForm {
  return {
    departureLocation: '',
    departureTime: '',
    arrivalLocation: '',
    arrivalTime: '',
    transferTime: '',
    vehicleNo: '',
    driverId: null,
    distanceKm: '',
    cancelFlag: false,
    tsuuinKaigoKihonFlag: true
  }
}

interface ResultDestForm {
  destinationId: number | null
  departmentId: number | null
  physicalCareFlag: boolean
  inHospitalCareFlag: boolean
  inHospitalCareMinutes: string
  waitingMinutes: string
  dialysisFlag: boolean
  advancedExpense: string
  hospitalStaffName: string
  calculatedFee: string
  baseCareFeeAmount: string
  physicalCareFeeAmount: string
  ancillaryServiceFeeAmount: string
  specialFeeAmount: string
  specialTransportCategory: string
  inHospitalAccompanimentFlag: boolean
  legs: LegForm[]
}

const SERVICE_PRICE_CATEGORY = '福祉有償運送'

// 院内介助の料金(円/60分、くろふねの車両を利用した場合)。billingRepository.tsの計算式と揃えること。
const IN_HOSPITAL_CARE_FEE_PER_60MIN = 3300

function inHospitalCareFee(minutesStr: string): number {
  const minutes = Number(minutesStr)
  if (!minutesStr || !Number.isFinite(minutes) || minutes <= 0) return 0
  return Math.ceil(minutes / 60) * IN_HOSPITAL_CARE_FEE_PER_60MIN
}

// 待機料(円/15分)。billingRepository.tsのWAITING_FEE_PER_15MINと揃えること。
const WAITING_FEE_PER_15MIN = 500

function waitingFee(minutesStr: string): number {
  const minutes = Number(minutesStr)
  if (!minutesStr || !Number.isFinite(minutes) || minutes <= 0) return 0
  return Math.ceil(minutes / 15) * WAITING_FEE_PER_15MIN
}

// 通院等乗降介助に該当しない脚(往路/復路、取消済みを除く)1件につき加算する基本乗車料。
// billingRepository.tsのTSUUIN_KAIGO_BASE_FAREと揃えること。
const TSUUIN_KAIGO_BASE_FARE = 1500

function tsuuinKaigoAddOn(legs: LegForm[]): number {
  return legs
    .filter((leg) => !leg.cancelFlag && !leg.tsuuinKaigoKihonFlag)
    .reduce((sum) => sum + TSUUIN_KAIGO_BASE_FARE, 0)
}

// タクシー券1枚あたりの換算額。billingRepository.tsのTAXI_TICKET_UNIT_PRICEと揃えること。
const TAXI_TICKET_UNIT_PRICE = 450

function taxiTicketDiscount(countStr: string): number {
  const count = Number(countStr)
  if (!countStr || !Number.isFinite(count) || count <= 0) return 0
  return count * TAXI_TICKET_UNIT_PRICE
}

function parseTimeToMinutes(t: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(t)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

// 往路(＋復路)の所要時間の合計(分)。時刻が両方揃っている脚のみ合算する。日またぎは1日分繰り上げる。
// 取消済みの脚は合算しない。
function totalMinutes(legs: LegForm[]): number | null {
  let total = 0
  let any = false
  for (const leg of legs) {
    if (leg.cancelFlag) continue
    const dep = parseTimeToMinutes(leg.departureTime)
    const arr = parseTimeToMinutes(leg.arrivalTime)
    if (dep !== null && arr !== null) {
      let diff = arr - dep
      if (diff < 0) diff += 24 * 60
      total += diff
      any = true
    }
  }
  return any ? total : null
}

interface ResultFormState {
  kokuhorenClaimFlag: boolean
  snapshotCareLevel: string
  snapshotBenefitRate: string
  cancellationFeeAmount: string
  taxiTicketCount: string
  remarks: string
  destinations: ResultDestForm[]
}

function detailToForm(detail: TransportResultDetail): ResultFormState {
  return {
    kokuhorenClaimFlag: detail.result.kokuhorenClaimFlag,
    snapshotCareLevel: detail.result.snapshotCareLevel ?? '',
    snapshotBenefitRate:
      detail.result.snapshotBenefitRate !== null ? String(detail.result.snapshotBenefitRate) : '',
    cancellationFeeAmount:
      detail.result.cancellationFeeAmount !== null ? String(detail.result.cancellationFeeAmount) : '',
    taxiTicketCount: detail.result.taxiTicketCount !== null ? String(detail.result.taxiTicketCount) : '',
    remarks: detail.result.remarks ?? '',
    destinations: detail.destinations.map((d) => ({
      destinationId: d.destinationId,
      departmentId: d.departmentId,
      physicalCareFlag: d.physicalCareFlag,
      inHospitalCareFlag: d.inHospitalCareFlag,
      inHospitalCareMinutes: d.inHospitalCareMinutes !== null ? String(d.inHospitalCareMinutes) : '',
      waitingMinutes: d.waitingMinutes !== null ? String(d.waitingMinutes) : '',
      dialysisFlag: d.dialysisFlag,
      advancedExpense: d.advancedExpense !== null ? String(d.advancedExpense) : '',
      hospitalStaffName: d.hospitalStaffName ?? '',
      calculatedFee: d.calculatedFee !== null ? String(d.calculatedFee) : '',
      baseCareFeeAmount: d.baseCareFeeAmount !== null ? String(d.baseCareFeeAmount) : '',
      physicalCareFeeAmount: d.physicalCareFeeAmount !== null ? String(d.physicalCareFeeAmount) : '',
      ancillaryServiceFeeAmount:
        d.ancillaryServiceFeeAmount !== null ? String(d.ancillaryServiceFeeAmount) : '',
      specialFeeAmount: d.specialFeeAmount !== null ? String(d.specialFeeAmount) : '',
      specialTransportCategory: d.specialTransportCategory ?? '',
      inHospitalAccompanimentFlag: d.inHospitalAccompanimentFlag,
      legs: [...d.legs]
        .sort((a, b) => a.legType - b.legType)
        .map((leg) => ({
          departureLocation: leg.departureLocation ?? '',
          departureTime: leg.departureTime ?? '',
          arrivalLocation: leg.arrivalLocation ?? '',
          arrivalTime: leg.arrivalTime ?? '',
          transferTime: leg.transferTime ?? '',
          vehicleNo: leg.vehicleNo ?? '',
          driverId: leg.driverId,
          distanceKm: leg.distanceKm !== null ? String(leg.distanceKm) : '',
          cancelFlag: leg.cancelFlag,
          tsuuinKaigoKihonFlag: leg.tsuuinKaigoKihonFlag
        }))
    }))
  }
}

function ResultDetailForm(props: {
  resultId: number
  departments: Department[]
  destinationsMaster: Destination[]
  driversMaster: Driver[]
  onSaved: () => void
  onDeleted: () => void
}): ReactElement {
  const { resultId, departments, destinationsMaster, driversMaster, onSaved, onDeleted } = props
  const [form, setForm] = useState<ResultFormState | null>(null)
  const [transportDate, setTransportDate] = useState('')
  const [userId, setUserId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [specialCategories, setSpecialCategories] = useState<{ category: string; amount: number }[]>(
    []
  )

  useEffect(() => {
    window.api.results.get(resultId).then((detail) => {
      if (detail) {
        setForm(detailToForm(detail))
        setTransportDate(detail.result.transportDate)
        setUserId(detail.result.userId)
      }
    })
  }, [resultId])

  useEffect(() => {
    window.api.specialTransportRates.list().then((rates) => {
      // listはCategory, EffectiveFrom DESC順なので、区分ごとに最初に現れる行が最新の適用額になる
      const seen = new Set<string>()
      const latestByCategory: { category: string; amount: number }[] = []
      for (const r of rates) {
        if (seen.has(r.category)) continue
        seen.add(r.category)
        latestByCategory.push({ category: r.category, amount: r.amount })
      }
      setSpecialCategories(latestByCategory)
    })
  }, [])

  if (!form) return <p style={{ padding: 16 }}>読み込み中...</p>

  function update<K extends keyof ResultFormState>(key: K, value: ResultFormState[K]): void {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function updateDest(index: number, patch: Partial<ResultDestForm>): void {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            destinations: prev.destinations.map((d, i) => (i === index ? { ...d, ...patch } : d))
          }
        : prev
    )
  }

  function updateLeg(destIndex: number, legIndex: number, patch: Partial<LegForm>): void {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            destinations: prev.destinations.map((d, i) =>
              i === destIndex
                ? {
                    ...d,
                    legs: d.legs.map((leg, li) => (li === legIndex ? { ...leg, ...patch } : leg))
                  }
                : d
            )
          }
        : prev
    )
  }

  async function calculateFee(index: number): Promise<void> {
    const dest = form?.destinations[index]
    if (!dest) return
    const minutes = totalMinutes(dest.legs)
    if (minutes === null) {
      window.alert('往路の出発・到着時刻を入力してから計算してください')
      return
    }
    const fee = await window.api.servicePrices.findFee({
      category: SERVICE_PRICE_CATEGORY,
      date: transportDate,
      minutes
    })
    if (fee === null) {
      window.alert(
        '該当するサービス単価が見つかりませんでした。サービス単価マスタを確認するか、手動で金額を入力してください。'
      )
      return
    }
    updateDest(index, { calculatedFee: String(fee) })
  }

  async function calculateSpecialFee(index: number): Promise<void> {
    if (userId === null) return
    const dest = form?.destinations[index]
    let category = dest?.specialTransportCategory || null
    if (!category) {
      const user = await window.api.users.get(userId)
      category = user?.specialTransportCategory ?? null
    }
    if (!category) {
      window.alert(
        'この利用者には特別搬送区分が設定されていません。利用者マスタで設定するか、この実績の「特別搬送区分」欄でスポットの区分を選択してください。'
      )
      return
    }
    const fee = await window.api.specialTransportRates.findRate({
      category,
      date: transportDate
    })
    if (fee === null) {
      window.alert(
        `区分「${category}」に該当する特別搬送料金が見つかりませんでした。特別搬送料金マスタを確認してください。`
      )
      return
    }
    updateDest(index, { specialFeeAmount: String(fee), specialTransportCategory: category })
  }

  function toggleReturnLeg(destIndex: number, enabled: boolean): void {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            destinations: prev.destinations.map((d, i) => {
              if (i !== destIndex) return d
              if (enabled) return { ...d, legs: [d.legs[0], emptyLeg()] }
              return { ...d, legs: [d.legs[0]] }
            })
          }
        : prev
    )
  }

  async function save(): Promise<void> {
    if (!form) return
    if (!transportDate) {
      setError('搬送日を入力してください')
      return
    }
    const destinations: NewResultDestination[] = []
    for (const d of form.destinations) {
      if (d.destinationId === null) continue
      destinations.push({
        destinationId: d.destinationId,
        departmentId: d.departmentId,
        physicalCareFlag: d.physicalCareFlag,
        inHospitalCareFlag: d.inHospitalCareFlag,
        inHospitalCareMinutes: d.inHospitalCareMinutes !== '' ? Number(d.inHospitalCareMinutes) : null,
        waitingMinutes: d.waitingMinutes !== '' ? Number(d.waitingMinutes) : null,
        dialysisFlag: d.dialysisFlag,
        advancedExpense: d.advancedExpense !== '' ? Number(d.advancedExpense) : null,
        hospitalStaffName: d.hospitalStaffName || null,
        calculatedFee: d.calculatedFee !== '' ? Number(d.calculatedFee) : null,
        baseCareFeeAmount: d.baseCareFeeAmount !== '' ? Number(d.baseCareFeeAmount) : null,
        physicalCareFeeAmount: d.physicalCareFeeAmount !== '' ? Number(d.physicalCareFeeAmount) : null,
        ancillaryServiceFeeAmount:
          d.ancillaryServiceFeeAmount !== '' ? Number(d.ancillaryServiceFeeAmount) : null,
        specialFeeAmount: d.specialFeeAmount !== '' ? Number(d.specialFeeAmount) : null,
        specialTransportCategory: d.specialTransportCategory || null,
        inHospitalAccompanimentFlag: d.inHospitalAccompanimentFlag,
        legs: d.legs.map((leg, li) => ({
          legType: li === 0 ? 1 : 2,
          departureLocation: leg.departureLocation || null,
          departureTime: leg.departureTime || null,
          arrivalLocation: leg.arrivalLocation || null,
          arrivalTime: leg.arrivalTime || null,
          transferTime: leg.transferTime || null,
          vehicleNo: leg.vehicleNo || null,
          driverId: leg.driverId,
          distanceKm: leg.distanceKm !== '' ? Number(leg.distanceKm) : null,
          cancelFlag: leg.cancelFlag,
          tsuuinKaigoKihonFlag: leg.tsuuinKaigoKihonFlag
        }))
      })
    }
    if (destinations.length === 0) {
      setError('搬送先を1件以上指定してください')
      return
    }

    const input: NewTransportResultInput = {
      result: {
        transportDate,
        kokuhorenClaimFlag: form.kokuhorenClaimFlag,
        snapshotCareLevel: form.snapshotCareLevel || null,
        snapshotBenefitRate: form.snapshotBenefitRate !== '' ? Number(form.snapshotBenefitRate) : null,
        cancellationFeeAmount:
          form.cancellationFeeAmount !== '' ? Number(form.cancellationFeeAmount) : null,
        taxiTicketCount: form.taxiTicketCount !== '' ? Number(form.taxiTicketCount) : null,
        remarks: form.remarks || null
      },
      destinations
    }

    setError(null)
    try {
      await window.api.results.update(resultId, input)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function remove(): Promise<void> {
    const ok = window.confirm('この搬送実績を削除します。よろしいですか？')
    if (!ok) return
    await window.api.results.remove(resultId)
    onDeleted()
  }

  return (
    <div style={{ padding: 16, maxWidth: 720 }}>
      <h2>搬送実績を入力する</h2>

      <fieldset style={{ marginBottom: 12 }}>
        <legend>基本情報</legend>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 2 }}>搬送日</label>
          <input
            type="date"
            value={transportDate}
            onChange={(e) => setTransportDate(e.target.value)}
            style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={form.kokuhorenClaimFlag}
            onChange={(e) => update('kokuhorenClaimFlag', e.target.checked)}
          />{' '}
          国保連請求
        </label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 2 }}>要介護度</label>
            <input
              type="text"
              value={form.snapshotCareLevel}
              onChange={(e) => update('snapshotCareLevel', e.target.value)}
              style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 2 }}>給付率</label>
            <input
              type="number"
              step="0.01"
              value={form.snapshotBenefitRate}
              onChange={(e) => update('snapshotBenefitRate', e.target.value)}
              style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 2 }}>キャンセル料金</label>
            <input
              type="number"
              value={form.cancellationFeeAmount}
              onChange={(e) => update('cancellationFeeAmount', e.target.value)}
              style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 2 }}>タクシー券(枚)</label>
          <input
            type="number"
            value={form.taxiTicketCount}
            onChange={(e) => update('taxiTicketCount', e.target.value)}
            style={{ padding: 6, width: 160, boxSizing: 'border-box' }}
          />
          {taxiTicketDiscount(form.taxiTicketCount) > 0 && (
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
              タクシー券{form.taxiTicketCount}枚 × {TAXI_TICKET_UNIT_PRICE}円 =
              {taxiTicketDiscount(form.taxiTicketCount).toLocaleString()}円を、集計・請求書では全体の金額から差し引いて扱います。
            </p>
          )}
        </div>
        <label style={{ display: 'block', marginBottom: 2 }}>備考</label>
        <input
          type="text"
          value={form.remarks}
          onChange={(e) => update('remarks', e.target.value)}
          style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
        />
      </fieldset>

      {form.destinations.map((dest, di) => (
        <fieldset key={di} style={{ marginBottom: 12 }}>
          <legend>搬送先{di + 1}</legend>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 2 }}>搬送先</label>
              <select
                value={dest.destinationId ?? ''}
                onChange={(e) =>
                  updateDest(di, {
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
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 2 }}>診療科</label>
              <select
                value={dest.departmentId ?? ''}
                onChange={(e) =>
                  updateDest(di, {
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
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={dest.physicalCareFlag}
                onChange={(e) => updateDest(di, { physicalCareFlag: e.target.checked })}
              />{' '}
              身体介助
            </label>
            <label style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={dest.inHospitalCareFlag}
                onChange={(e) => updateDest(di, { inHospitalCareFlag: e.target.checked })}
              />{' '}
              院内介助
            </label>
            <label style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={dest.dialysisFlag}
                onChange={(e) => updateDest(di, { dialysisFlag: e.target.checked })}
              />{' '}
              透析
            </label>
            <label style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={dest.inHospitalAccompanimentFlag}
                onChange={(e) =>
                  updateDest(di, { inHospitalAccompanimentFlag: e.target.checked })
                }
              />{' '}
              院内付き添い
            </label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', marginBottom: 2 }}>院内介助時間(分)</label>
            <input
              type="number"
              value={dest.inHospitalCareMinutes}
              onChange={(e) => updateDest(di, { inHospitalCareMinutes: e.target.value })}
              style={{ padding: 6, width: 160, boxSizing: 'border-box' }}
            />
            {inHospitalCareFee(dest.inHospitalCareMinutes) > 0 && (
              <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
                60分ごとに{IN_HOSPITAL_CARE_FEE_PER_60MIN.toLocaleString()}円として計算され、集計・請求書では付帯サービス料金に
                {inHospitalCareFee(dest.inHospitalCareMinutes).toLocaleString()}円を加算して扱います。
              </p>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', marginBottom: 2 }}>待機時間(分)</label>
            <input
              type="number"
              value={dest.waitingMinutes}
              onChange={(e) => updateDest(di, { waitingMinutes: e.target.value })}
              style={{ padding: 6, width: 160, boxSizing: 'border-box' }}
            />
            {waitingFee(dest.waitingMinutes) > 0 && (
              <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
                15分ごとに{WAITING_FEE_PER_15MIN.toLocaleString()}円として計算され、集計・請求書では付帯サービス料金に
                {waitingFee(dest.waitingMinutes).toLocaleString()}円を加算して扱います。
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 2 }}>立替費用(有料道路代・駐車料金など実費)</label>
              <input
                type="number"
                value={dest.advancedExpense}
                onChange={(e) => updateDest(di, { advancedExpense: e.target.value })}
                placeholder="例: 有料道路代・駐車料金"
                style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
                有料道路代・駐車料金など、実費でかかった費用はこの欄に入力してください(請求書では「立替費用」列にそのまま計上されます)。
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 2 }}>院付担当者</label>
              <input
                type="text"
                value={dest.hospitalStaffName}
                onChange={(e) => updateDest(di, { hospitalStaffName: e.target.value })}
                style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <LegEditor
            label="往路"
            leg={dest.legs[0]}
            driversMaster={driversMaster}
            onChange={(patch) => updateLeg(di, 0, patch)}
          />

          <label style={{ display: 'block', margin: '8px 0' }}>
            <input
              type="checkbox"
              checked={dest.legs.length > 1}
              onChange={(e) => toggleReturnLeg(di, e.target.checked)}
            />{' '}
            復路あり
          </label>
          {dest.legs.length > 1 && (
            <LegEditor
              label="復路"
              leg={dest.legs[1]}
              driversMaster={driversMaster}
              onChange={(patch) => updateLeg(di, 1, patch)}
            />
          )}

          <div style={{ border: '1px solid #ddd', padding: 8, background: '#fafafa' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 2 }}>運送サービス料金(円)</label>
                <input
                  type="number"
                  value={dest.calculatedFee}
                  onChange={(e) => updateDest(di, { calculatedFee: e.target.value })}
                  style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <button type="button" onClick={() => calculateFee(di)}>
                移動時間から計算
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 8px' }}>
              往路(＋復路)の所要時間からサービス単価マスタを参照して計算します。算出後の金額は手動で修正できます。
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 2 }}>介護基本料(円)</label>
                <input
                  type="number"
                  value={dest.baseCareFeeAmount}
                  onChange={(e) => updateDest(di, { baseCareFeeAmount: e.target.value })}
                  style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
                />
                {tsuuinKaigoAddOn(dest.legs) > 0 && (
                  <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
                    往路/復路のうち通院等乗降介助に該当しないものがあるため、集計・請求書ではこの金額に基本乗車料
                    {tsuuinKaigoAddOn(dest.legs).toLocaleString()}円を加算して扱います。
                  </p>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 2 }}>身体介助(円)</label>
                <input
                  type="number"
                  value={dest.physicalCareFeeAmount}
                  onChange={(e) => updateDest(di, { physicalCareFeeAmount: e.target.value })}
                  style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 2 }}>付帯サービス(円)</label>
                <input
                  type="number"
                  value={dest.ancillaryServiceFeeAmount}
                  onChange={(e) => updateDest(di, { ancillaryServiceFeeAmount: e.target.value })}
                  style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
                />
                {(dest.inHospitalAccompanimentFlag ||
                  inHospitalCareFee(dest.inHospitalCareMinutes) > 0 ||
                  waitingFee(dest.waitingMinutes) > 0) && (
                  <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
                    {dest.inHospitalAccompanimentFlag && '院内付き添いチェックにより+1,650円、'}
                    {inHospitalCareFee(dest.inHospitalCareMinutes) > 0 &&
                      `院内介助時間により+${inHospitalCareFee(dest.inHospitalCareMinutes).toLocaleString()}円、`}
                    {waitingFee(dest.waitingMinutes) > 0 &&
                      `待機時間により+${waitingFee(dest.waitingMinutes).toLocaleString()}円、`}
                    集計・請求書ではこの金額に加算して扱います。
                  </p>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 2 }}>特別自費(円)</label>
                <input
                  type="number"
                  value={dest.specialFeeAmount}
                  onChange={(e) => updateDest(di, { specialFeeAmount: e.target.value })}
                  style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 2 }}>特別搬送区分</label>
                <select
                  value={dest.specialTransportCategory}
                  onChange={(e) => updateDest(di, { specialTransportCategory: e.target.value })}
                  style={{ padding: 6, width: '100%' }}
                >
                  <option value="">(利用者マスタの区分を使用)</option>
                  {specialCategories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category}({c.amount.toLocaleString()}円)
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={() => calculateSpecialFee(di)}>
                特別搬送区分から計算
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
              「特別搬送区分から計算」は、この実績の「特別搬送区分」欄で選んだ区分(未選択なら利用者マスタの特別搬送区分)から特別搬送料金マスタを参照し、特別自費欄に入力します。
              認定を持たない利用者のスポット的な特別搬送は、この欄で区分を直接選んでください。介護基本料・身体介助・付帯サービスは金額を直接入力してください。
            </p>
          </div>
        </fieldset>
      ))}

      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={save}>保存</button>{' '}
      <button onClick={remove} style={{ color: 'red' }}>
        削除
      </button>
    </div>
  )
}

function LegEditor(props: {
  label: string
  leg: LegForm
  driversMaster: Driver[]
  onChange: (patch: Partial<LegForm>) => void
}): ReactElement {
  const { label, leg, driversMaster, onChange } = props
  return (
    <div style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6
        }}
      >
        <div style={{ fontWeight: 'bold' }}>{label}</div>
        <label style={{ color: leg.cancelFlag ? 'red' : undefined }}>
          <input
            type="checkbox"
            checked={leg.cancelFlag}
            onChange={(e) => onChange({ cancelFlag: e.target.checked })}
          />{' '}
          この{label}を取消
        </label>
      </div>
      <label style={{ display: 'block', marginBottom: 6 }}>
        <input
          type="checkbox"
          checked={leg.tsuuinKaigoKihonFlag}
          onChange={(e) => onChange({ tsuuinKaigoKihonFlag: e.target.checked })}
        />{' '}
        通院等乗降介助
      </label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <MiniField
          label="出発地"
          value={leg.departureLocation}
          onChange={(v) => onChange({ departureLocation: v })}
        />
        <MiniField
          label="出発時刻"
          type="time"
          value={leg.departureTime}
          onChange={(v) => onChange({ departureTime: v })}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <MiniField
          label="到着地"
          value={leg.arrivalLocation}
          onChange={(v) => onChange({ arrivalLocation: v })}
        />
        <MiniField
          label="到着時刻"
          type="time"
          value={leg.arrivalTime}
          onChange={(v) => onChange({ arrivalTime: v })}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <MiniField
          label="回送時刻"
          type="time"
          value={leg.transferTime}
          onChange={(v) => onChange({ transferTime: v })}
        />
        <MiniField label="号車" value={leg.vehicleNo} onChange={(v) => onChange({ vehicleNo: v })} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>運転手</label>
          <select
            value={leg.driverId ?? ''}
            onChange={(e) => onChange({ driverId: e.target.value ? Number(e.target.value) : null })}
            style={{ padding: 6, width: '100%' }}
          >
            <option value="">未設定</option>
            {driversMaster.map((d) => (
              <option key={d.driverId} value={d.driverId}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <MiniField
          label="距離(km)"
          type="number"
          value={leg.distanceKm}
          onChange={(v) => onChange({ distanceKm: v })}
        />
      </div>
    </div>
  )
}

function MiniField(props: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}): ReactElement {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>{props.label}</label>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={{ padding: 6, width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  )
}
