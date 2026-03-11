/**
 * @file: src/main/lib/pdf-generator.ts
 *
 * @description:
 * Generates a tabular PDF report from an array of payslip records
 * using jsPDF and jspdf-autotable.
 *
 * @module: Main.Lib.PdfGenerator
 *
 * @overview:
 * Accepts a PayslipWithDetails array and a target file path, then
 * builds a single-page (or multi-page) PDF with a styled header
 * and an auto-table containing one row per payslip. Columns cover
 * employee name, branch, period, rate, shifts, overtime, gross,
 * deductions, and net salary. The final PDF buffer is written
 * synchronously to disk via fs.writeFileSync.
 *
 * @dependencies:
 * - jspdf
 * - jspdf-autotable
 * - fs
 * - src/shared/types.ts
 * - src/shared/calculations.ts
 *
 * @outputs:
 * - generatePdf (async function)
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PayslipWithDetails } from '../../shared/types'
import { formatCurrency, formatDate } from '../../shared/calculations'
import { writeFileSync } from 'fs'

export async function generatePdf(payslips: PayslipWithDetails[], filePath: string): Promise<void> {
  const doc = new jsPDF()
  
  doc.setFontSize(18)
  doc.text('Payslips Report', 8, 14)
  doc.setFontSize(11)
  doc.text(`Generated on: ${formatDate(new Date().toISOString().split('T')[0])}`, 8, 22)

  const bodyData = payslips.map(p => [
    p.employee_name,
    p.branch_name,
    `${formatDate(p.pay_period_start)} - ${formatDate(p.pay_period_end)}`,
    formatCurrency(p.daily_rate),
    p.days_worked.toString(),
    formatCurrency(p.overtime),
    formatCurrency(p.total_salary),
    formatCurrency(p.total_deductions),
    formatCurrency(p.net_salary)
  ])

  // Use autoTable as a standalone function (reliable in ESM/electron-vite)
  autoTable(doc, {
    startY: 28,
    margin: { top: 8, right: 8, bottom: 8, left: 8 },
    head: [['Employee', 'Branch', 'Period', 'Rate', 'Shifts', 'Overtime', 'Gross', 'Ded.', 'Net']],
    body: bodyData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] }
  })

  const buffer = Buffer.from(doc.output('arraybuffer'))
  writeFileSync(filePath, buffer)
}
