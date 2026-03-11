/**
 * @file: src/main/ipc/branches.ts
 *
 * @description:
 * IPC handler module for branch-related operations — exposes
 * channels for listing and renaming branches.
 *
 * @module: Main.IPC.Branches
 *
 * @overview:
 * Registers two ipcMain.handle channels: branches:getAll returns
 * every branch row ordered by ID, and branches:update validates
 * the incoming payload then persists the renamed branch. Both
 * channels operate synchronously via better-sqlite3 and throw
 * descriptive errors on invalid input.
 *
 * @dependencies:
 * - electron
 * - src/main/database.ts
 * - src/shared/types.ts
 *
 * @outputs:
 * - registerBranchHandlers (function)
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import type { Branch } from '../../shared/types'

export function registerBranchHandlers(): void {
  ipcMain.handle('branches:getAll', (): Branch[] => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM branches ORDER BY id').all() as Branch[]
  })

  ipcMain.handle('branches:update', (_, data: { id: number; name: string }): Branch => {
    const db = getDatabase()

    // Input validation
    if (!data || typeof data.id !== 'number' || !Number.isInteger(data.id) || data.id <= 0) {
      throw new Error('Invalid branch ID')
    }
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new Error('Branch name cannot be empty')
    }

    const trimmedName = data.name.trim()
    db.prepare('UPDATE branches SET name = ? WHERE id = ?').run(trimmedName, data.id)
    return db.prepare('SELECT * FROM branches WHERE id = ?').get(data.id) as Branch
  })
}
