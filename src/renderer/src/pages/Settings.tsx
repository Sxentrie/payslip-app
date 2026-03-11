/**
 * @file: src/renderer/src/pages/Settings.tsx
 *
 * @description:
 * Settings page providing deduction type management, application
 * info, and the Danger Zone data-wipe operation.
 *
 * @module: Renderer.Pages.Settings
 *
 * @overview:
 * Three card sections: an info card showing application version and
 * database path, a deduction-types manager (add/delete custom
 * deduction categories), and a Danger Zone with a "Clear All Data"
 * button. The clear-all action requires the user to type a
 * confirmation phrase before enabling the destructive button, then
 * calls window.api.clearAllData to reset the database.
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
 * - src/renderer/src/components/ui/separator.tsx
 *
 * @outputs:
 * - default (Settings component)
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import { Trash2, AlertTriangle, Database, Plus, List } from 'lucide-react'
import { useDeductionTypes } from '@/hooks/useApi'

export default function SettingsPage() {
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const [clearing, setClearing] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const { deductionTypes, createDeductionType, deleteDeductionType } = useDeductionTypes()
    const [newDeduction, setNewDeduction] = useState('')
    const [addingDeduction, setAddingDeduction] = useState(false)

    const handleClearData = async () => {
        if (confirmText !== 'DELETE ALL') return
        setClearing(true)
        setMessage(null)
        try {
            await window.api.clearAllData()
            setMessage({ type: 'success', text: 'All data cleared successfully. App is reset to defaults.' })
            setShowClearConfirm(false)
            setConfirmText('')
        } catch (err) {
            setMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to clear data'
            })
        } finally {
            setClearing(false)
        }
    }

    const handleAddDeduction = async () => {
        if (!newDeduction.trim()) return
        setAddingDeduction(true)
        setMessage(null)
        try {
            await createDeductionType(newDeduction)
            setNewDeduction('')
            setMessage({ type: 'success', text: `Deduction "${newDeduction.trim()}" added.` })
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error adding type' })
        } finally {
            setAddingDeduction(false)
        }
    }

    const handleDeleteDeduction = async (id: number) => {
        setMessage(null)
        try {
            await deleteDeductionType(id)
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error deleting type' })
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Application configuration and data management</p>
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

            {/* App Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Application Info
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">App Name</span>
                        <span className="font-medium">Payslip Manager</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Version</span>
                        <span className="font-medium">1.0.0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Database</span>
                        <span className="font-medium">SQLite (local)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Owner</span>
                        <span className="font-medium">Sxentrie Inc.</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Developer</span>
                        <span className="font-medium">J. Jamora</span>
                    </div>
                </CardContent>
            </Card>

            {/* Deduction Types */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <List className="h-5 w-5" />
                        Deduction Types
                    </CardTitle>
                    <CardDescription>
                        Manage the standard deductions that appear on new payslips.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <input
                            className="flex h-9 w-full rounded-md border border-input bg-muted/20 px-3 py-1 text-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="Add new deduction (e.g. Uniform)"
                            value={newDeduction}
                            onChange={(e) => setNewDeduction(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newDeduction.trim()) {
                                    handleAddDeduction()
                                }
                            }}
                        />
                        <Button
                            size="sm"
                            onClick={handleAddDeduction}
                            disabled={!newDeduction.trim() || addingDeduction}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        {deductionTypes.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No deduction types created.
                            </div>
                        ) : (
                            <ul className="divide-y">
                                {deductionTypes.map((type) => (
                                    <li key={type.id} className="flex items-center justify-between p-3 text-sm">
                                        <span className="font-medium">{type.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteDeduction(type.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        These actions are destructive and cannot be undone.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between rounded-lg border border-red-200 p-4">
                        <div>
                            <p className="text-sm font-medium">Clear All Application Data</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Deletes all payslips, employees, and resets branches to defaults. This cannot be
                                reversed.
                            </p>
                        </div>
                        <Button variant="destructive" onClick={() => setShowClearConfirm(true)}>
                            <Trash2 className="h-4 w-4" />
                            Clear All Data
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Clear confirmation dialog */}
            <Dialog open={showClearConfirm} onOpenChange={(open) => {
                setShowClearConfirm(open)
                if (!open) setConfirmText('')
            }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Clear All Data
                        </DialogTitle>
                        <DialogDescription>
                            This will permanently delete all payslips, employees, and reset branch names to
                            defaults. Type <strong>DELETE ALL</strong> to confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <input
                        className="flex h-9 w-full rounded-md border border-red-300 bg-red-50/20 px-3 py-1 text-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                        placeholder="Type DELETE ALL to confirm"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        autoFocus
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleClearData}
                            disabled={confirmText !== 'DELETE ALL' || clearing}
                        >
                            {clearing ? 'Clearing...' : 'Confirm Clear'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
