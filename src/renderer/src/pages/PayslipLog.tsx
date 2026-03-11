/**
 * @file: src/renderer/src/pages/PayslipLog.tsx
 *
 * @description:
 * Payslip log page with filterable table, detail view dialog, and
 * individual record deletion.
 *
 * @module: Renderer.Pages.PayslipLog
 *
 * @overview:
 * Displays all generated payslips in a sortable table with branch
 * and pay-period filter dropdowns. Clicking a row opens a detail
 * dialog showing the full payslip breakdown. A delete button with
 * confirmation dialog allows removal of individual records. Uses
 * useBranches, usePayslips, and usePayPeriods hooks for data.
 *
 * @dependencies:
 * - react
 * - lucide-react
 * - src/renderer/src/hooks/useApi.ts
 * - src/renderer/src/lib/calculations.ts
 * - src/renderer/src/components/ui/button.tsx
 * - src/renderer/src/components/ui/card.tsx
 * - src/renderer/src/components/ui/dialog.tsx
 * - src/renderer/src/components/ui/select.tsx
 * - src/renderer/src/components/ui/separator.tsx
 * - src/renderer/src/components/ui/table.tsx
 *
 * @outputs:
 * - default (PayslipLog component)
 */

import { useState } from 'react'
import { useBranches, usePayslips } from '@/hooks/useApi'
import { formatCurrency, formatDate } from '@/lib/calculations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Trash2, Eye, Search } from 'lucide-react'
import type { PayslipWithDetails } from '../../../shared/types'

export default function PayslipLog() {
    const { branches } = useBranches()
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
    const [periodStart, setPeriodStart] = useState('')
    const [periodEnd, setPeriodEnd] = useState('')
    const { payslips, loading, refetch, deletePayslip } = usePayslips(selectedBranchId)
    const [viewPayslip, setViewPayslip] = useState<PayslipWithDetails | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

    const handleFilter = () => {
        refetch(periodStart || undefined, periodEnd || undefined)
    }

    const handleDelete = async (id: number) => {
        await deletePayslip(id)
        setDeleteConfirm(null)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Payslip Log</h1>
                <p className="text-muted-foreground">View and manage all generated payslips</p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-2">
                            <Label>Branch</Label>
                            <Select
                                value={selectedBranchId?.toString() ?? 'all'}
                                onValueChange={(v) => setSelectedBranchId(v === 'all' ? null : parseInt(v))}
                            >
                                <SelectTrigger id="branch-select-trigger" className="w-48" data-selected-id={selectedBranchId ?? ''}>
                                    <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Branches</SelectItem>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Period Start</Label>
                            <Input
                                type="date"
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Period End</Label>
                            <Input
                                type="date"
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <Button onClick={handleFilter} variant="secondary">
                            <Search className="h-4 w-4" />
                            Filter
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        {payslips.length} Payslip{payslips.length !== 1 ? 's' : ''} Found
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
                    ) : payslips.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            No payslips found. {!selectedBranchId && 'Select a branch to see payslips.'}
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead className="text-right">Gross</TableHead>
                                    <TableHead className="text-right">Deductions</TableHead>
                                    <TableHead className="text-right">Net</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payslips.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.employee_name}</TableCell>
                                        <TableCell>{p.branch_name}</TableCell>
                                        <TableCell className="text-xs">
                                            {formatDate(p.pay_period_start)} — {formatDate(p.pay_period_end)}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.total_salary)}</TableCell>
                                        <TableCell className="text-right text-red-600">
                                            -{formatCurrency(p.total_deductions)}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {formatCurrency(p.net_salary)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => setViewPayslip(p)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteConfirm(p.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* View Detail Dialog */}
            <Dialog open={!!viewPayslip} onOpenChange={() => setViewPayslip(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Payslip Detail</DialogTitle>
                        <DialogDescription>
                            {viewPayslip?.employee_name} — {viewPayslip?.branch_name}
                        </DialogDescription>
                    </DialogHeader>
                    {viewPayslip && (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Period</span>
                                <span>
                                    {formatDate(viewPayslip.pay_period_start)} —{' '}
                                    {formatDate(viewPayslip.pay_period_end)}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Rate per Shift</span>
                                <span>{formatCurrency(viewPayslip.daily_rate)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Shifts</span>
                                <span>{viewPayslip.days_worked}</span>
                            </div>
                            {viewPayslip.overtime > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Overtime</span>
                                    <span className="text-green-600">+{formatCurrency(viewPayslip.overtime)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-medium">
                                <span>Total Salary</span>
                                <span>{formatCurrency(viewPayslip.total_salary)}</span>
                            </div>
                            {viewPayslip.custom_deductions?.map((deduction, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span className="text-muted-foreground">{deduction.name}</span>
                                    <span className="text-red-600">-{formatCurrency(deduction.amount)}</span>
                                </div>
                            ))}
                            {viewPayslip.others_note && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Others Note</span>
                                    <span>{viewPayslip.others_note}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-medium text-red-600">
                                <span>Total Deductions</span>
                                <span>-{formatCurrency(viewPayslip.total_deductions)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Net Salary</span>
                                <span className="text-green-600">
                                    {formatCurrency(viewPayslip.net_salary)}
                                </span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Payslip</DialogTitle>
                        <DialogDescription>
                            Are you sure? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
