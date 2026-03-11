/**
 * @file: src/main/ipc/deductions.ts
 *
 * @description:
 * IPC handler module for deduction type management — listing,
 * creating, and deleting the configurable deduction categories.
 *
 * @module: Main.IPC.Deductions
 *
 * @overview:
 * Registers three ipcMain.handle channels for the deduction_types
 * table. deductions:getAll returns all types ordered by creation
 * date. deductions:create validates uniqueness case-insensitively
 * before inserting. deductions:delete removes a type by ID. These
 * types drive the dynamic deduction fields on the New Payslip
 * form and the management list on the Settings page.
 *
 * @dependencies:
 * - electron
 * - src/main/database.ts
 * - src/shared/types.ts
 *
 * @outputs:
 * - registerDeductionHandlers (function)
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import type { DeductionType } from '../../shared/types'

export function registerDeductionHandlers(): void {
  ipcMain.handle('deductions:getAll', (): DeductionType[] => {
    const db = getDatabase()
    return db
      .prepare('SELECT * FROM deduction_types ORDER BY created_at ASC')
      .all() as DeductionType[]
  })

  ipcMain.handle('deductions:create', (_, name: string): DeductionType => {
    const db = getDatabase()
    if (!name || name.trim() === '') {
      throw new Error('Deduction name is required')
    }
    
    // Check if exists (case insensitive)
    const exists = db
      .prepare('SELECT id FROM deduction_types WHERE LOWER(name) = ?')
      .get(name.trim().toLowerCase())
    if (exists) {
      throw new Error(`Deduction type "${name.trim()}" already exists`)
    }

    const result = db
      .prepare('INSERT INTO deduction_types (name) VALUES (?)')
      .run(name.trim())
      
    return db
      .prepare('SELECT * FROM deduction_types WHERE id = ?')
      .get(result.lastInsertRowid) as DeductionType
  })

  ipcMain.handle('deductions:delete', (_, id: number): void => {
    const db = getDatabase()
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid deduction ID')
    }
    db.prepare('DELETE FROM deduction_types WHERE id = ?').run(id)
  })
}
