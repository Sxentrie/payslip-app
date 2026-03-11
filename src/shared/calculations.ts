/**
 * @file: src/shared/calculations.ts
 *
 * @description:
 * Pure calculation and formatting utilities shared by the main process
 * export generators and the renderer UI layer.
 *
 * @module: Shared.Calculations
 *
 * @overview:
 * This module centralises every arithmetic and formatting function the
 * application needs. The main process generators (PDF, DOCX, XLSX)
 * import these to format payslip values identically to the renderer,
 * guaranteeing numeric consistency between on-screen display and
 * exported documents. All functions are side-effect-free and operate
 * solely on their inputs.
 *
 * @dependencies:
 * - None
 *
 * @outputs:
 * - CustomDeduction (interface)
 * - PayslipCalcInput (interface)
 * - PayslipCalcResult (interface)
 * - calculatePayslip (function)
 * - roundTo2 (function)
 * - formatCurrency (function)
 * - formatDate (function)
 */

// Shared calculation utilities — used by both main process (generators) and renderer (UI)

import type { CustomDeduction } from './types'
export type { CustomDeduction }

export interface PayslipCalcInput {
  daily_rate: number
  days_worked: number
  overtime: number
  custom_deductions: CustomDeduction[]
}

export interface PayslipCalcResult {
  total_salary: number
  total_deductions: number
  net_salary: number
}

const safeNum = (val: any) => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

export function calculatePayslip(input: PayslipCalcInput): PayslipCalcResult {
  const daily_rate = safeNum(input.daily_rate);
  const days_worked = safeNum(input.days_worked);
  const overtime = safeNum(input.overtime);

  const total_salary = roundTo2((daily_rate * days_worked) + overtime);

  const deductions_sum = (input.custom_deductions || []).reduce(
    (acc, d) => acc + safeNum(d.amount),
    0
  );

  const total_deductions = roundTo2(deductions_sum);
  const net_salary = roundTo2(total_salary - total_deductions);

  return { total_salary, total_deductions, net_salary };
}

export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
