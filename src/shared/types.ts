/**
 * @file: src/shared/types.ts
 *
 * @description:
 * Central type registry defining every data shape and API contract used
 * across the main process, preload bridge, and renderer.
 *
 * @module: Shared.Types
 *
 * @overview:
 * This file acts as the single source of truth for all cross-process
 * type definitions. Every database entity (Branch, Employee, Payslip),
 * every IPC payload (PayslipInput, FileFilter), and the complete
 * PayslipAPI interface consumed by the preload bridge are declared
 * here. Keeping them co-located ensures compile-time safety whenever
 * a schema change propagates through the Electron IPC boundary.
 *
 * @dependencies:
 * - None
 *
 * @outputs:
 * - Branch (interface)
 * - DeductionType (interface)
 * - CustomDeduction (interface)
 * - Employee (interface)
 * - PayslipInput (interface)
 * - Payslip (interface)
 * - PayslipWithDetails (interface)
 * - FileFilter (interface)
 * - PayPeriod (interface)
 * - PayslipAPI (interface)
 */

// Shared types used across main, preload, and renderer

export interface Branch {
  id: number
  name: string
  created_at: string
}

export interface DeductionType {
  id: number
  name: string
}

export interface CustomDeduction {
  name: string
  amount: number
}

export interface Employee {
  id: number
  branch_id: number
  name: string
  position: string | null
  is_active: number
  created_at: string
}

export interface PayslipInput {
  employee_id: number
  branch_id: number
  pay_period_start: string
  pay_period_end: string
  daily_rate: number
  days_worked: number
  total_salary: number
  overtime: number
  custom_deductions: CustomDeduction[]
  others_note: string | null
  total_deductions: number
  net_salary: number
}

export interface Payslip extends PayslipInput {
  id: number
  created_at: string
}

export interface PayslipWithDetails extends Payslip {
  employee_name: string
  branch_name: string
}

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface PayPeriod {
  pay_period_start: string
  pay_period_end: string
  count: number
}

export interface PayslipAPI {
  // Branches
  getBranches(): Promise<Branch[]>
  updateBranch(data: { id: number; name: string }): Promise<Branch>

  // Employees
  getEmployeesByBranch(branchId: number): Promise<Employee[]>
  createEmployee(data: { branchId: number; name: string; position?: string }): Promise<Employee>
  updateEmployee(data: {
    id: number
    name?: string
    position?: string
    isActive?: boolean
  }): Promise<Employee>
  deleteEmployee(id: number): Promise<void>

  // Payslips
  createPayslip(data: PayslipInput): Promise<Payslip>
  getPayslipsByBranch(
    branchId: number | null,
    periodStart?: string,
    periodEnd?: string
  ): Promise<PayslipWithDetails[]>
  getPayslipById(id: number): Promise<PayslipWithDetails>
  deletePayslip(id: number): Promise<void>
  getBatchForPrint(
    branchId: number,
    periodStart: string,
    periodEnd: string
  ): Promise<PayslipWithDetails[]>
  getDistinctPeriods(branchId: number): Promise<PayPeriod[]>

  // Export
  exportPdf(payslipIds: number[]): Promise<string | null>
  printViewToPdf(): Promise<string | null>
  exportDocx(payslipIds: number[]): Promise<string | null>
  exportXlsx(payslipIds: number[]): Promise<string | null>

  // Dialog
  saveFileDialog(defaultName: string, filters: FileFilter[]): Promise<string | null>

  // Settings
  clearAllData(): Promise<void>

  // Deductions
  getDeductionTypes(): Promise<DeductionType[]>
  createDeductionType(name: string): Promise<DeductionType>
  deleteDeductionType(id: number): Promise<void>
}
