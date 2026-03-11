/**
 * @file: src/renderer/src/components/PrintLayout.tsx
 *
 * @description:
 * Print-optimized payslip grid component that chunks payslips into
 * A4-sized pages with dynamic font scaling.
 *
 * @module: Renderer.Components.PrintLayout
 *
 * @overview:
 * Receives an array of PayslipWithDetails and renders them in a
 * 3×3 grid layout (up to 9 payslips per A4 page). Dynamically
 * adjusts font size based on the number of custom deductions to
 * prevent overflow. Each payslip cell displays employee name,
 * branch, period, earnings breakdown (rate, shifts, overtime),
 * deductions (itemised custom deductions with amounts), and net
 * salary. Page breaks between full pages are handled via CSS.
 * Used exclusively by PrintPreview.tsx for both screen preview
 * and physical printing.
 *
 * @dependencies:
 * - react
 * - src/shared/types.ts
 * - src/shared/calculations.ts
 *
 * @outputs:
 * - default (PrintLayout component)
 */

import type { PayslipWithDetails } from '../../../shared/types'
import { formatCurrency } from '@/lib/calculations'

interface PrintLayoutProps {
  payslips: PayslipWithDetails[]
}

/** Maximum payslips per A4 page (3 columns × 3 rows) */
const MAX_PER_PAGE = 9

export default function PrintLayout({ payslips }: PrintLayoutProps) {
  if (!payslips || payslips.length === 0) {
    return null
  }

  // Chunk payslips into pages of MAX_PER_PAGE
  const pages: PayslipWithDetails[][] = []
  for (let i = 0; i < payslips.length; i += MAX_PER_PAGE) {
    pages.push(payslips.slice(i, i + MAX_PER_PAGE))
  }

  return (
    <div className="print-container">
      {pages.map((pagePayslips, pageIndex) => {
        // Calculate font size dynamically based on payslip count on THIS page
        // With 3 columns, font sizes need to be slightly smaller to fit
        let fontSizeClass = 'text-[7.5pt]'
        if (pagePayslips.length <= 3) fontSizeClass = 'text-[9pt]'
        else if (pagePayslips.length <= 6) fontSizeClass = 'text-[8pt]'

        // To ensure the page always fills A4 height even with 1 payslip, 
        // we use a min-h screen/a4 approach on the page wrapper
        return (
          <div
            key={pageIndex}
            className={`w-full min-h-[297mm] bg-white text-black font-sans leading-relaxed ${fontSizeClass}`}
            style={{
              pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto'
            }}
          >
            <div className="grid grid-cols-3 h-full content-start">
              {pagePayslips.map((payslip, index) => {
                const isRightmostCol = (index + 1) % 3 === 0

                return (
                  <div
                    key={payslip.id}
                    className={`relative p-[1.5em] flex flex-col border-b border-dashed border-gray-400 ${
                      !isRightmostCol ? 'border-r' : ''
                    }`}
                    style={{
                      pageBreakInside: 'avoid',
                      minHeight: '96mm'
                    }}
                  >

                    {/* Header Section */}
                    <div className="flex flex-col mb-[1em] shrink-0">
                      <div className="flex justify-between items-end border-b-2 border-black pb-[0.5em] mb-[0.5em] pt-[0.25em]">
                        <div>
                          <h1 className="font-black text-[1.4em] uppercase tracking-wider leading-none">{payslip.branch_name}</h1>
                          <p className="text-[0.65em] font-bold text-gray-600 tracking-widest uppercase mt-[0.5em]">Official Payslip</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.65em] font-bold text-gray-600 tracking-widest uppercase mb-[0.25em]">Pay Period</p>
                          <p className="text-[0.65em] font-mono font-semibold whitespace-nowrap">
                            {payslip.pay_period_start} <span className="text-gray-400 mx-[0.15em]">—</span> {payslip.pay_period_end}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-[0.5em] mt-[0.25em] px-[0.25em]">
                        <span className="text-[0.65em] font-bold text-gray-500 uppercase tracking-widest shrink-0">Employee</span>
                        <span className="font-extrabold text-[0.9em] uppercase truncate">{payslip.employee_name}</span>
                      </div>
                    </div>

                    {/* Earnings & Deductions Grid */}
                    <div className="border border-gray-800 mb-[1em] grow flex flex-col">
                      {/* Table Header */}
                      <div className="grid grid-cols-2 border-b border-gray-800 text-[0.65em] font-bold uppercase tracking-widest">
                        <div className="p-[0.75em] border-r border-gray-800 text-center">Earnings</div>
                        <div className="p-[0.75em] text-center">Deductions</div>
                      </div>

                      {/* Table Body */}
                      <div className="grid grid-cols-2 text-[0.65em] grow items-start">
                        {/* Earnings Column */}
                        <div className="border-r border-gray-800 p-[0.6em] flex flex-col gap-[0.4em] h-full">
                          <div className="flex justify-between items-center gap-1 w-full whitespace-nowrap">
                            <span className="text-gray-700 font-medium truncate">Daily Rate</span>
                            <span className="font-mono font-medium shrink-0">{formatCurrency(payslip.daily_rate)}</span>
                          </div>
                          <div className="flex justify-between items-center gap-1 w-full whitespace-nowrap">
                            <span className="text-gray-700 font-medium truncate">Days Worked</span>
                            <span className="font-mono font-medium shrink-0">{payslip.days_worked}</span>
                          </div>
                          {payslip.overtime > 0 && (
                            <div className="flex justify-between items-center gap-1 w-full whitespace-nowrap">
                              <span className="text-gray-700 font-medium truncate">Overtime</span>
                              <span className="font-mono font-medium shrink-0">{formatCurrency(payslip.overtime)}</span>
                            </div>
                          )}
                        </div>

                        {/* Deductions Column */}
                        <div className="p-[0.6em] flex flex-col gap-[0.4em] h-full">
                          {payslip.custom_deductions?.map((deduction, idx) => (
                            <div key={idx} className="flex justify-between items-center gap-1 w-full whitespace-nowrap">
                              <span className="text-gray-700 font-medium truncate">{deduction.name}</span>
                              <span className="font-mono text-gray-800 shrink-0">{formatCurrency(deduction.amount)}</span>
                            </div>
                          ))}
                          {payslip.others_note && (
                            <div className="flex justify-between items-center gap-1 w-full whitespace-nowrap">
                              <span className="text-gray-700 font-medium truncate italic text-xs">Note: {payslip.others_note}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Subtotals */}
                      <div className="grid grid-cols-2 border-t border-gray-800 font-semibold text-[0.65em] shrink-0">
                        <div className="p-[0.5em] border-r border-gray-800 flex justify-between items-center gap-1 whitespace-nowrap">
                          <span className="text-gray-800 uppercase tracking-widest text-[0.8em] truncate">Total Pay</span>
                          <span className="font-mono font-bold shrink-0">{formatCurrency(payslip.total_salary)}</span>
                        </div>
                        <div className="p-[0.5em] flex justify-between items-center gap-1 whitespace-nowrap">
                          <span className="text-gray-800 uppercase tracking-widest text-[0.8em] truncate">Total Ded.</span>
                          <span className="font-mono font-bold text-gray-800 shrink-0">{formatCurrency(payslip.total_deductions)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Salary Highlights */}
                    <div className="mt-auto border-2 border-black border-dashed p-[1em] flex justify-between items-center shrink-0">
                      <div className="flex flex-col">
                        <span className="text-[0.65em] font-bold text-gray-600 uppercase tracking-widest mb-[0.25em]">Take Home Pay</span>
                        <span className="font-black text-[1.25em] uppercase tracking-tight">Net Salary</span>
                      </div>
                      <span className="font-mono font-black text-[1.5em] tracking-tighter bg-black text-white px-[0.5em] py-[0.1em] rounded-md">{formatCurrency(payslip.net_salary)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
