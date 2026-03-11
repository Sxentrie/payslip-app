/**
 * @file: src/renderer/src/pages/Dashboard.tsx
 *
 * @description:
 * Dashboard page displaying summary statistics and recent payslips
 * with branch-level filtering.
 *
 * @module: Renderer.Pages.Dashboard
 *
 * @overview:
 * Renders three metric cards (total payslips, aggregate net salary,
 * aggregate deductions) and a recent-payslips list. A branch
 * selector filters all displayed data. Metric values are computed
 * from the filtered payslip array using formatCurrency. Serves as
 * the application landing page (index route).
 *
 * @dependencies:
 * - react
 * - lucide-react
 * - src/renderer/src/hooks/useApi.ts
 * - src/renderer/src/lib/calculations.ts
 * - src/renderer/src/components/ui/card.tsx
 * - src/renderer/src/components/ui/select.tsx
 *
 * @outputs:
 * - default (Dashboard component)
 */

import { useBranches, usePayslips } from '@/hooks/useApi'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/calculations'
import { FileText, DollarSign, Building2 } from 'lucide-react'

export default function Dashboard() {
    const { branches } = useBranches()
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
    const { payslips } = usePayslips(selectedBranchId)

    const totalPayslips = payslips.length
    const totalNetSalary = payslips.reduce((sum, p) => sum + p.net_salary, 0)
    const totalDeductions = payslips.reduce((sum, p) => sum + p.total_deductions, 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Payslip management overview</p>
                </div>
                <Select
                    value={selectedBranchId?.toString() ?? 'all'}
                    onValueChange={(v) => setSelectedBranchId(v === 'all' ? null : parseInt(v))}
                >
                    <SelectTrigger id="branch-select-trigger" className="w-52" data-selected-id={selectedBranchId ?? ''}>
                        <SelectValue placeholder="Select branch" />
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Payslips</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalPayslips}</div>
                        <p className="text-xs text-muted-foreground">Generated payslips</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Net Salary</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalNetSalary)}</div>
                        <p className="text-xs text-muted-foreground">Across all payslips</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalDeductions)}</div>
                        <p className="text-xs text-muted-foreground">SSS, Philhealth, Pag-ibig, etc.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Branches</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{branches.length}</div>
                        <p className="text-xs text-muted-foreground">Registered branches</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent payslips */}
            {payslips.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Payslips</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {payslips.slice(0, 5).map((p) => (
                                <div
                                    key={p.id}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div>
                                        <p className="text-sm font-medium">{p.employee_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {p.branch_name} · {formatDate(p.pay_period_start)} to {formatDate(p.pay_period_end)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold">{formatCurrency(p.net_salary)}</p>
                                        <p className="text-xs text-muted-foreground">Net</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
