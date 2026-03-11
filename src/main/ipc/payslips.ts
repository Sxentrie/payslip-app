/**
 * @file: src/main/ipc/payslips.ts
 *
 * @description:
 * IPC handler module for payslip CRUD, batch retrieval, and
 * distinct pay-period queries.
 *
 * @module: Main.IPC.Payslips
 *
 * @overview:
 * Registers five ipcMain.handle channels that cover the complete
 * payslip data lifecycle. payslips:create validates the incoming
 * PayslipInput, serialises custom_deductions to JSON, and inserts
 * inside a transaction. payslips:getByBranch supports optional
 * branch and date-range filters for the log view.
 * payslips:getBatchForPrint returns a filtered set ordered by
 * employee name for the print layout. payslips:getDistinctPeriods
 * powers the period-selector dropdown by grouping start/end dates.
 * Every channel deserialises the custom_deductions JSON column
 * before returning results to the renderer.
 *
 * @dependencies:
 * - electron
 * - src/main/database.ts
 * - src/shared/types.ts
 *
 * @outputs:
 * - registerPayslipHandlers (function)
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import type { Payslip, PayslipInput, PayslipWithDetails } from '../../shared/types'

export function registerPayslipHandlers(): void {
  ipcMain.handle('payslips:create', (_, data: PayslipInput): Payslip => {
    const db = getDatabase()

    // Input validation
    if (!data) throw new Error('Payslip data is required')
    if (typeof data.employee_id !== 'number' || !Number.isInteger(data.employee_id) || data.employee_id <= 0) {
      throw new Error('Invalid employee ID')
    }
    if (typeof data.branch_id !== 'number' || !Number.isInteger(data.branch_id) || data.branch_id <= 0) {
      throw new Error('Invalid branch ID')
    }
    if (typeof data.daily_rate !== 'number' || data.daily_rate <= 0) {
      throw new Error('Daily rate must be greater than 0')
    }
    if (typeof data.days_worked !== 'number' || data.days_worked <= 0) {
      throw new Error('Days worked must be greater than 0')
    }
    if (!data.pay_period_start || !data.pay_period_end) {
      throw new Error('Pay period start and end are required')
    }

    if (!Array.isArray(data.custom_deductions)) {
      throw new Error('custom_deductions must be an array')
    }

    // Duplicate payslip guard — prevent double-payment for the same employee+period
    const existing = db
      .prepare(
        `SELECT p.id, e.name as employee_name
         FROM payslips p
         JOIN employees e ON p.employee_id = e.id
         WHERE p.employee_id = ? AND p.pay_period_start = ? AND p.pay_period_end = ?
         LIMIT 1`
      )
      .get(data.employee_id, data.pay_period_start, data.pay_period_end) as
      | { id: number; employee_name: string }
      | undefined

    if (existing) {
      throw new Error(
        `A payslip for ${existing.employee_name} already exists for ${data.pay_period_start} — ${data.pay_period_end}. Delete the existing payslip first if you need to re-create it.`
      )
    }

    const customDeductionsJson = JSON.stringify(data.custom_deductions)

    const createPayslipTransaction = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO payslips (
            employee_id, branch_id, pay_period_start, pay_period_end,
            daily_rate, days_worked, overtime, total_salary,
            custom_deductions,
            total_deductions, net_salary
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.employee_id,
          data.branch_id,
          data.pay_period_start,
          data.pay_period_end,
          data.daily_rate,
          data.days_worked,
          data.overtime,
          data.total_salary,
          customDeductionsJson,
          data.total_deductions,
          data.net_salary
        )
      const record = db
        .prepare('SELECT * FROM payslips WHERE id = ?')
        .get(result.lastInsertRowid) as any
        
      record.custom_deductions = record.custom_deductions ? JSON.parse(record.custom_deductions) : []
      return record as Payslip
    })
    
    return createPayslipTransaction()
  })

  ipcMain.handle(
    'payslips:getByBranch',
    (
      _,
      branchId: number | null,
      periodStart?: string,
      periodEnd?: string
    ): PayslipWithDetails[] => {
      const db = getDatabase()

      // Validate branchId if provided
      if (branchId !== null && (typeof branchId !== 'number' || !Number.isInteger(branchId) || branchId <= 0)) {
        throw new Error('Invalid branch ID')
      }

      let query = `
        SELECT p.*, e.name as employee_name, b.name as branch_name
        FROM payslips p
        JOIN employees e ON p.employee_id = e.id
        JOIN branches b ON p.branch_id = b.id
      `
      
      const params: (string | number)[] = []
      const conditions: string[] = []

      if (branchId !== null) {
        conditions.push('p.branch_id = ?')
        params.push(branchId)
      }
      if (periodStart) {
        conditions.push('p.pay_period_start >= ?')
        params.push(periodStart)
      }
      if (periodEnd) {
        conditions.push('p.pay_period_end <= ?')
        params.push(periodEnd)
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }

      query += ' ORDER BY p.created_at DESC'

      const results = db.prepare(query).all(...params) as any[]
      
      return results.map(row => {
        if (row.custom_deductions) {
          row.custom_deductions = JSON.parse(row.custom_deductions)
        } else {
          row.custom_deductions = []
        }
        return row
      }) as PayslipWithDetails[]
    }
  )

  ipcMain.handle('payslips:getById', (_, id: number): PayslipWithDetails => {
    const db = getDatabase()

    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid payslip ID')
    }

    const payslip = db
      .prepare(
        `SELECT p.*, e.name as employee_name, b.name as branch_name
         FROM payslips p
         JOIN employees e ON p.employee_id = e.id
         JOIN branches b ON p.branch_id = b.id
         WHERE p.id = ?`
      )
      .get(id) as any
    if (!payslip) throw new Error(`Payslip ${id} not found`)
    
    if (payslip.custom_deductions) {
      payslip.custom_deductions = JSON.parse(payslip.custom_deductions)
    } else {
      payslip.custom_deductions = []
    }
    
    return payslip as PayslipWithDetails
  })

  ipcMain.handle('payslips:delete', (_, id: number): void => {
    const db = getDatabase()

    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid payslip ID')
    }

    db.prepare('DELETE FROM payslips WHERE id = ?').run(id)
  })

  ipcMain.handle(
    'payslips:getBatchForPrint',
    (_, branchId: number, periodStart: string, periodEnd: string): PayslipWithDetails[] => {
      const db = getDatabase()

      if (typeof branchId !== 'number' || !Number.isInteger(branchId) || branchId <= 0) {
        throw new Error('Invalid branch ID')
      }
      if (!periodStart || !periodEnd) {
        throw new Error('Period start and end are required')
      }

      const results = db
        .prepare(
          `SELECT p.*, e.name as employee_name, b.name as branch_name
           FROM payslips p
           JOIN employees e ON p.employee_id = e.id
           JOIN branches b ON p.branch_id = b.id
           WHERE p.branch_id = ?
             AND p.pay_period_start >= ?
             AND p.pay_period_end <= ?
           ORDER BY e.name`
        )
        .all(branchId, periodStart, periodEnd) as any[]
        
      return results.map(row => {
        if (row.custom_deductions) {
          row.custom_deductions = JSON.parse(row.custom_deductions)
        } else {
          row.custom_deductions = []
        }
        return row
      }) as PayslipWithDetails[]
    }
  )

  ipcMain.handle('payslips:getDistinctPeriods', (_, branchId: number) => {
    const db = getDatabase()

    if (typeof branchId !== 'number' || !Number.isInteger(branchId) || branchId <= 0) {
      throw new Error('Invalid branch ID')
    }

    return db
      .prepare(
        `SELECT pay_period_start, pay_period_end, COUNT(*) as count
         FROM payslips
         WHERE branch_id = ?
         GROUP BY pay_period_start, pay_period_end
         ORDER BY pay_period_start DESC`
      )
      .all(branchId) as { pay_period_start: string; pay_period_end: string; count: number }[]
  })
}
