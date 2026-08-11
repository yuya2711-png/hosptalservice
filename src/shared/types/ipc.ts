import type {
  BackupFileInfo,
  BillingDetailItem,
  BillingSummaryItem,
  Department,
  Destination,
  Driver,
  ImportResult,
  InvoiceAdjustments,
  NewDepartment,
  NewDestination,
  NewDriver,
  NewServicePriceRevisionInput,
  NewSpecialTransportRate,
  NewTransportRequestInput,
  NewTransportResultInput,
  NewUser,
  NewUserInsuranceCertificate,
  RecurringRequestInput,
  RequestResultStatusItem,
  ServicePriceRevision,
  ServicePriceRevisionDetail,
  SpecialTransportRate,
  TransportRequestDetail,
  TransportRequestListItem,
  TransportResultDetail,
  User,
  UserInsuranceCertificate
} from './entities'

export interface AppStatus {
  appVersion: string
  dbPath: string
  schemaVersion: number
  lastBackup: { created: boolean; path: string }
}

// preload が contextBridge 経由で公開するAPIの型。
// renderer側はこの型を通して window.api を利用する。main側の各ハンドラもこの形に合わせて実装する。
export interface IpcApi {
  getAppStatus: () => Promise<AppStatus>

  departments: {
    list: (opts?: { includeInactive?: boolean }) => Promise<Department[]>
    create: (input: NewDepartment) => Promise<Department>
    update: (id: number, input: Partial<NewDepartment>) => Promise<Department>
    setActive: (id: number, isActive: boolean) => Promise<void>
  }

  destinations: {
    list: (opts?: { includeInactive?: boolean; search?: string }) => Promise<Destination[]>
    create: (input: NewDestination) => Promise<Destination>
    update: (id: number, input: Partial<NewDestination>) => Promise<Destination>
    setActive: (id: number, isActive: boolean) => Promise<void>
  }

  drivers: {
    list: (opts?: { includeInactive?: boolean; search?: string }) => Promise<Driver[]>
    create: (input: NewDriver) => Promise<Driver>
    update: (id: number, input: Partial<NewDriver>) => Promise<Driver>
    setActive: (id: number, isActive: boolean) => Promise<void>
  }

  users: {
    list: (opts?: { includeDeleted?: boolean; search?: string }) => Promise<User[]>
    get: (id: number) => Promise<User | null>
    create: (input: NewUser) => Promise<User>
    update: (id: number, input: Partial<NewUser>) => Promise<User>
    softDelete: (id: number) => Promise<void>
    listCertificates: (userId: number) => Promise<UserInsuranceCertificate[]>
    addCertificate: (input: NewUserInsuranceCertificate) => Promise<UserInsuranceCertificate>
  }

  requests: {
    list: (opts?: {
      dateFrom?: string
      dateTo?: string
      userId?: number
      search?: string
    }) => Promise<TransportRequestListItem[]>
    get: (id: number) => Promise<TransportRequestDetail | null>
    create: (input: NewTransportRequestInput) => Promise<TransportRequestDetail>
    update: (id: number, input: NewTransportRequestInput) => Promise<TransportRequestDetail>
    remove: (id: number) => Promise<void>
    createRecurring: (input: RecurringRequestInput) => Promise<TransportRequestDetail[]>
    deleteRecurringGroup: (groupId: number) => Promise<{ deleted: number; skipped: number }>
  }

  results: {
    listStatusForDate: (date: string) => Promise<RequestResultStatusItem[]>
    get: (id: number) => Promise<TransportResultDetail | null>
    createDraftForRequest: (requestId: number) => Promise<number | null>
    createDraftsForDate: (date: string) => Promise<{ created: number; skipped: number }>
    update: (id: number, input: NewTransportResultInput) => Promise<TransportResultDetail>
    remove: (id: number) => Promise<void>
  }

  print: {
    previewDailySchedule: (date: string) => Promise<string>
    previewInvoice: (
      yearMonth: string,
      userId: number,
      adjustments: InvoiceAdjustments
    ) => Promise<string>
  }

  servicePrices: {
    list: (opts?: { category?: string }) => Promise<ServicePriceRevision[]>
    get: (id: number) => Promise<ServicePriceRevisionDetail | null>
    create: (input: NewServicePriceRevisionInput) => Promise<ServicePriceRevisionDetail>
    update: (id: number, input: NewServicePriceRevisionInput) => Promise<ServicePriceRevisionDetail>
    remove: (id: number) => Promise<void>
    generateTiers: (params: {
      baseFee: number
      unitPrice: number
      intervalMinutes: number
      tierCount: number
    }) => Promise<{ lowerMinutes: number; upperMinutes: number; amount: number }[]>
    findFee: (params: {
      category: string
      date: string
      minutes: number
    }) => Promise<number | null>
  }

  specialTransportRates: {
    list: () => Promise<SpecialTransportRate[]>
    get: (id: number) => Promise<SpecialTransportRate | null>
    create: (input: NewSpecialTransportRate) => Promise<SpecialTransportRate>
    update: (id: number, input: NewSpecialTransportRate) => Promise<SpecialTransportRate>
    remove: (id: number) => Promise<void>
    findRate: (params: { category: string; date: string }) => Promise<number | null>
  }

  billing: {
    getMonthlySummary: (yearMonth: string) => Promise<BillingSummaryItem[]>
    getUserMonthlyDetail: (yearMonth: string, userId: number) => Promise<BillingDetailItem[]>
  }

  operator: {
    get: () => Promise<string | null>
    set: (name: string | null) => Promise<void>
  }

  backup: {
    list: () => Promise<BackupFileInfo[]>
    restore: (fileName: string) => Promise<void>
  }

  csvImport: {
    pickAndImportUsers: () => Promise<ImportResult | null>
    pickAndImportCertificates: () => Promise<ImportResult | null>
  }
}
