/**
 * @file: src/main/index.ts
 *
 * @description:
 * Electron main-process entry point — bootstraps the application
 * window, initialises the SQLite database, and registers every IPC
 * handler module.
 *
 * @module: Main.Entry
 *
 * @overview:
 * This is the first code that runs when the packaged Electron app
 * launches. It orchestrates the full startup sequence: enabling
 * remote-debugging for E2E tests (when NODE_ENV=test), configuring
 * the BrowserWindow with secure webPreferences (contextIsolation,
 * sandbox disabled for native module access), initialising the
 * database singleton, and wiring up all six IPC handler families.
 * Graceful shutdown is handled by closing the database on every
 * relevant process signal (will-quit, exit, SIGINT, SIGTERM).
 *
 * @dependencies:
 * - electron
 * - path
 * - @electron-toolkit/utils
 * - src/main/database.ts
 * - src/main/ipc/branches.ts
 * - src/main/ipc/employees.ts
 * - src/main/ipc/payslips.ts
 * - src/main/ipc/export.ts
 * - src/main/ipc/settings.ts
 * - src/main/ipc/deductions.ts
 *
 * @outputs:
 * - None (side-effect-only entry point)
 */

import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getDatabase, closeDatabase } from './database'
import { registerBranchHandlers } from './ipc/branches'
import { registerEmployeeHandlers } from './ipc/employees'
import { registerPayslipHandlers } from './ipc/payslips'
import { registerExportHandlers } from './ipc/export'
import { registerSettingsHandlers } from './ipc/settings'
import { registerDeductionHandlers } from './ipc/deductions'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Enable remote debugging port for Playwright E2E tests via connectOverCDP
// MUST be called before app is ready
if (process.env.NODE_ENV === 'test') {
  app.commandLine.appendSwitch('remote-debugging-port', '0')
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.payslip-app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database
  getDatabase()

  // Register all IPC handlers
  registerBranchHandlers()
  registerEmployeeHandlers()
  registerPayslipHandlers()
  registerExportHandlers()
  registerSettingsHandlers()
  registerDeductionHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  closeDatabase()
})

process.on('exit', () => {
  closeDatabase()
})

process.on('SIGINT', () => {
  closeDatabase()
  process.exit(0)
})

process.on('SIGTERM', () => {
  closeDatabase()
  process.exit(0)
})
