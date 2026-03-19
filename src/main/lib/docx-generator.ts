/**
 * @file: src/main/lib/docx-generator.ts
 *
 * @description:
 * Generates a multi-page Microsoft Word document containing one
 * formatted payslip table per employee record.
 *
 * @module: Main.Lib.DocxGenerator
 *
 * @overview:
 * Iterates the supplied PayslipWithDetails array and, for each
 * record, builds a DOCX section with a heading, employee/period
 * metadata paragraphs, and a two-column Earnings/Deductions table
 * mirroring the print layout. A full-width Net Salary row spans
 * the bottom of each table. Page breaks separate employees. The
 * final buffer is packed via docx's Packer.toBuffer and written
 * synchronously to disk.
 *
 * @dependencies:
 * - docx
 * - fs
 * - src/shared/types.ts
 * - src/shared/calculations.ts
 *
 * @outputs:
 * - generateDocx (async function)
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  BorderStyle
} from 'docx'
import { writeFileSync } from 'fs'
import type { PayslipWithDetails } from '../../shared/types'
import { formatCurrency, formatDate } from '../../shared/calculations'

export async function generateDocx(
  payslips: PayslipWithDetails[],
  filePath: string
): Promise<void> {
  const children: any[] = []

  for (let i = 0; i < payslips.length; i++) {
    const p = payslips[i]

    // Header
    children.push(
      new Paragraph({
        text: `${p.branch_name} — Payslip`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 120 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Employee: `, bold: true }), new TextRun(p.employee_name)]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Period: `, bold: true }),
          new TextRun(`${formatDate(p.pay_period_start)} to ${formatDate(p.pay_period_end)}`)
        ],
        spacing: { after: 200 }
      })
    )

    // Table
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Earnings', style: 'Strong' })],
              width: { size: 50, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ text: 'Deductions', style: 'Strong' })],
              width: { size: 50, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph(`Rate per Shift: ${formatCurrency(p.daily_rate)}`),
                new Paragraph(`Shifts: ${p.days_worked}`),
                new Paragraph(`Overtime: ${formatCurrency(p.overtime)}`),
                new Paragraph({
                  text: `TOTAL: ${formatCurrency(p.total_salary)}`,
                  style: 'Strong',
                  spacing: { before: 100 }
                })
              ]
            }),
            new TableCell({
              children: [
                ...(p.custom_deductions
                  ? p.custom_deductions.map(
                      (d) => new Paragraph(`${d.name}: ${formatCurrency(d.amount)}`)
                    )
                  : []),
                ...(p.others_note ? [new Paragraph(`Note: ${p.others_note}`)] : []),
                new Paragraph({
                  text: `TOTAL: ${formatCurrency(p.total_deductions)}`,
                  style: 'Strong',
                  spacing: { before: 100 }
                })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'NET SALARY: ', bold: true, size: 28 }),
                    new TextRun({ text: formatCurrency(p.net_salary), bold: true, size: 28 })
                  ],
                  alignment: 'right'
                })
              ]
            })
          ]
        })
      ]
    })

    children.push(table)

    // Page break between employees, unless it's the last one
    if (i < payslips.length - 1) {
      children.push(new Paragraph({ pageBreakBefore: true }))
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children
      }
    ]
  })

  const buffer = await Packer.toBuffer(doc)
  writeFileSync(filePath, buffer)
}
