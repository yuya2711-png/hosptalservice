// DBスキーマ(src/main/db/migrations/001_initial_schema.sql)に対応するエンティティ型。
// main/renderer 両方から参照する。

export interface Department {
  departmentId: number
  name: string
  sortOrder: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Destination {
  destinationId: number
  name: string
  nameKana: string | null
  postalCode: string | null
  address: string | null
  phoneNumber: string | null
  remarks: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Driver {
  driverId: number
  name: string
  nameKana: string | null
  phoneNumber: string | null
  remarks: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  userId: number
  name: string
  nameKana: string | null
  sex: 1 | 2 | null
  birthDate: string | null
  postalCode: string | null
  address: string | null
  phoneNumber: string | null
  transactionStatus: string | null
  livelihoodProtectionFlag: boolean
  specialTransportCategory: string | null
  wheelchairFlag: boolean
  careManager: string | null
  contractDate: string | null
  // 契約者かどうか(契約者でない場合は保険が適用できないため)。対象項目は未確定で、現状は記録のみ
  isContractor: boolean
  // 回送料金(事務所から6km超)の対象かどうか。ONの場合、搬送実績1件につき700円を自動加算する(billingRepository.ts参照)
  kaisouFeeFlag: boolean
  remarks: string | null
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface UserInsuranceCertificate {
  certificateId: number
  userId: number
  certificationType: string | null
  insurerName: string | null
  insurerNumber: string | null
  insuredNumber: string | null
  careLevel: string | null
  certificationDate: string | null
  validFrom: string | null
  validTo: string | null
  careSupportOffice: string | null
  careManager: string | null
  communityCareCenter: string | null
  planRequestNotifiedDate: string | null
  benefitRate: number | null
  isCurrent: boolean
  createdAt: string
  updatedAt: string
}

export interface TransportRequest {
  requestId: number
  receivedDate: string
  isRecurring: boolean
  recurringGroupId: number | null
  userId: number
  requestedBy: string | null
  transportDate: string
  pickupTime: string | null
  returnPickupTime: string | null
  suitableVehicle: string | null
  serviceTicketFlag: boolean
  companionName: string | null
  wheelchairFlag: boolean
  specialTransportFlag: boolean
  // 依頼全体として院内付き添いが必要か(搬送先ごとではなく依頼単位の項目)
  inHospitalAccompanimentFlag: boolean
  // 事前に割り当てる運転手(運転手マスタ参照、任意)
  driverId: number | null
  cancelDate: string | null
  cancelReason: string | null
  // キャンセルが有償か無償か。有償の場合の料金額は未確定のため未実装(CLAUDE.md参照)
  cancelPaidFlag: boolean
  paidFlag: boolean
  remarks: string | null
  createdAt: string
  updatedAt: string
}

export interface RequestDestination {
  requestDestinationId: number
  requestId: number
  seqNo: number
  destinationId: number
  departmentId: number | null
  reason: string | null
  roundTripFlag: boolean
  kaigoKihonFlag: boolean
}

// 一覧表示用に利用者名・搬送先名を結合した型
export interface TransportRequestListItem extends TransportRequest {
  userName: string
  destinationNames: string[]
}

export interface TransportRequestDetail {
  request: TransportRequest
  destinations: RequestDestination[]
}

export type NewRequestDestination = Pick<
  RequestDestination,
  | 'destinationId'
  | 'departmentId'
  | 'reason'
  | 'roundTripFlag'
  | 'kaigoKihonFlag'
>

export type NewTransportRequest = Pick<
  TransportRequest,
  | 'receivedDate'
  | 'userId'
  | 'requestedBy'
  | 'transportDate'
  | 'pickupTime'
  | 'returnPickupTime'
  | 'suitableVehicle'
  | 'serviceTicketFlag'
  | 'companionName'
  | 'wheelchairFlag'
  | 'specialTransportFlag'
  | 'inHospitalAccompanimentFlag'
  | 'driverId'
  | 'cancelDate'
  | 'cancelReason'
  | 'cancelPaidFlag'
  | 'paidFlag'
  | 'remarks'
>

export interface NewTransportRequestInput {
  request: NewTransportRequest
  destinations: NewRequestDestination[]
}

// 定期搬送: 曜日(0=日〜6=土)ごとに往路・復路の予定時刻を指定できる
export interface RecurringDayPattern {
  weekday: number
  pickupTime: string | null
  returnPickupTime: string | null
}

// 定期搬送: 曜日別パターン＋期間を指定し、main側で個別の搬送依頼へ展開する
export interface RecurringRequestInput {
  request: Omit<NewTransportRequest, 'transportDate' | 'receivedDate' | 'pickupTime' | 'returnPickupTime'>
  destinations: NewRequestDestination[]
  receivedDate: string
  dayPatterns: RecurringDayPattern[]
  startDate: string
  endDate: string
}

// 利用者マスタの「定期搬送」タブ表示用: 同じRecurringGroupIdを持つ依頼群の要約
export interface RecurringGroupSummary {
  recurringGroupId: number
  startDate: string
  endDate: string
  totalCount: number
  upcomingCount: number
  weekdays: number[]
  destinationNames: string[]
}

export interface TransportResult {
  resultId: number
  transportDate: string
  userId: number
  sourceRequestId: number | null
  kokuhorenClaimFlag: boolean
  snapshotCareLevel: string | null
  snapshotBenefitRate: number | null
  cancellationFeeAmount: number | null
  // タクシー券の枚数。1枚450円換算で、枚数×450円を実績全体の金額から自動的に差し引く(billingRepository.ts参照)
  taxiTicketCount: number | null
  remarks: string | null
  createdAt: string
  updatedAt: string
}

export interface ResultLeg {
  resultLegId: number
  resultDestinationId: number
  legType: 1 | 2
  departureLocation: string | null
  departureTime: string | null
  arrivalLocation: string | null
  arrivalTime: string | null
  transferTime: string | null
  vehicleNo: string | null
  driverId: number | null
  distanceKm: number | null
  // この脚(往路/復路)だけを取消にする(片道のみキャンセルする運用があるため)
  cancelFlag: boolean
  // 通院等乗降介助に該当するか(往路/復路それぞれ個別に判定)。
  // falseの場合、介護基本料に基本乗車料1,500円を自動加算する(billingRepository.ts参照)。
  // 既存データへの遡及的な金額変化を避けるため、デフォルトはtrue(該当する=追加課金なし)。
  tsuuinKaigoKihonFlag: boolean
}

export interface ResultDestination {
  resultDestinationId: number
  resultId: number
  seqNo: number
  destinationId: number
  departmentId: number | null
  physicalCareFlag: boolean
  inHospitalCareFlag: boolean
  // 院内介助にかかった時間(分)。60分毎に3,300円を付帯サービス料金に自動加算する(billingRepository.ts参照)
  inHospitalCareMinutes: number | null
  // 待機した時間(分)。15分毎に500円を付帯サービス料金に自動加算する(billingRepository.ts参照)
  waitingMinutes: number | null
  // 透析通院の実績であることを示すフラグ
  dialysisFlag: boolean
  advancedExpense: number | null
  hospitalStaffName: string | null
  calculatedFee: number | null
  // 請求書の内訳列に対応する金額(介護基本料/身体介助/付帯サービス/特別自費)
  baseCareFeeAmount: number | null
  physicalCareFeeAmount: number | null
  ancillaryServiceFeeAmount: number | null
  specialFeeAmount: number | null
  // 利用者マスタの特別搬送区分(認定)が無い利用者でも、実績ごとにスポットで区分を指定できる
  specialTransportCategory: string | null
  // チェックすると付帯サービス料金に1650円を加算する(集計・請求書で自動加算)
  inHospitalAccompanimentFlag: boolean
}

export interface ResultDestinationDetail extends ResultDestination {
  legs: ResultLeg[]
}

export interface TransportResultDetail {
  result: TransportResult
  destinations: ResultDestinationDetail[]
}

export type NewResultLeg = Pick<
  ResultLeg,
  | 'legType'
  | 'departureLocation'
  | 'departureTime'
  | 'arrivalLocation'
  | 'arrivalTime'
  | 'transferTime'
  | 'vehicleNo'
  | 'driverId'
  | 'distanceKm'
  | 'cancelFlag'
  | 'tsuuinKaigoKihonFlag'
>

export type NewResultDestination = Pick<
  ResultDestination,
  | 'destinationId'
  | 'departmentId'
  | 'physicalCareFlag'
  | 'inHospitalCareFlag'
  | 'inHospitalCareMinutes'
  | 'waitingMinutes'
  | 'dialysisFlag'
  | 'advancedExpense'
  | 'hospitalStaffName'
  | 'calculatedFee'
  | 'baseCareFeeAmount'
  | 'physicalCareFeeAmount'
  | 'ancillaryServiceFeeAmount'
  | 'specialFeeAmount'
  | 'specialTransportCategory'
  | 'inHospitalAccompanimentFlag'
> & { legs: NewResultLeg[] }

// 実績のヘッダ更新で編集できるのはこれらのフィールドのみ(利用者・元依頼は
// 下書き生成時に確定し、以後は変更しない。搬送日は入力ミスの訂正のため編集可能)
export type ResultHeaderInput = Pick<
  TransportResult,
  | 'transportDate'
  | 'kokuhorenClaimFlag'
  | 'snapshotCareLevel'
  | 'snapshotBenefitRate'
  | 'cancellationFeeAmount'
  | 'taxiTicketCount'
  | 'remarks'
>

export interface NewTransportResultInput {
  result: ResultHeaderInput
  destinations: NewResultDestination[]
}

// 依頼一覧の各行に対する実績の入力状況(未入力/入力中/完了)
export type ResultStatus = 'none' | 'in_progress' | 'done'

export interface RequestResultStatusItem {
  request: TransportRequestListItem
  resultId: number | null
  status: ResultStatus
}

// サービス単価(移動時間に応じた料金表)。適用開始日ごとに改定履歴を保持する。
export interface ServicePriceRevision {
  revisionId: number
  category: string
  effectiveFrom: string
  baseFee: number
  unitPrice: number
  intervalMinutes: number
  remarks: string | null
  createdAt: string
  updatedAt: string
}

export interface ServicePriceTier {
  tierId: number
  revisionId: number
  seqNo: number
  lowerMinutes: number
  upperMinutes: number
  amount: number
}

export interface ServicePriceRevisionDetail {
  revision: ServicePriceRevision
  tiers: ServicePriceTier[]
}

export type NewServicePriceTier = Pick<ServicePriceTier, 'lowerMinutes' | 'upperMinutes' | 'amount'>

export type NewServicePriceRevision = Pick<
  ServicePriceRevision,
  'category' | 'effectiveFrom' | 'baseFee' | 'unitPrice' | 'intervalMinutes' | 'remarks'
>

export interface NewServicePriceRevisionInput {
  revision: NewServicePriceRevision
  tiers: NewServicePriceTier[]
}

// 特別搬送の料金(利用者ごとの「特別搬送区分」に応じた固定額)。適用開始日で改定履歴を保持する。
export interface SpecialTransportRate {
  rateId: number
  category: string
  effectiveFrom: string
  amount: number
  remarks: string | null
  createdAt: string
  updatedAt: string
}

export type NewSpecialTransportRate = Pick<
  SpecialTransportRate,
  'category' | 'effectiveFrom' | 'amount' | 'remarks'
>

// 月次請求集計: 利用者ごとに国保連請求分/それ以外(自費等)の合計金額をまとめたもの
export interface BillingSummaryItem {
  userId: number
  userName: string
  kokuhorenAmount: number
  selfPayAmount: number
  totalAmount: number
  resultCount: number
}

// 月次請求集計の内訳(利用者1人分の実績明細)
export interface BillingDetailItem {
  resultId: number
  transportDate: string
  kokuhorenClaimFlag: boolean
  destinationNames: string[]
  amount: number
}

// 請求書印刷用の明細1行(搬送先1件分)
export interface InvoiceLineItem {
  resultId: number
  transportDate: string
  destinationName: string
  departureLocation: string | null
  departureTime: string | null
  arrivalTime: string | null
  minutes: number | null
  transportFee: number
  baseCareFee: number
  physicalCareFee: number
  ancillaryServiceFee: number
  specialFee: number
  advancedExpense: number
}

// 請求書印刷用データ一式(利用者1人・1か月分)
export interface InvoiceData {
  userId: number
  userName: string
  userAddress: string | null
  userPostalCode: string | null
  yearMonth: string
  lineItems: InvoiceLineItem[]
  cancellationFeeTotal: number
  // タクシー券枚数×450円の合計(自動計算)。手入力の`taxiTicketOffsetAmount`調整額とは別枠で表示する
  taxiTicketTotal: number
  // 回送料金の合計(自動計算)。利用者マスタのKaisouFeeFlagがONの場合、対象月の実績件数×700円
  relocationFeeTotal: number
}

// 請求書印刷時に手動で指定する調整項目
export interface InvoiceAdjustments {
  invoiceNumber: string
  taxAmount: number
  discountAmount: number
  taxiTicketOffsetAmount: number
}

// CSVインポート結果のサマリ(利用者情報・被保険者証情報 共通)
export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

// バックアップファイル一覧の1件分(復元画面用)
export interface BackupFileInfo {
  fileName: string
  sizeBytes: number
  modifiedAt: string
}

// 新規作成時に入力するフィールドのみを抜き出すユーティリティ型
export type NewDepartment = Pick<Department, 'name' | 'sortOrder'>
export type NewDestination = Pick<
  Destination,
  'name' | 'nameKana' | 'postalCode' | 'address' | 'phoneNumber' | 'remarks'
>
export type NewDriver = Pick<Driver, 'name' | 'nameKana' | 'phoneNumber' | 'remarks'>
export type NewUser = Pick<
  User,
  | 'name'
  | 'nameKana'
  | 'sex'
  | 'birthDate'
  | 'postalCode'
  | 'address'
  | 'phoneNumber'
  | 'transactionStatus'
  | 'livelihoodProtectionFlag'
  | 'specialTransportCategory'
  | 'wheelchairFlag'
  | 'careManager'
  | 'contractDate'
  | 'isContractor'
  | 'kaisouFeeFlag'
  | 'remarks'
>
export type NewUserInsuranceCertificate = Omit<
  UserInsuranceCertificate,
  'certificateId' | 'createdAt' | 'updatedAt'
>
