/**
 * @file: src/renderer/src/pages/NewPayslip.tsx
 *
 * @description:
 * Payslip creation form with real-time salary calculation preview,
 * dynamic deduction fields, and date-range pickers.
 *
 * @module: Renderer.Pages.NewPayslip
 *
 * @overview:
 * Orchestrates a multi-section form: branch/employee selection,
 * pay period date pickers (via Calendar + Popover), earnings
 * inputs (daily rate, shifts, overtime), and a dynamic deduction
 * list driven by the configured DeductionTypes. A live summary
 * panel recalculates total salary, total deductions, and net pay
 * on every input change using the shared calculatePayslip
 * function. On submit, the payload is validated and sent via
 * window.api.createPayslip, with success/error toast feedback.
 *
 * @dependencies:
 * - react
 * - date-fns
 * - lucide-react
 * - src/renderer/src/hooks/useApi.ts
 * - src/renderer/src/lib/calculations.ts
 * - src/shared/types.ts
 * - src/renderer/src/components/ui/button.tsx
 * - src/renderer/src/components/ui/card.tsx
 * - src/renderer/src/components/ui/calendar.tsx
 * - src/renderer/src/components/ui/input.tsx
 * - src/renderer/src/components/ui/label.tsx
 * - src/renderer/src/components/ui/popover.tsx
 * - src/renderer/src/components/ui/select.tsx
 * - src/renderer/src/components/ui/separator.tsx
 *
 * @outputs:
 * - default (NewPayslip component)
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useBranches, useEmployees, usePayslips, useDeductionTypes } from '@/hooks/useApi'
import { calculatePayslip, formatCurrency } from '@/lib/calculations'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { PayslipInput } from '../../../shared/types'
import { Save, RotateCcw, Calculator, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

const initialForm = {
    daily_rate: 0,
    days_worked: 0,
    overtime: 0,
    others_note: ''
}

export default function NewPayslip() {
    const { branches, loading: branchesLoading } = useBranches()
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
    const { employees, loading: employeesLoading } = useEmployees(selectedBranchId)
    const { payslips, createPayslip } = usePayslips(selectedBranchId)
    const { deductionTypes } = useDeductionTypes()

    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
    const [payPeriodStart, setPayPeriodStart] = useState('')
    const [payPeriodEnd, setPayPeriodEnd] = useState('')
    const [form, setForm] = useState(initialForm)
    const [deductions, setDeductions] = useState<Record<string, number>>({})
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Auto-calculate
    const calc = useMemo(() => calculatePayslip({
        ...form,
        custom_deductions: Object.entries(deductions).map(([name, amount]) => ({ name, amount }))
    }), [form, deductions])

    // Duplicate payslip guard — warn if a payslip already exists for this employee+period
    const duplicateWarning = useMemo(() => {
        if (!selectedEmployeeId || !payPeriodStart || !payPeriodEnd) return null
        return payslips.find(
            (p) =>
                p.employee_id === selectedEmployeeId &&
                p.pay_period_start === payPeriodStart &&
                p.pay_period_end === payPeriodEnd
        ) || null
    }, [payslips, selectedEmployeeId, payPeriodStart, payPeriodEnd])

    // Reset employee and clear message when branch changes
    useEffect(() => {
        setSelectedEmployeeId(null)
        setMessage(null)
    }, [selectedBranchId])

    // Clear message when employee changes
    useEffect(() => {
        setMessage(null)
    }, [selectedEmployeeId])

    const updateField = (field: keyof typeof form, value: string) => {
        if (field === 'others_note') {
            setForm((prev) => ({ ...prev, [field]: value }))
        } else {
            setForm((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }))
        }
    }
    const updateDeduction = (name: string, value: string) => {
        setDeductions((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }))
    }

    // Soft reset: preserves branch + dates for batch entry (used after save)
    const softReset = () => {
        setForm(initialForm)
        setDeductions({})
        setSelectedEmployeeId(null)
        setMessage(null)
    }

    // Full reset: clears everything (used by Reset button)
    const resetForm = () => {
        softReset()
        setSelectedBranchId(null)
        setPayPeriodStart('')
        setPayPeriodEnd('')
    }

    const handleSave = async () => {
        if (!selectedBranchId || !selectedEmployeeId || !payPeriodStart || !payPeriodEnd) {
            setMessage({ type: 'error', text: 'Please fill in branch, employee, and pay period.' })
            return
        }
        if (form.daily_rate <= 0 || form.days_worked <= 0) {
            setMessage({ type: 'error', text: 'Rate per shift and shifts must be greater than 0.' })
            return
        }

        setSaving(true)
        setMessage(null)
        try {
            const input: PayslipInput = {
                employee_id: selectedEmployeeId,
                branch_id: selectedBranchId,
                pay_period_start: payPeriodStart,
                pay_period_end: payPeriodEnd,
                daily_rate: form.daily_rate || 0,
                days_worked: form.days_worked || 0,
                overtime: form.overtime || 0,
                total_salary: calc.total_salary || 0,
                custom_deductions: deductionTypes.map((type) => ({
                    name: type.name,
                    amount: deductions[type.name] || 0
                })),
                others_note: form.others_note || null,
                total_deductions: calc.total_deductions || 0,
                net_salary: calc.net_salary || 0
            }
            await createPayslip(input)
            softReset()
            // Set message after softReset so it doesn't get cleared immediately
            setMessage({ type: 'success', text: 'Payslip saved successfully! Branch and dates preserved for next entry.' })
        } catch (err: any) {
            setMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to save payslip'
            })
        } finally {
            setSaving(false)
        }
    }

    // Ctrl+S keyboard shortcut
    const handleSaveRef = useRef(handleSave)
    handleSaveRef.current = handleSave
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                handleSaveRef.current()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    // Helper: select all text on focus for rapid numeric entry
    const selectOnFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select()
    }, [])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">New Payslip</h1>
                <p className="text-muted-foreground">Create a payslip for an employee</p>
            </div>

            {message && (
                <div
                    className={`rounded-lg border p-3 text-sm ${message.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-red-200 bg-red-50 text-red-800'
                        }`}
                >
                    {message.text}
                </div>
            )}

            {duplicateWarning && !message && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                        <span className="font-semibold">Duplicate detected:</span> A payslip for{' '}
                        <span className="font-semibold">{duplicateWarning.employee_name}</span> already
                        exists for this period (Net:{' '}
                        <span className="font-semibold">{formatCurrency(duplicateWarning.net_salary)}</span>).
                        Saving will be blocked. Delete the existing one from Payslip Log first.
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left: Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Branch & Employee Selection */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">Employee Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Branch</Label>
                                    <Select
                                        value={selectedBranchId?.toString() ?? ''}
                                        onValueChange={(v) => {
                                            const id = parseInt(v)
                                            if (!isNaN(id)) setSelectedBranchId(id)
                                        }}
                                        disabled={saving || branchesLoading}
                                    >
                                        <SelectTrigger id="branch-select-trigger" data-selected-id={selectedBranchId ?? ''}>
                                            <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select branch"} />
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
                                <div className="space-y-2">
                                    <Label>Employee</Label>
                                    <Select
                                        value={selectedEmployeeId?.toString() ?? ''}
                                        onValueChange={(v) => {
                                            const id = parseInt(v)
                                            if (!isNaN(id)) setSelectedEmployeeId(id)
                                        }}
                                        disabled={!selectedBranchId || saving || employeesLoading}
                                    >
                                        <SelectTrigger id="employee-select-trigger" data-selected-id={selectedEmployeeId ?? ''}>
                                            <SelectValue
                                                placeholder={
                                                    !selectedBranchId ? 'Select branch first' : 
                                                    employeesLoading ? 'Loading employees...' : 'Select employee'
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map((e) => (
                                                <SelectItem key={e.id} value={e.id.toString()}>
                                                    {e.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2 flex flex-col">
                                    <Label>Pay Period Start</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                disabled={saving}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] bg-muted/20",
                                                    !payPeriodStart && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {payPeriodStart ? format(parseISO(payPeriodStart), "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={payPeriodStart ? parseISO(payPeriodStart) : undefined}
                                                onSelect={(date) => setPayPeriodStart(date ? format(date, 'yyyy-MM-dd') : '')}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {/* Invisible fallback for Playwright test autofill */}
                                    <input data-testid="pay-period-start" type="date" className="sr-only" value={payPeriodStart} onChange={(e) => setPayPeriodStart(e.target.value)} />
                                </div>
                                <div className="space-y-2 flex flex-col">
                                    <Label>Pay Period End</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                disabled={saving}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] bg-muted/20",
                                                    !payPeriodEnd && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {payPeriodEnd ? format(parseISO(payPeriodEnd), "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={payPeriodEnd ? parseISO(payPeriodEnd) : undefined}
                                                onSelect={(date) => setPayPeriodEnd(date ? format(date, 'yyyy-MM-dd') : '')}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <input data-testid="pay-period-end" type="date" className="sr-only" value={payPeriodEnd} onChange={(e) => setPayPeriodEnd(e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Earnings */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">Earnings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>Rate per Shift (₱)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        disabled={saving}
                                        value={form.daily_rate || ''}
                                        onChange={(e) => updateField('daily_rate', e.target.value)}
                                        onFocus={selectOnFocus}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Shifts</Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        disabled={saving}
                                        value={form.days_worked || ''}
                                        onChange={(e) => updateField('days_worked', e.target.value)}
                                        onFocus={selectOnFocus}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Overtime (₱)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        disabled={saving}
                                        value={form.overtime || ''}
                                        onChange={(e) => updateField('overtime', e.target.value)}
                                        onFocus={selectOnFocus}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-3">
                                    <Label>Total Salary</Label>
                                    <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-semibold">
                                        {formatCurrency(calc.total_salary)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Deductions */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">Deductions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-3">
                                {deductionTypes.map((type) => (
                                    <div key={type.id} className="space-y-2">
                                        <Label>{type.name} (₱)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            disabled={saving}
                                            value={deductions[type.name] || ''}
                                            onChange={(e) => updateDeduction(type.name, e.target.value)}
                                            onFocus={selectOnFocus}
                                            placeholder="0.00"
                                        />
                                    </div>
                                ))}
                            </div>
                        <div className="space-y-2 sm:col-span-3">
                                <Label>Others Note</Label>
                                <Input
                                    value={form.others_note}
                                    disabled={saving}
                                    onChange={(e) => updateField('others_note', e.target.value)}
                                    placeholder="Description for other deductions..."
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Summary */}
                <div className="space-y-6">
                    <Card className="sticky top-6">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calculator className="h-4 w-4" />
                                Payslip Summary
                            </CardTitle>
                            <CardDescription>Auto-calculated from your inputs</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Rate per Shift</span>
                                    <span>{formatCurrency(form.daily_rate)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Shifts</span>
                                    <span>{form.days_worked}</span>
                                </div>
                                {form.overtime > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Overtime</span>
                                        <span className="text-green-600">+{formatCurrency(form.overtime)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-medium pt-2 border-t mt-2">
                                    <span>Total Salary</span>
                                    <span>{formatCurrency(calc.total_salary)}</span>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                {deductionTypes.map((type) => {
                                    const amount = deductions[type.name] || 0;
                                    return (
                                        <div key={type.name} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{type.name}</span>
                                            <span className="text-red-600">-{formatCurrency(amount)}</span>
                                        </div>
                                    )
                                })}
                                <div className="flex justify-between text-sm font-medium pt-2 border-t mt-2">
                                    <span>Total Deductions</span>
                                    <span className="text-red-600">-{formatCurrency(calc.total_deductions)}</span>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex justify-between text-lg font-bold">
                                <span>Net Salary</span>
                                <span className={calc.net_salary >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {formatCurrency(calc.net_salary)}
                                </span>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button onClick={handleSave} disabled={saving} className="flex-1">
                                    <Save className="h-4 w-4" />
                                    {saving ? 'Saving...' : 'Save Payslip'}
                                </Button>
                                <Button variant="outline" onClick={resetForm}>
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
