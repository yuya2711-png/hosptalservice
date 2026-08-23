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
  cancelDate: string | null
  cancelReason: string | null
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
  'destinationId' | 'departmentId' | 'reason' | 'roundTripFlag' | 'kaigoKihonFlag'
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
  | 'cancelDate'
  | 'cancelReason'
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
}

export interface ResultDestination {
  resultDestinationId: number
  resultId: number
  seqNo: number
  destinationId: number
  departmentId: number | null
  tsuuinKaigoKihonFlag: boolean
  physicalCareFlag: boolean
  inHospitalCareFlag: boolean
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
>

export type NewResultDestination = Pick<
  ResultDestination,
  | 'destinationId'
  | 'departmentId'
  | 'tsuuinKaigoKihonFlag'
  | 'physicalCareFlag'
  | 'inHospitalCareFlag'
  | 'dialysisFlag'
  | 'advancedExpense'
  | 'hospitalStaffName'
  | 'calculatedFee'
  | 'baseCareFeeAmount'
  | 'physicalCareFeeAmount'
  | 'ancillaryServiceFeeAmount'
  | 'specialFeeAmount'
  | 'specialTransportCategory'
> & { legs: NewResultLeg[] }

// 実績のヘッダ更新で編集できるのはこれらのフィールドのみ(搬送日・利用者・元依頼は
// 下書き生成時に確定し、以後は変更しない)
export type ResultHeaderInput = Pick<
  TransportResult,
  'kokuhorenClaimFlag' | 'snapshotCareLevel' | 'snapshotBenefitRate' | 'cancellationFeeAmount' | 'remarks'
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
  | 'remarks'
>
export type NewUserInsuranceCertificate = Omit<
  UserInsuranceCertificate,
  'certificateId' | 'createdAt' | 'updatedAt'
>
