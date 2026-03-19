/**
 * @file: src/main/database.ts
 *
 * @description:
 * SQLite connection manager responsible for opening, initialising,
 * migrating, and closing the application database.
 *
 * @module: Main.Database
 *
 * @overview:
 * This module owns the entire database lifecycle. On first call to
 * getDatabase(), it creates the SQLite file inside the Electron
 * userData directory, enables WAL journal mode and foreign keys,
 * then runs the full schema initialisation (branches, employees,
 * deduction_types, payslips) with default seed data. After schema
 * creation, it applies safe ALTER TABLE migrations for columns
 * added post-v1 (overtime, store, custom_deductions). The singleton
 * pattern ensures a single connection is reused across all IPC
 * handlers, and closeDatabase() cleanly shuts it down on app exit.
 *
 * @dependencies:
 * - better-sqlite3
 * - electron
 * - path
 * - fs
 *
 * @outputs:
 * - getDatabase (function)
 * - closeDatabase (function)
 */

import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }

  const dbPath = join(userDataPath, 'payslip.db')
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initializeSchema(db)
  return db
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    -- ============================================================
    -- BRANCHES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS branches (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Seed the 5 default branches
    INSERT OR IGNORE INTO branches (name) VALUES
      ('IDOL MOTEL'),
      ('BULLSEYE MOTEL'),
      ('LUCKY START MOTEL'),
      ('HAPPYNEST MOTEL'),
      ('OTHERS');

    -- ============================================================
    -- EMPLOYEES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS employees (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id   INTEGER NOT NULL,
      name        TEXT    NOT NULL,
      position    TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );

    CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);

    -- ============================================================
    -- DEDUCTION TYPES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS deduction_types (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Seed the default standard deductions
    INSERT OR IGNORE INTO deduction_types (name) VALUES
      ('SSS Premium'),
      ('SSS Loan'),
      ('Philhealth'),
      ('Pag-ibig'),
      ('Pag-ibig Loan'),
      ('Store'),
      ('Cash Advance'),
      ('Others');

    -- ============================================================
    -- PAYSLIPS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS payslips (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id     INTEGER NOT NULL,
      branch_id       INTEGER NOT NULL,

      pay_period_start TEXT   NOT NULL,
      pay_period_end   TEXT   NOT NULL,

      daily_rate      REAL    NOT NULL,
      days_worked     REAL    NOT NULL,
      overtime        REAL    NOT NULL DEFAULT 0,
      total_salary    REAL    NOT NULL,

      sss_premium     REAL    NOT NULL DEFAULT 0,
      sss_loan        REAL    NOT NULL DEFAULT 0,
      philhealth      REAL    NOT NULL DEFAULT 0,
      pagibig         REAL    NOT NULL DEFAULT 0,
      pagibig_loan    REAL    NOT NULL DEFAULT 0,
      others          REAL    NOT NULL DEFAULT 0,
      store           REAL    NOT NULL DEFAULT 0,
      others_note     TEXT,

      total_deductions REAL   NOT NULL DEFAULT 0,
      net_salary       REAL   NOT NULL,

      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),

      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (branch_id)   REFERENCES branches(id)
    );

    CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
    CREATE INDEX IF NOT EXISTS idx_payslips_branch   ON payslips(branch_id);
    CREATE INDEX IF NOT EXISTS idx_payslips_period   ON payslips(pay_period_start, pay_period_end);
  `)

  // Run migrations safely
  const tableInfo = db.prepare(`PRAGMA table_info(payslips)`).all() as any[]

  if (!tableInfo.find((col) => col.name === 'overtime')) {
    db.exec(`ALTER TABLE payslips ADD COLUMN overtime REAL NOT NULL DEFAULT 0;`)
  }

  if (!tableInfo.find((col) => col.name === 'store')) {
    db.exec(`ALTER TABLE payslips ADD COLUMN store REAL NOT NULL DEFAULT 0;`)
  }

  if (!tableInfo.find((col) => col.name === 'custom_deductions')) {
    db.exec(`ALTER TABLE payslips ADD COLUMN custom_deductions TEXT NOT NULL DEFAULT '[]';`)
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
