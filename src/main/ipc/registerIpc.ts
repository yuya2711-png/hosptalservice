import { ipcMain } from 'electron'
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
import {
  createRevision,
  deleteRevision,
  findFeeForMinutes,
  generateTiers,
  getRevisionDetail,
  listRevisions,
  updateRevision
} from '../db/repositories/servicePriceRepository'

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
}
