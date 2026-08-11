import { contextBridge, ipcRenderer } from 'electron'
import type { IpcApi } from '../shared/types/ipc'

const api: IpcApi = {
  getAppStatus: () => ipcRenderer.invoke('app:getStatus'),

  departments: {
    list: (opts) => ipcRenderer.invoke('departments:list', opts),
    create: (input) => ipcRenderer.invoke('departments:create', input),
    update: (id, input) => ipcRenderer.invoke('departments:update', id, input),
    setActive: (id, isActive) => ipcRenderer.invoke('departments:setActive', id, isActive)
  },

  destinations: {
    list: (opts) => ipcRenderer.invoke('destinations:list', opts),
    create: (input) => ipcRenderer.invoke('destinations:create', input),
    update: (id, input) => ipcRenderer.invoke('destinations:update', id, input),
    setActive: (id, isActive) => ipcRenderer.invoke('destinations:setActive', id, isActive)
  },

  drivers: {
    list: (opts) => ipcRenderer.invoke('drivers:list', opts),
    create: (input) => ipcRenderer.invoke('drivers:create', input),
    update: (id, input) => ipcRenderer.invoke('drivers:update', id, input),
    setActive: (id, isActive) => ipcRenderer.invoke('drivers:setActive', id, isActive)
  },

  users: {
    list: (opts) => ipcRenderer.invoke('users:list', opts),
    get: (id) => ipcRenderer.invoke('users:get', id),
    create: (input) => ipcRenderer.invoke('users:create', input),
    update: (id, input) => ipcRenderer.invoke('users:update', id, input),
    softDelete: (id) => ipcRenderer.invoke('users:softDelete', id),
    listCertificates: (userId) => ipcRenderer.invoke('users:listCertificates', userId),
    addCertificate: (input) => ipcRenderer.invoke('users:addCertificate', input)
  },

  requests: {
    list: (opts) => ipcRenderer.invoke('requests:list', opts),
    get: (id) => ipcRenderer.invoke('requests:get', id),
    create: (input) => ipcRenderer.invoke('requests:create', input),
    update: (id, input) => ipcRenderer.invoke('requests:update', id, input),
    remove: (id) => ipcRenderer.invoke('requests:remove', id),
    createRecurring: (input) => ipcRenderer.invoke('requests:createRecurring', input),
    deleteRecurringGroup: (groupId) =>
      ipcRenderer.invoke('requests:deleteRecurringGroup', groupId)
  },

  results: {
    listStatusForDate: (date) => ipcRenderer.invoke('results:listStatusForDate', date),
    get: (id) => ipcRenderer.invoke('results:get', id),
    createDraftForRequest: (requestId) =>
      ipcRenderer.invoke('results:createDraftForRequest', requestId),
    createDraftsForDate: (date) => ipcRenderer.invoke('results:createDraftsForDate', date),
    update: (id, input) => ipcRenderer.invoke('results:update', id, input),
    remove: (id) => ipcRenderer.invoke('results:remove', id)
  },

  print: {
    previewDailySchedule: (date) => ipcRenderer.invoke('print:previewDailySchedule', date)
  },

  servicePrices: {
    list: (opts) => ipcRenderer.invoke('servicePrices:list', opts),
    get: (id) => ipcRenderer.invoke('servicePrices:get', id),
    create: (input) => ipcRenderer.invoke('servicePrices:create', input),
    update: (id, input) => ipcRenderer.invoke('servicePrices:update', id, input),
    remove: (id) => ipcRenderer.invoke('servicePrices:remove', id),
    generateTiers: (params) => ipcRenderer.invoke('servicePrices:generateTiers', params),
    findFee: (params) => ipcRenderer.invoke('servicePrices:findFee', params)
  },

  specialTransportRates: {
    list: () => ipcRenderer.invoke('specialTransportRates:list'),
    get: (id) => ipcRenderer.invoke('specialTransportRates:get', id),
    create: (input) => ipcRenderer.invoke('specialTransportRates:create', input),
    update: (id, input) => ipcRenderer.invoke('specialTransportRates:update', id, input),
    remove: (id) => ipcRenderer.invoke('specialTransportRates:remove', id),
    findRate: (params) => ipcRenderer.invoke('specialTransportRates:findRate', params)
  }
}

contextBridge.exposeInMainWorld('api', api)
