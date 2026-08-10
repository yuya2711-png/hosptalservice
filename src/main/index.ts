import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { runMigrations } from './db/migrate'
import { backupDatabaseIfNeeded } from './db/backup'
import { getDbPath } from './db/connection'
import { registerIpc } from './ipc/registerIpc'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const migrationResult = runMigrations()
  console.log('[db] migration result =>', migrationResult)

  const backupResult = backupDatabaseIfNeeded()
  console.log('[db] backup =>', backupResult)

  ipcMain.handle('app:getStatus', () => ({
    appVersion: app.getVersion(),
    dbPath: getDbPath(),
    schemaVersion: migrationResult.currentVersion,
    lastBackup: backupResult
  }))

  registerIpc()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
