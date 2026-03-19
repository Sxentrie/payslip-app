/**
 * @file: src/renderer/src/pages/Branches.tsx
 *
 * @description:
 * Branch management page with inline editing for branch names.
 *
 * @module: Renderer.Pages.Branches
 *
 * @overview:
 * Displays all branches in a table with an inline edit mode. Each
 * row has an edit button that swaps the branch name cell to an
 * input field. Save persists the renamed branch via
 * window.api.updateBranch and refreshes the list. Cancel discards
 * changes. No branch deletion is exposed — branches are permanent
 * reference data seeded at database initialisation.
 *
 * @dependencies:
 * - react
 * - lucide-react
 * - src/renderer/src/hooks/useApi.ts
 * - src/renderer/src/components/ui/button.tsx
 * - src/renderer/src/components/ui/card.tsx
 * - src/renderer/src/components/ui/input.tsx
 * - src/renderer/src/components/ui/table.tsx
 *
 * @outputs:
 * - default (Branches component)
 */

import { useState } from 'react'
import { useBranches } from '@/hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Check, Pencil, X, Building2 } from 'lucide-react'

export default function BranchesPage() {
  const { branches, loading, updateBranch } = useBranches()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const startEdit = (id: number, currentName: string) => {
    setEditingId(id)
    setEditName(currentName)
  }

  const saveEdit = async () => {
    if (editingId && editName.trim()) {
      await updateBranch(editingId, editName.trim())
      setEditingId(null)
      setEditName('')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
        <p className="text-muted-foreground">Manage your branch names</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {branches.length} Branches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-muted-foreground">{b.id}</TableCell>
                    <TableCell>
                      {editingId === b.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-64"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit()
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                      ) : (
                        <span className="font-medium">{b.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{b.created_at}</TableCell>
                    <TableCell className="text-right">
                      {editingId === b.id ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={saveEdit}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => startEdit(b.id, b.name)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
