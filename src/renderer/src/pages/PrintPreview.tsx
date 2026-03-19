/**
 * @file: src/renderer/src/pages/PrintPreview.tsx
 *
 * @description:
 * Print preview and export page — renders payslips in a zoomable
 * A4 layout with PDF, DOCX, XLSX, and native print export options.
 *
 * @module: Renderer.Pages.PrintPreview
 *
 * @overview:
 * Allows the user to select a branch and pay period, then loads
 * the matching payslips into a scaled PrintLayout preview. Zoom
 * controls adjust the preview scale. Five export actions are
 * available: native window.print, screen-identical PDF via
 * Electron's printToPDF, and tabular PDF/DOCX/XLSX via the main
 * process generators. Each export triggers a save dialog and
 * handles errors with console.error inside catch blocks.
 *
 * @dependencies:
 * - react
 * - lucide-react
 * - src/renderer/src/hooks/useApi.ts
 * - src/renderer/src/components/PrintLayout.tsx
 * - src/renderer/src/components/ui/button.tsx
 * - src/renderer/src/components/ui/card.tsx
 * - src/renderer/src/components/ui/select.tsx
 *
 * @outputs:
 * - default (PrintPreview component)
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Printer,
  FileText,
  Loader2,
  FileSpreadsheet,
  CalendarDays,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { useBranches, usePrintBatch, usePayPeriods } from '@/hooks/useApi'
import { formatDate } from '@/lib/calculations'
import PrintLayout from '@/components/PrintLayout'

export default function PrintPreview() {
  const { branches } = useBranches()
  const { payslips, fetchPrintBatch, loading, clearBatch } = usePrintBatch()

  const [branchId, setBranchId] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [selectedExport, setSelectedExport] = useState<string>('print')

  // Auto-fetch available pay periods when branch changes
  const { periods, loading: periodsLoading } = usePayPeriods(branchId)

  // When branch changes, reset selection
  useEffect(() => {
    setSelectedPeriod(null)
    clearBatch()
  }, [branchId, clearBatch])

  // When a period is selected, auto-fetch the batch
  useEffect(() => {
    if (branchId && selectedPeriod) {
      const [start, end] = selectedPeriod.split('|')
      fetchPrintBatch(branchId, start, end)
    }
  }, [branchId, selectedPeriod, fetchPrintBatch])

  const handlePrint = () => {
    window.print()
  }

  const handleExportDocx = async () => {
    if (!payslips || payslips.length === 0) return
    setExporting('docx')
    try {
      const ids = payslips.map((p) => p.id)
      const result = await window.api.exportDocx(ids)
      if (result) alert('DOCX exported successfully!')
    } catch (error) {
      console.error('Docx export failed', error)
      alert('Failed to export DOCX')
    } finally {
      setExporting(null)
    }
  }

  const handleExportXlsx = async () => {
    if (!payslips || payslips.length === 0) return
    setExporting('xlsx')
    try {
      const ids = payslips.map((p) => p.id)
      const result = await window.api.exportXlsx(ids)
      if (result) alert('Excel exported successfully!')
    } catch (error) {
      console.error('Excel export failed', error)
      alert('Failed to export Excel')
    } finally {
      setExporting(null)
    }
  }

  const handleExportPdf = async () => {
    if (!payslips || payslips.length === 0) return
    setExporting('pdf')
    try {
      const ids = payslips.map((p) => p.id)
      const result = await window.api.exportPdf(ids)
      if (result) alert('PDF generated successfully!')
    } catch (error) {
      console.error('PDF export failed', error)
      alert('Failed to export PDF')
    } finally {
      setExporting(null)
    }
  }

  const handleExportScreenPdf = async () => {
    setExporting('screenPdf')
    try {
      const result = await window.api.printViewToPdf()
      if (result) alert('PDF (Screen Print) generated successfully!')
    } catch (error) {
      console.error('Screen PDF print failed', error)
    } finally {
      setExporting(null)
    }
  }

  const exportOptions = [
    { id: 'print', label: 'Print (A4 Compact)', icon: Printer, action: handlePrint },
    {
      id: 'screenPdf',
      label: 'Save as PDF (Identical)',
      icon: FileText,
      action: handleExportScreenPdf
    },
    { id: 'pdf', label: 'Programmatic PDF', icon: FileText, action: handleExportPdf },
    { id: 'docx', label: 'Export MS Word', icon: FileText, action: handleExportDocx },
    { id: 'xlsx', label: 'Export MS Excel', icon: FileSpreadsheet, action: handleExportXlsx }
  ]

  const currentExportConfig = exportOptions.find((o) => o.id === selectedExport) || exportOptions[0]
  const CurrentExportIcon = currentExportConfig.icon

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Print Layout & Export</h1>
        <p className="text-muted-foreground">
          Select a branch, then pick a pay period to preview and export.
        </p>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Batch Filter</CardTitle>
          <CardDescription>Choose a branch and pay period to load payslips.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Branch Selector */}
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select
                value={branchId?.toString() || ''}
                onValueChange={(v) => {
                  const id = parseInt(v)
                  if (!isNaN(id)) setBranchId(id)
                }}
              >
                <SelectTrigger id="branch-select-trigger" data-selected-id={branchId ?? ''}>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pay Period Selector */}
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Pay Period
              </Label>
              {!branchId ? (
                <div className="h-9 flex items-center text-sm text-muted-foreground border rounded-md px-3">
                  Select a branch first
                </div>
              ) : periodsLoading ? (
                <div className="h-9 flex items-center text-sm text-muted-foreground border rounded-md px-3">
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Loading periods...
                </div>
              ) : periods.length === 0 ? (
                <div className="h-9 flex items-center text-sm text-muted-foreground border rounded-md px-3">
                  No payslips found for this branch
                </div>
              ) : (
                <Select value={selectedPeriod || ''} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a pay period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => {
                      const key = `${p.pay_period_start}|${p.pay_period_end}`
                      return (
                        <SelectItem key={key} value={key}>
                          {formatDate(p.pay_period_start)} — {formatDate(p.pay_period_end)} (
                          {p.count} payslip{p.count !== 1 ? 's' : ''})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center p-8 print:hidden">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* No payslips state */}
      {!loading && payslips && payslips.length === 0 && selectedPeriod && (
        <div className="text-center p-8 text-muted-foreground border rounded-lg print:hidden">
          No payslips found for this period.
        </div>
      )}

      {payslips && payslips.length > 0 && (
        <div className="space-y-6">
          {/* Action Bar */}
          <Card className="print:hidden">
            <CardHeader className="py-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Ready for Processing</CardTitle>
                  <CardDescription>
                    Loaded {payslips.length} payslips for formatting.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <div className="flex items-center gap-2">
                    <Select value={selectedExport} onValueChange={setSelectedExport}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select Action" />
                      </SelectTrigger>
                      <SelectContent>
                        {exportOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={currentExportConfig.action}
                      variant="default"
                      size="icon"
                      disabled={exporting !== null}
                      title={currentExportConfig.label}
                    >
                      {exporting === currentExportConfig.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CurrentExportIcon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* The Visual Print Layout Engine */}
          <Card className="print:border-none print:shadow-none bg-gray-50/50 print:bg-transparent overflow-auto p-4 md:p-8 flex justify-center relative">
            {/* Zoom Overlay (Floating) */}
            <div className="absolute top-4 right-4 flex items-center space-x-1.5 border rounded-full px-2 py-0.5 print:hidden bg-white/80 backdrop-blur shadow-sm h-8 z-10">
              <button
                onClick={() => setZoomLevel((p) => Math.max(p - 0.1, 0.5))}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span
                className="text-xs font-mono font-medium w-[4ch] text-center select-none cursor-pointer"
                onClick={() => setZoomLevel(1)}
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((p) => Math.min(p + 0.1, 2))}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              className="bg-white shadow-sm border print:shadow-none print:border-none origin-top transition-transform duration-200"
              style={{
                width: '210mm',
                transform: `scale(${zoomLevel})`,
                marginBottom: zoomLevel > 1 ? `${(zoomLevel - 1) * 297}mm` : '0'
              }}
            >
              <PrintLayout payslips={payslips} />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
