/**
 * @file: src/main/ipc/employees.ts
 *
 * @description:
 * IPC handler module for employee CRUD — listing by branch,
 * creating, updating, and soft-deleting employee records.
 *
 * @module: Main.IPC.Employees
 *
 * @overview:
 * Registers four ipcMain.handle channels covering the full
 * employee lifecycle. Create and update operations run inside
 * better-sqlite3 transactions for atomicity. Deletion is a soft
 * operation (sets is_active = 0) so existing payslips referencing
 * the employee remain intact. Every handler validates its input
 * and throws on malformed data.
 *
 * @dependencies:
 * - electron
 * - src/main/database.ts
 * - src/shared/types.ts
 *
 * @outputs:
 * - registerEmployeeHandlers (function)
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import type { Employee } from '../../shared/types'

export function registerEmployeeHandlers(): void {
  ipcMain.handle('employees:getByBranch', (_, branchId: number): Employee[] => {
    const db = getDatabase()

    if (typeof branchId !== 'number' || !Number.isInteger(branchId) || branchId <= 0) {
      throw new Error('Invalid branch ID')
    }

    return db
      .prepare('SELECT * FROM employees WHERE branch_id = ? AND is_active = 1 ORDER BY name')
      .all(branchId) as Employee[]
  })

  ipcMain.handle(
    'employees:create',
    (_, data: { branchId: number; name: string; position?: string }): Employee => {
      const db = getDatabase()

      // Input validation
      if (!data || typeof data.branchId !== 'number' || !Number.isInteger(data.branchId) || data.branchId <= 0) {
        throw new Error('Invalid branch ID')
      }
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        throw new Error('Employee name cannot be empty')
      }

      const trimmedName = data.name.trim()
      const position = data.position?.trim() || null

      const createEmployeeTransaction = db.transaction(() => {
        const result = db
          .prepare('INSERT INTO employees (branch_id, name, position) VALUES (?, ?, ?)')
          .run(data.branchId, trimmedName, position)
        return db
          .prepare('SELECT * FROM employees WHERE id = ?')
          .get(result.lastInsertRowid) as Employee
      })
      
      return createEmployeeTransaction()
    }
  )

  ipcMain.handle(
    'employees:update',
    (_, data: { id: number; name?: string; position?: string; isActive?: boolean }): Employee => {
      const db = getDatabase()

      if (!data || typeof data.id !== 'number' || !Number.isInteger(data.id) || data.id <= 0) {
        throw new Error('Invalid employee ID')
      }

      const current = db.prepare('SELECT * FROM employees WHERE id = ?').get(data.id) as Employee
      if (!current) throw new Error(`Employee ${data.id} not found`)

      const name = data.name?.trim() || current.name
      const position = data.position !== undefined ? (data.position?.trim() || null) : current.position
      const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : current.is_active

      const updateEmployeeTransaction = db.transaction(() => {
        db.prepare('UPDATE employees SET name = ?, position = ?, is_active = ? WHERE id = ?').run(
          name,
          position,
          isActive,
          data.id
        )
        return db.prepare('SELECT * FROM employees WHERE id = ?').get(data.id) as Employee
      })
      
      return updateEmployeeTransaction()
    }
  )

  ipcMain.handle('employees:delete', (_, id: number): void => {
    const db = getDatabase()

    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid employee ID')
    }

    // Soft delete — set is_active to 0
    db.prepare('UPDATE employees SET is_active = 0 WHERE id = ?').run(id)
  })
}
