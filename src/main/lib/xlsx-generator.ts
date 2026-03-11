/**
 * @file: src/main/lib/xlsx-generator.ts
 *
 * @description:
 * Generates a styled Excel spreadsheet from an array of payslip
 * records using the ExcelJS library.
 *
 * @module: Main.Lib.XlsxGenerator
 *
 * @overview:
 * Creates a single-sheet workbook with a header row and one data
 * row per payslip. Currency columns (rate, overtime, salary,
 * deductions, net) are formatted with the Philippine Peso symbol.
 * The header row receives bold text, centered alignment, and a
 * light-grey fill. The worksheet is configured for landscape A4
 * printing. The final workbook is written to disk via ExcelJS's
 * built-in writeFile method.
 *
 * @dependencies:
 * - exceljs
 * - src/shared/types.ts
 * - src/shared/calculations.ts
 *
 * @outputs:
 * - generateXlsx (async function)
 */

import ExcelJS from 'exceljs'
import type { PayslipWithDetails } from '../../shared/types'
import { formatDate } from '../../shared/calculations'

export async function generateXlsx(payslips: PayslipWithDetails[], filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Payslip App'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Payslips', {
    pageSetup: { paperSize: 9, orientation: 'landscape' }
  })

  sheet.columns = [
    { header: 'Employee Name', key: 'employee', width: 25 },
    { header: 'Branch', key: 'branch', width: 20 },
    { header: 'Period Start', key: 'start', width: 15 },
    { header: 'Period End', key: 'end', width: 15 },
    { header: 'Rate per Shift', key: 'rate', width: 15 },
    { header: 'Shifts', key: 'days', width: 15 },
    { header: 'Overtime', key: 'overtime', width: 15 },
    { header: 'Total Salary', key: 'salary', width: 20 },
    { header: 'Others Note', key: 'note', width: 25 },
    { header: 'Total Deductions', key: 'deductions', width: 20 },
    { header: 'Net Salary', key: 'net', width: 25 }
  ]

  // Style header row
  sheet.getRow(1).font = { bold: true, size: 12 }
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }

  for (const p of payslips) {
    sheet.addRow({
      employee: p.employee_name,
      branch: p.branch_name,
      start: formatDate(p.pay_period_start),
      end: formatDate(p.pay_period_end),
      rate: p.daily_rate,
      days: p.days_worked,
      overtime: p.overtime,
      salary: p.total_salary,
      note: p.others_note || '',
      deductions: p.total_deductions,
      net: p.net_salary
    })
  }

  // Format currency columns using column keys (resilient to column reordering)
  const currencyKeys = ['rate', 'overtime', 'salary', 'deductions', 'net']
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      currencyKeys.forEach((key) => {
        const col = sheet.getColumn(key)
        if (col) {
          row.getCell(col.number).numFmt = '₱#,##0.00'
        }
      })
      const netCol = sheet.getColumn('net')
      if (netCol) {
        row.getCell(netCol.number).font = { bold: true }
      }
    }
  })

  await workbook.xlsx.writeFile(filePath)
}
