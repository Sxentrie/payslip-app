/**
 * @file: src/renderer/src/pages/Employees.tsx
 *
 * @description:
 * Employee management page with branch-filtered table, add dialog,
 * and soft-delete confirmation.
 *
 * @module: Renderer.Pages.Employees
 *
 * @overview:
 * Lists employees for the selected branch in a table with name,
 * position, and status columns. An add-employee dialog collects
 * name and optional position. The delete button triggers a
 * confirmation dialog before soft-deleting (is_active = 0) the
 * record, preserving referential integrity with existing payslips.
 *
 * @dependencies:
 * - react
 * - lucide-react
 * - src/renderer/src/hooks/useApi.ts
 * - src/renderer/src/components/ui/button.tsx
 * - src/renderer/src/components/ui/card.tsx
 * - src/renderer/src/components/ui/dialog.tsx
 * - src/renderer/src/components/ui/input.tsx
 * - src/renderer/src/components/ui/label.tsx
 * - src/renderer/src/components/ui/select.tsx
 * - src/renderer/src/components/ui/table.tsx
 *
 * @outputs:
 * - default (Employees component)
 */

import { useState } from 'react'
import { useBranches, useEmployees } from '@/hooks/useApi'
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
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Plus, Trash2, UserPlus } from 'lucide-react'

export default function EmployeesPage() {
    const { branches } = useBranches()
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
    const { employees, loading, createEmployee, deleteEmployee } = useEmployees(selectedBranchId)

    const [showAdd, setShowAdd] = useState(false)
    const [newName, setNewName] = useState('')
    const [newPosition, setNewPosition] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

    const handleAdd = async () => {
        if (!newName.trim()) return
        await createEmployee(newName.trim(), newPosition.trim() || undefined)
        setNewName('')
        setNewPosition('')
        setShowAdd(false)
    }

    const handleDelete = async (id: number) => {
        await deleteEmployee(id)
        setDeleteConfirm(null)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
                    <p className="text-muted-foreground">Manage employees per branch</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={selectedBranchId?.toString() ?? ''}
                        onValueChange={(v) => {
                            const id = parseInt(v)
                            if (!isNaN(id)) setSelectedBranchId(id)
                        }}
                    >
                        <SelectTrigger id="branch-select-trigger" className="w-52" data-selected-id={selectedBranchId ?? ''}>
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
                    <Button onClick={() => setShowAdd(true)} disabled={!selectedBranchId}>
                        <UserPlus className="h-4 w-4" />
                        Add Employee
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        {selectedBranchId
                            ? `${employees.length} Employee${employees.length !== 1 ? 's' : ''}`
                            : 'Select a branch'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!selectedBranchId ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            Choose a branch to view its employees.
                        </p>
                    ) : loading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
                    ) : employees.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground mb-4">No employees yet.</p>
                            <Button variant="outline" onClick={() => setShowAdd(true)}>
                                <Plus className="h-4 w-4" />
                                Add First Employee
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Position</TableHead>
                                    <TableHead>Added</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell className="font-medium">{e.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{e.position || '—'}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {e.created_at}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteConfirm(e.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add Employee Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Add Employee</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Employee name"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Position (optional)</Label>
                            <Input
                                value={newPosition}
                                onChange={(e) => setNewPosition(e.target.value)}
                                placeholder="e.g. Front Desk, Housekeeping"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdd} disabled={!newName.trim()}>
                            Add
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Remove Employee</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will deactivate the employee. Their existing payslips will be preserved.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                        >
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
