import { app, dialog, ipcMain } from 'electron'
import {
  createDepartment,
  listDepartments,
  setDepartmentActive,
  updateDepartment
} from '../db/repositories/departmentRepository'
import {
  createDestination,
  listDestinations,
  setDestinationActive,
  updateDestination
} from '../db/repositories/destinationRepository'
import {
  createDriver,
  listDrivers,
  setDriverActive,
  updateDriver
} from '../db/repositories/driverRepository'
import {
  addUserCertificate,
  createUser,
  getUser,
  listUserCertificates,
  listUsers,
  softDeleteUser,
  updateUser
} from '../db/repositories/userRepository'
import {
  createRecurringRequests,
  createRequest,
  deleteRecurringGroup,
  deleteRequest,
  getRequestDetail,
  listRequests,
  updateRequest
} from '../db/repositories/requestRepository'
import {
  createDraftForRequest,
  createDraftsForDate,
  deleteResult,
  getResultDetail,
  listRequestResultStatus,
  updateResult
} from '../db/repositories/resultRepository'
import { generateDailySchedulePdf, openPdfPreview } from '../print/printSchedule'
import { generateInvoicePdf } from '../print/printInvoice'
import { listBackups, restoreFromBackup } from '../db/backup'
import { importCertificatesFromCsv, importUsersFromCsv } from '../db/repositories/importRepository'
import {
  createRevision,
  deleteRevision,
  findFeeForMinutes,
  generateTiers,
  getRevisionDetail,
  listRevisions,
  updateRevision
} from '../db/repositories/servicePriceRepository'
import {
  createRate,
  deleteRate,
  findRateForCategory,
  getRate,
  listRates,
  updateRate
} from '../db/repositories/specialTransportRateRepository'
import { getMonthlyBillingDetail, getMonthlyBillingSummary } from '../db/repositories/billingRepository'
import { getCurrentOperator, setCurrentOperator } from '../operatorState'

export function registerIpc(): void {
  ipcMain.handle('departments:list', (_e, opts) => listDepartments(opts))
  ipcMain.handle('departments:create', (_e, input) => createDepartment(input))
  ipcMain.handle('departments:update', (_e, id, input) => updateDepartment(id, input))
  ipcMain.handle('departments:setActive', (_e, id, isActive) => setDepartmentActive(id, isActive))

  ipcMain.handle('destinations:list', (_e, opts) => listDestinations(opts))
  ipcMain.handle('destinations:create', (_e, input) => createDestination(input))
  ipcMain.handle('destinations:update', (_e, id, input) => updateDestination(id, input))
  ipcMain.handle('destinations:setActive', (_e, id, isActive) =>
    setDestinationActive(id, isActive)
  )

  ipcMain.handle('drivers:list', (_e, opts) => listDrivers(opts))
  ipcMain.handle('drivers:create', (_e, input) => createDriver(input))
  ipcMain.handle('drivers:update', (_e, id, input) => updateDriver(id, input))
  ipcMain.handle('drivers:setActive', (_e, id, isActive) => setDriverActive(id, isActive))

  ipcMain.handle('users:list', (_e, opts) => listUsers(opts))
  ipcMain.handle('users:get', (_e, id) => getUser(id))
  ipcMain.handle('users:create', (_e, input) => createUser(input))
  ipcMain.handle('users:update', (_e, id, input) => updateUser(id, input))
  ipcMain.handle('users:softDelete', (_e, id) => softDeleteUser(id))
  ipcMain.handle('users:listCertificates', (_e, userId) => listUserCertificates(userId))
  ipcMain.handle('users:addCertificate', (_e, input) => addUserCertificate(input))

  ipcMain.handle('requests:list', (_e, opts) => listRequests(opts))
  ipcMain.handle('requests:get', (_e, id) => getRequestDetail(id))
  ipcMain.handle('requests:create', (_e, input) => createRequest(input))
  ipcMain.handle('requests:update', (_e, id, input) => updateRequest(id, input))
  ipcMain.handle('requests:remove', (_e, id) => deleteRequest(id))
  ipcMain.handle('requests:createRecurring', (_e, input) => createRecurringRequests(input))
  ipcMain.handle('requests:deleteRecurringGroup', (_e, groupId) => deleteRecurringGroup(groupId))

  ipcMain.handle('results:listStatusForDate', (_e, date) => listRequestResultStatus(date))
  ipcMain.handle('results:get', (_e, id) => getResultDetail(id))
  ipcMain.handle('results:createDraftForRequest', (_e, requestId) =>
    createDraftForRequest(requestId)
  )
  ipcMain.handle('results:createDraftsForDate', (_e, date) => createDraftsForDate(date))
  ipcMain.handle('results:update', (_e, id, input) => updateResult(id, input))
  ipcMain.handle('results:remove', (_e, id) => deleteResult(id))

  ipcMain.handle('print:previewDailySchedule', async (_e, date) => {
    const pdfPath = await generateDailySchedulePdf(date)
    await openPdfPreview(pdfPath)
    return pdfPath
  })
  ipcMain.handle('print:previewInvoice', async (_e, yearMonth, userId, adjustments) => {
    const pdfPath = await generateInvoicePdf(yearMonth, userId, adjustments)
    await openPdfPreview(pdfPath)
    return pdfPath
  })

  ipcMain.handle('servicePrices:list', (_e, opts) => listRevisions(opts))
  ipcMain.handle('servicePrices:get', (_e, id) => getRevisionDetail(id))
  ipcMain.handle('servicePrices:create', (_e, input) => createRevision(input))
  ipcMain.handle('servicePrices:update', (_e, id, input) => updateRevision(id, input))
  ipcMain.handle('servicePrices:remove', (_e, id) => deleteRevision(id))
  ipcMain.handle('servicePrices:generateTiers', (_e, params) =>
    generateTiers(params.baseFee, params.unitPrice, params.intervalMinutes, params.tierCount)
  )
  ipcMain.handle('servicePrices:findFee', (_e, params) =>
    findFeeForMinutes(params.category, params.date, params.minutes)
  )

  ipcMain.handle('specialTransportRates:list', () => listRates())
  ipcMain.handle('specialTransportRates:get', (_e, id) => getRate(id))
  ipcMain.handle('specialTransportRates:create', (_e, input) => createRate(input))
  ipcMain.handle('specialTransportRates:update', (_e, id, input) => updateRate(id, input))
  ipcMain.handle('specialTransportRates:remove', (_e, id) => deleteRate(id))
  ipcMain.handle('specialTransportRates:findRate', (_e, params) =>
    findRateForCategory(params.category, params.date)
  )

  ipcMain.handle('billing:getMonthlySummary', (_e, yearMonth) =>
    getMonthlyBillingSummary(yearMonth)
  )
  ipcMain.handle('billing:getUserMonthlyDetail', (_e, yearMonth, userId) =>
    getMonthlyBillingDetail(yearMonth, userId)
  )

  ipcMain.handle('operator:get', () => getCurrentOperator())
  ipcMain.handle('operator:set', (_e, name) => setCurrentOperator(name))

  ipcMain.handle('backup:list', () => listBackups())
  ipcMain.handle('backup:restore', (_e, fileName) => {
    restoreFromBackup(fileName)
    // ファイルを差し替えただけでは開いたままの状態と食い違うため、アプリを再起動して整合させる
    app.relaunch()
    app.exit(0)
  })

  ipcMain.handle('csvImport:pickAndImportUsers', async () => {
    const result = await dialog.showOpenDialog({
      title: '利用者情報.csv を選択',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return importUsersFromCsv(result.filePaths[0])
  })
  ipcMain.handle('csvImport:pickAndImportCertificates', async () => {
    const result = await dialog.showOpenDialog({
      title: '被保険者証情報.csv を選択',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return importCertificatesFromCsv(result.filePaths[0])
  })
}
