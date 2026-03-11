/**
 * @file: src/main/ipc/settings.ts
 *
 * @description:
 * IPC handler module for application-level data management —
 * provides the nuclear "Clear All Data" operation.
 *
 * @module: Main.IPC.Settings
 *
 * @overview:
 * Registers a single ipcMain.handle channel (settings:clearAllData)
 * that wipes every row from the payslips, employees, and branches
 * tables, resets the SQLite autoincrement sequences, then re-seeds
 * the default branch names. This is the "factory reset" path
 * triggered from the Settings page danger zone.
 *
 * @dependencies:
 * - electron
 * - src/main/database.ts
 *
 * @outputs:
 * - registerSettingsHandlers (function)
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:clearAllData', (): void => {
    const db = getDatabase()
    db.exec(`
      DELETE FROM payslips;
      DELETE FROM employees;
      DELETE FROM branches;

      -- Reset auto-increment counters so IDs start from 1
      DELETE FROM sqlite_sequence WHERE name IN ('payslips', 'employees', 'branches');

      -- Re-seed defaults
      INSERT OR IGNORE INTO branches (name) VALUES
        ('IDOL MOTEL'),
        ('BULLSEYE MOTEL'),
        ('LUCKY START MOTEL'),
        ('HAPPYNEST MOTEL'),
        ('OTHERS');
    `)
  })
}
