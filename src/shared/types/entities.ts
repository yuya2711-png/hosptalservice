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

export interface TransportResult {
  resultId: number
  transportDate: string
  userId: number
  sourceRequestId: number | null
  kokuhorenClaimFlag: boolean
  snapshotCareLevel: string | null
  snapshotBenefitRate: number | null
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
  advancedExpense: number | null
  hospitalStaffName: string | null
  calculatedFee: number | null
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
>

export type NewResultDestination = Pick<
  ResultDestination,
  | 'destinationId'
  | 'departmentId'
  | 'tsuuinKaigoKihonFlag'
  | 'physicalCareFlag'
  | 'inHospitalCareFlag'
  | 'advancedExpense'
  | 'hospitalStaffName'
  | 'calculatedFee'
> & { legs: NewResultLeg[] }

// 実績のヘッダ更新で編集できるのはこれらのフィールドのみ(搬送日・利用者・元依頼は
// 下書き生成時に確定し、以後は変更しない)
export type ResultHeaderInput = Pick<
  TransportResult,
  'kokuhorenClaimFlag' | 'snapshotCareLevel' | 'snapshotBenefitRate' | 'remarks'
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
