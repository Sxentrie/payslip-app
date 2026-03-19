/**
 * @file: src/main/ipc/export.ts
 *
 * @description:
 * IPC handler module for file export operations — coordinates save
 * dialogs, PDF/DOCX/XLSX generation, and Electron's native
 * printToPDF capability.
 *
 * @module: Main.IPC.Export
 *
 * @overview:
 * Registers six ipcMain.handle channels: dialog:saveFile exposes
 * the native save dialog, export:printPdf uses Electron's built-in
 * webContents.printToPDF for pixel-perfect output, and export:pdf,
 * export:docx, export:xlsx each fetch payslips by IDs via a shared
 * helper then delegate to the corresponding generator module. The
 * fetchPayslipsByIds helper validates and sanitises the incoming
 * ID array, performs the JOIN query, and deserialises the
 * custom_deductions JSON column before passing data downstream.
 *
 * @dependencies:
 * - electron
 * - src/shared/types.ts
 * - src/main/database.ts
 * - src/main/lib/pdf-generator.ts
 * - src/main/lib/docx-generator.ts
 * - src/main/lib/xlsx-generator.ts
 *
 * @outputs:
 * - registerExportHandlers (function)
 */

import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { FileFilter, PayslipWithDetails } from '../../shared/types'
import { getDatabase } from '../database'
import { generatePdf } from '../lib/pdf-generator'
import { generateDocx } from '../lib/docx-generator'
import { generateXlsx } from '../lib/xlsx-generator'

/**
 * Shared helper: fetch payslips by IDs with full JOIN.
 * Validates that payslipIds is a non-empty array of positive integers.
 */
function fetchPayslipsByIds(payslipIds: unknown): PayslipWithDetails[] {
  if (!Array.isArray(payslipIds) || payslipIds.length === 0) {
    throw new Error('payslipIds must be a non-empty array')
  }

  const sanitized = payslipIds.map((id) => {
    const n = Number(id)
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`Invalid payslip ID: ${id}`)
    }
    return n
  })

  const db = getDatabase()
  const placeholders = sanitized.map(() => '?').join(',')
  const results = db
    .prepare(
      `SELECT p.*, e.name as employee_name, b.name as branch_name
       FROM payslips p
       JOIN employees e ON p.employee_id = e.id
       JOIN branches b ON p.branch_id = b.id
       WHERE p.id IN (${placeholders})`
    )
    .all(...sanitized) as any[]

  return results.map((row) => {
    if (row.custom_deductions) {
      row.custom_deductions = JSON.parse(row.custom_deductions)
    } else {
      row.custom_deductions = []
    }
    return row
  }) as PayslipWithDetails[]
}

export function registerExportHandlers(): void {
  // Save file dialog
  ipcMain.handle(
    'dialog:saveFile',
    async (_, defaultName: string, filters: FileFilter[]): Promise<string | null> => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return null

      const result = await dialog.showSaveDialog(win, {
        defaultPath: defaultName,
        filters: filters.map((f) => ({ name: f.name, extensions: f.extensions }))
      })

      return result.canceled ? null : result.filePath || null
    }
  )

  // Print current view to PDF using Electron's built-in printToPDF
  ipcMain.handle('export:printPdf', async (): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) throw new Error('No active window')

    const result = await dialog.showSaveDialog(win, {
      defaultPath: 'payslips.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })

    if (result.canceled || !result.filePath) {
      return null // User cancelled — not an error
    }

    const pdfData = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: false,
      margins: {
        marginType: 'custom',
        top: 0.1,
        bottom: 0.1,
        left: 0.1,
        right: 0.1
      }
    })

    const { writeFileSync } = await import('fs')
    writeFileSync(result.filePath, pdfData)
    return result.filePath
  })

  ipcMain.handle('export:pdf', async (_, payslipIds: number[]): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) throw new Error('No active window')

    const result = await dialog.showSaveDialog(win, {
      defaultPath: 'payslips.pdf',
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    })

    if (result.canceled || !result.filePath) return null

    const payslips = fetchPayslipsByIds(payslipIds)
    await generatePdf(payslips, result.filePath)
    return result.filePath
  })

  ipcMain.handle('export:docx', async (_, payslipIds: number[]): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) throw new Error('No active window')

    const result = await dialog.showSaveDialog(win, {
      defaultPath: 'payslips.docx',
      filters: [{ name: 'Word Document', extensions: ['docx'] }]
    })

    if (result.canceled || !result.filePath) return null

    const payslips = fetchPayslipsByIds(payslipIds)
    await generateDocx(payslips, result.filePath)
    return result.filePath
  })

  ipcMain.handle('export:xlsx', async (_, payslipIds: number[]): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) throw new Error('No active window')

    const result = await dialog.showSaveDialog(win, {
      defaultPath: 'payslips.xlsx',
      filters: [{ name: 'Excel Spreadsheet', extensions: ['xlsx'] }]
    })

    if (result.canceled || !result.filePath) return null

    const payslips = fetchPayslipsByIds(payslipIds)
    await generateXlsx(payslips, result.filePath)
    return result.filePath
  })
}
