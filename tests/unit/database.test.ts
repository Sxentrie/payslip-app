import { describe, it, expect, beforeEach } from 'vitest'
import initSqlJs, { type Database } from 'sql.js'

// Pure JS SQLite (sql.js) — works under regular Node.js without Electron
let SQL: Awaited<ReturnType<typeof initSqlJs>>

async function createTestDatabase(): Promise<Database> {
  if (!SQL) {
    SQL = await initSqlJs()
  }
  const db = new SQL.Database()
  db.run('PRAGMA foreign_keys = ON')

  db.run(`
    CREATE TABLE IF NOT EXISTS branches (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );

    INSERT OR IGNORE INTO branches (name) VALUES
      ('IDOL MOTEL'),
      ('BULLSEYE MOTEL'),
      ('LUCKY START MOTEL'),
      ('HAPPYNEST MOTEL'),
      ('OTHERS');
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id   INTEGER NOT NULL,
      name        TEXT    NOT NULL,
      position    TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS payslips (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id     INTEGER NOT NULL,
      branch_id       INTEGER NOT NULL,
      pay_period_start TEXT   NOT NULL,
      pay_period_end   TEXT   NOT NULL,
      daily_rate      REAL    NOT NULL,
      days_worked     REAL    NOT NULL,
      total_salary    REAL    NOT NULL,
      sss_premium     REAL    NOT NULL DEFAULT 0,
      sss_loan        REAL    NOT NULL DEFAULT 0,
      philhealth      REAL    NOT NULL DEFAULT 0,
      pagibig         REAL    NOT NULL DEFAULT 0,
      pagibig_loan    REAL    NOT NULL DEFAULT 0,
      others          REAL    NOT NULL DEFAULT 0,
      others_note     TEXT,
      total_deductions REAL   NOT NULL DEFAULT 0,
      net_salary       REAL   NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (branch_id)   REFERENCES branches(id)
    );
  `)

  return db
}

// Helper: get all rows from a query
function allRows(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

// Helper: get a single row
function getRow(db: Database, sql: string, params: any[] = []): any | undefined {
  const rows = allRows(db, sql, params)
  return rows.length > 0 ? rows[0] : undefined
}

// Helper: run a statement
function runSql(db: Database, sql: string, params: any[] = []): void {
  db.run(sql, params)
}

// ============================================================
// BRANCHES — Happy & Sad Paths
// ============================================================
describe('Branches', () => {
  let db: Database

  beforeEach(async () => {
    db = await createTestDatabase()
  })

  // Happy paths
  it('seeds 5 default branches on init', () => {
    const branches = allRows(db, 'SELECT * FROM branches ORDER BY id')
    expect(branches).toHaveLength(5)
    expect(branches.map((b) => b.name)).toEqual([
      'IDOL MOTEL',
      'BULLSEYE MOTEL',
      'LUCKY START MOTEL',
      'HAPPYNEST MOTEL',
      'OTHERS'
    ])
  })

  it('each branch has an id, name, and created_at', () => {
    const branch = getRow(db, 'SELECT * FROM branches WHERE id = ?', [1])
    expect(branch.id).toBe(1)
    expect(branch.name).toBe('IDOL MOTEL')
    expect(branch.created_at).toBeTruthy()
  })

  it('updates a branch name', () => {
    runSql(db, 'UPDATE branches SET name = ? WHERE id = ?', ['IDOL INN', 1])
    const branch = getRow(db, 'SELECT * FROM branches WHERE id = ?', [1])
    expect(branch.name).toBe('IDOL INN')
  })

  // Sad paths
  it('rejects duplicate branch name', () => {
    expect(() => {
      runSql(db, 'INSERT INTO branches (name) VALUES (?)', ['IDOL MOTEL'])
    }).toThrow()
  })

  it('rejects null branch name', () => {
    expect(() => {
      runSql(db, 'INSERT INTO branches (name) VALUES (?)', [null])
    }).toThrow()
  })

  it('returns undefined for non-existent branch id', () => {
    const branch = getRow(db, 'SELECT * FROM branches WHERE id = ?', [999])
    expect(branch).toBeUndefined()
  })
})

// ============================================================
// EMPLOYEES — Happy & Sad Paths
// ============================================================
describe('Employees', () => {
  let db: Database

  beforeEach(async () => {
    db = await createTestDatabase()
  })

  // Happy paths
  it('creates an employee with all fields', () => {
    runSql(db, 'INSERT INTO employees (branch_id, name, position) VALUES (?, ?, ?)', [
      1,
      'Juan Dela Cruz',
      'Front Desk'
    ])
    const emp = getRow(db, 'SELECT * FROM employees WHERE name = ?', ['Juan Dela Cruz'])
    expect(emp.name).toBe('Juan Dela Cruz')
    expect(emp.branch_id).toBe(1)
    expect(emp.position).toBe('Front Desk')
    expect(emp.is_active).toBe(1)
  })

  it('creates an employee without position (nullable)', () => {
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, 'No Position'])
    const emp = getRow(db, 'SELECT * FROM employees WHERE name = ?', ['No Position'])
    expect(emp.position).toBeNull()
  })

  it('queries active employees by branch', () => {
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, 'Employee A'])
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, 'Employee B'])
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [2, 'Employee C'])

    const branch1 = allRows(
      db,
      'SELECT * FROM employees WHERE branch_id = ? AND is_active = 1',
      [1]
    )
    expect(branch1).toHaveLength(2)

    const branch2 = allRows(
      db,
      'SELECT * FROM employees WHERE branch_id = ? AND is_active = 1',
      [2]
    )
    expect(branch2).toHaveLength(1)
  })

  it('soft-deletes an employee (is_active = 0)', () => {
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, 'To Delete'])
    runSql(db, 'UPDATE employees SET is_active = 0 WHERE name = ?', ['To Delete'])

    const emp = getRow(db, 'SELECT * FROM employees WHERE name = ?', ['To Delete'])
    expect(emp.is_active).toBe(0)

    const active = allRows(
      db,
      'SELECT * FROM employees WHERE branch_id = ? AND is_active = 1',
      [1]
    )
    expect(active).toHaveLength(0)
  })

  it('returns empty array for branch with no employees', () => {
    const result = allRows(
      db,
      'SELECT * FROM employees WHERE branch_id = ? AND is_active = 1',
      [3]
    )
    expect(result).toEqual([])
  })

  // Sad paths
  it('rejects employee with non-existent branch_id (FK constraint)', () => {
    expect(() => {
      runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [999, 'Nobody'])
    }).toThrow()
  })

  it('rejects employee without a name (NOT NULL)', () => {
    expect(() => {
      runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, null])
    }).toThrow()
  })
})

// ============================================================
// PAYSLIPS — Happy & Sad Paths
// ============================================================
describe('Payslips', () => {
  let db: Database

  beforeEach(async () => {
    db = await createTestDatabase()
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, 'Test Employee'])
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, 'Second Employee'])
  })

  const insertPayslip = (
    overrides: Partial<{
      employee_id: number
      branch_id: number
      pay_period_start: string
      pay_period_end: string
      daily_rate: number
      days_worked: number
      total_salary: number
      sss_premium: number
      total_deductions: number
      net_salary: number
    }> = {}
  ) => {
    const d = {
      employee_id: 1,
      branch_id: 1,
      pay_period_start: '2025-01-01',
      pay_period_end: '2025-01-15',
      daily_rate: 500,
      days_worked: 15,
      total_salary: 7500,
      sss_premium: 0,
      total_deductions: 0,
      net_salary: 7500,
      ...overrides
    }
    runSql(
      db,
      `INSERT INTO payslips (employee_id, branch_id, pay_period_start, pay_period_end,
        daily_rate, days_worked, total_salary, sss_premium, total_deductions, net_salary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.employee_id,
        d.branch_id,
        d.pay_period_start,
        d.pay_period_end,
        d.daily_rate,
        d.days_worked,
        d.total_salary,
        d.sss_premium,
        d.total_deductions,
        d.net_salary
      ]
    )
  }

  // Happy paths
  it('creates a payslip and retrieves it', () => {
    insertPayslip()
    const payslip = getRow(db, 'SELECT * FROM payslips ORDER BY id DESC LIMIT 1')
    expect(payslip.daily_rate).toBe(500)
    expect(payslip.days_worked).toBe(15)
    expect(payslip.total_salary).toBe(7500)
    expect(payslip.net_salary).toBe(7500)
  })

  it('creates multiple payslips for same employee', () => {
    insertPayslip({ pay_period_start: '2025-01-01', pay_period_end: '2025-01-15' })
    insertPayslip({ pay_period_start: '2025-01-16', pay_period_end: '2025-01-31' })

    const payslips = allRows(db, 'SELECT * FROM payslips WHERE employee_id = ?', [1])
    expect(payslips).toHaveLength(2)
  })

  it('runs the duplicate guard query successfully without syntax errors', () => {
    insertPayslip({ pay_period_start: '2026-03-01', pay_period_end: '2026-03-15' })
    const existing = getRow(db, `
      SELECT p.id, e.name as employee_name
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.employee_id = ? AND p.pay_period_start = ? AND p.pay_period_end = ?
      LIMIT 1
    `, [1, '2026-03-01', '2026-03-15'])
    expect(existing).toBeDefined()
    expect(existing.employee_name).toBe('Test Employee')
  })

  it('joins payslip with employee and branch names', () => {
    insertPayslip()
    const payslips = allRows(
      db,
      `SELECT p.*, e.name as employee_name, b.name as branch_name
       FROM payslips p
       JOIN employees e ON p.employee_id = e.id
       JOIN branches b ON p.branch_id = b.id
       WHERE p.branch_id = ?`,
      [1]
    )
    expect(payslips).toHaveLength(1)
    expect(payslips[0].employee_name).toBe('Test Employee')
    expect(payslips[0].branch_name).toBe('IDOL MOTEL')
  })

  it('filters payslips by date period', () => {
    insertPayslip({ pay_period_start: '2025-01-01', pay_period_end: '2025-01-15' })
    insertPayslip({ pay_period_start: '2025-02-01', pay_period_end: '2025-02-15' })

    const january = allRows(
      db,
      `SELECT * FROM payslips WHERE branch_id = ?
       AND pay_period_start >= ? AND pay_period_end <= ?`,
      [1, '2025-01-01', '2025-01-31']
    )
    expect(january).toHaveLength(1)

    const all = allRows(db, 'SELECT * FROM payslips WHERE branch_id = ?', [1])
    expect(all).toHaveLength(2)
  })

  it('creates payslips for different employees on same branch', () => {
    insertPayslip({ employee_id: 1 })
    insertPayslip({ employee_id: 2 })

    const payslips = allRows(db, 'SELECT * FROM payslips WHERE branch_id = ?', [1])
    expect(payslips).toHaveLength(2)
  })

  it('deletes a payslip permanently', () => {
    insertPayslip()
    const p = getRow(db, 'SELECT * FROM payslips ORDER BY id DESC LIMIT 1')
    runSql(db, 'DELETE FROM payslips WHERE id = ?', [p.id])
    const deleted = getRow(db, 'SELECT * FROM payslips WHERE id = ?', [p.id])
    expect(deleted).toBeUndefined()
  })

  it('stores decimal values accurately', () => {
    insertPayslip({ daily_rate: 456.78, days_worked: 13.5, total_salary: 6166.53, net_salary: 6166.53 })
    const payslip = getRow(db, 'SELECT * FROM payslips ORDER BY id DESC LIMIT 1')
    expect(payslip.daily_rate).toBe(456.78)
    expect(payslip.days_worked).toBe(13.5)
  })

  // Sad paths
  it('rejects payslip with non-existent employee_id', () => {
    expect(() => {
      insertPayslip({ employee_id: 999 })
    }).toThrow()
  })

  it('rejects payslip with non-existent branch_id', () => {
    expect(() => {
      insertPayslip({ branch_id: 999 })
    }).toThrow()
  })

  it('returns empty array when filtering returns no matches', () => {
    insertPayslip()
    const result = allRows(
      db,
      `SELECT * FROM payslips WHERE branch_id = ?
       AND pay_period_start >= ? AND pay_period_end <= ?`,
      [1, '2099-01-01', '2099-12-31']
    )
    expect(result).toEqual([])
  })

  it('returns empty array for branch with no payslips', () => {
    const result = allRows(db, 'SELECT * FROM payslips WHERE branch_id = ?', [3])
    expect(result).toEqual([])
  })
})

// ============================================================
// CLEAR ALL DATA — Happy & Sad Paths
// ============================================================
describe('Clear All Data', () => {
  let db: Database

  beforeEach(async () => {
    db = await createTestDatabase()
  })

  it('clears all data and re-seeds 5 default branches', () => {
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, 'Worker'])
    runSql(
      db,
      `INSERT INTO payslips (employee_id, branch_id, pay_period_start, pay_period_end,
        daily_rate, days_worked, total_salary, total_deductions, net_salary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, 1, '2025-01-01', '2025-01-15', 500, 15, 7500, 0, 7500]
    )

    // Clear all
    db.run('DELETE FROM payslips')
    db.run('DELETE FROM employees')
    db.run('DELETE FROM branches')
    db.run(`INSERT OR IGNORE INTO branches (name) VALUES
      ('IDOL MOTEL'),
      ('BULLSEYE MOTEL'),
      ('LUCKY START MOTEL'),
      ('HAPPYNEST MOTEL'),
      ('OTHERS')`)

    expect(allRows(db, 'SELECT * FROM payslips')).toHaveLength(0)
    expect(allRows(db, 'SELECT * FROM employees')).toHaveLength(0)
    expect(allRows(db, 'SELECT * FROM branches')).toHaveLength(5)
  })

  it('succeeds when database is already empty (no-op)', () => {
    db.run('DELETE FROM payslips')
    db.run('DELETE FROM employees')
    db.run('DELETE FROM branches')
    db.run(`INSERT OR IGNORE INTO branches (name) VALUES
      ('IDOL MOTEL'),
      ('BULLSEYE MOTEL'),
      ('LUCKY START MOTEL'),
      ('HAPPYNEST MOTEL'),
      ('OTHERS')`)

    expect(allRows(db, 'SELECT * FROM branches')).toHaveLength(5)
    expect(allRows(db, 'SELECT * FROM employees')).toHaveLength(0)
    expect(allRows(db, 'SELECT * FROM payslips')).toHaveLength(0)
  })

  it('can insert new data after clearing', () => {
    db.run('DELETE FROM payslips')
    db.run('DELETE FROM employees')
    db.run('DELETE FROM branches')
    db.run(`INSERT OR IGNORE INTO branches (name) VALUES
      ('IDOL MOTEL'),
      ('BULLSEYE MOTEL'),
      ('LUCKY START MOTEL'),
      ('HAPPYNEST MOTEL'),
      ('OTHERS')`)

    // After clear + re-seed, IDs change due to AUTOINCREMENT — query actual ID
    const idol = getRow(db, "SELECT * FROM branches WHERE name = 'IDOL MOTEL'")
    expect(idol).toBeTruthy()

    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [idol.id, 'New Employee'])
    const emp = getRow(db, "SELECT * FROM employees WHERE name = 'New Employee'")
    expect(emp).toBeTruthy()
    expect(emp.name).toBe('New Employee')
    expect(emp.branch_id).toBe(idol.id)
  })
})

// ============================================================
// DISTINCT PAY PERIODS — grouped periods per branch
// ============================================================
describe('Distinct Pay Periods', () => {
  let db: Database

  beforeEach(async () => {
    db = await createTestDatabase()
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, 'Employee A'])
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, 'Employee B'])
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [2, 'Employee C'])
  })

  const insertPayslip = (empId: number, branchId: number, start: string, end: string) => {
    runSql(
      db,
      `INSERT INTO payslips (employee_id, branch_id, pay_period_start, pay_period_end,
        daily_rate, days_worked, total_salary, total_deductions, net_salary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [empId, branchId, start, end, 500, 15, 7500, 0, 7500]
    )
  }

  it('groups payslips by distinct pay periods with count', () => {
    insertPayslip(1, 1, '2026-03-01', '2026-03-15')
    insertPayslip(2, 1, '2026-03-01', '2026-03-15')

    const periods = allRows(
      db,
      `SELECT pay_period_start, pay_period_end, COUNT(*) as count
       FROM payslips WHERE branch_id = ?
       GROUP BY pay_period_start, pay_period_end
       ORDER BY pay_period_start DESC`,
      [1]
    )
    expect(periods).toHaveLength(1)
    expect(periods[0].count).toBe(2)
    expect(periods[0].pay_period_start).toBe('2026-03-01')
  })

  it('returns multiple periods sorted by date descending', () => {
    insertPayslip(1, 1, '2026-01-01', '2026-01-15')
    insertPayslip(1, 1, '2026-03-01', '2026-03-15')
    insertPayslip(1, 1, '2026-02-01', '2026-02-15')

    const periods = allRows(
      db,
      `SELECT pay_period_start, pay_period_end, COUNT(*) as count
       FROM payslips WHERE branch_id = ?
       GROUP BY pay_period_start, pay_period_end
       ORDER BY pay_period_start DESC`,
      [1]
    )
    expect(periods).toHaveLength(3)
    expect(periods[0].pay_period_start).toBe('2026-03-01')
    expect(periods[1].pay_period_start).toBe('2026-02-01')
    expect(periods[2].pay_period_start).toBe('2026-01-01')
  })

  it('returns empty for branch with no payslips', () => {
    const periods = allRows(
      db,
      `SELECT pay_period_start, pay_period_end, COUNT(*) as count
       FROM payslips WHERE branch_id = ?
       GROUP BY pay_period_start, pay_period_end`,
      [3]
    )
    expect(periods).toEqual([])
  })

  it('isolates periods between branches', () => {
    insertPayslip(1, 1, '2026-03-01', '2026-03-15')
    insertPayslip(3, 2, '2026-03-01', '2026-03-15')

    const branch1 = allRows(
      db,
      `SELECT COUNT(*) as count FROM payslips WHERE branch_id = ?
       GROUP BY pay_period_start, pay_period_end`,
      [1]
    )
    const branch2 = allRows(
      db,
      `SELECT COUNT(*) as count FROM payslips WHERE branch_id = ?
       GROUP BY pay_period_start, pay_period_end`,
      [2]
    )
    expect(branch1).toHaveLength(1)
    expect(branch1[0].count).toBe(1)
    expect(branch2).toHaveLength(1)
    expect(branch2[0].count).toBe(1)
  })
})

// ============================================================
// EMPLOYEE UPDATE — name, position, deactivation
// ============================================================
describe('Employee Update', () => {
  let db: Database

  beforeEach(async () => {
    db = await createTestDatabase()
    runSql(db, 'INSERT INTO employees (branch_id, name, position) VALUES (?, ?, ?)', [1, 'Juan', 'Frontman'])
  })

  it('updates employee name only', () => {
    runSql(db, 'UPDATE employees SET name = ? WHERE id = ?', ['Juan Updated', 1])
    const emp = getRow(db, 'SELECT * FROM employees WHERE id = ?', [1])
    expect(emp.name).toBe('Juan Updated')
    expect(emp.position).toBe('Frontman') // unchanged
  })

  it('updates employee position only', () => {
    runSql(db, 'UPDATE employees SET position = ? WHERE id = ?', ['Cashier', 1])
    const emp = getRow(db, 'SELECT * FROM employees WHERE id = ?', [1])
    expect(emp.name).toBe('Juan')
    expect(emp.position).toBe('Cashier')
  })

  it('clears position to null', () => {
    runSql(db, 'UPDATE employees SET position = ? WHERE id = ?', [null, 1])
    const emp = getRow(db, 'SELECT * FROM employees WHERE id = ?', [1])
    expect(emp.position).toBeNull()
  })

  it('deactivated employee not returned in active query', () => {
    runSql(db, 'UPDATE employees SET is_active = 0 WHERE id = ?', [1])
    const active = allRows(db, 'SELECT * FROM employees WHERE branch_id = ? AND is_active = 1', [1])
    expect(active).toHaveLength(0)
    // But still exists in DB
    const all = allRows(db, 'SELECT * FROM employees WHERE branch_id = ?', [1])
    expect(all).toHaveLength(1)
  })

  it('reactivates a deactivated employee', () => {
    runSql(db, 'UPDATE employees SET is_active = 0 WHERE id = ?', [1])
    runSql(db, 'UPDATE employees SET is_active = 1 WHERE id = ?', [1])
    const active = allRows(db, 'SELECT * FROM employees WHERE branch_id = ? AND is_active = 1', [1])
    expect(active).toHaveLength(1)
  })
})

// ============================================================
// PAYSLIP JOIN + BATCH QUERIES
// ============================================================
describe('Payslip Batch Queries', () => {
  let db: Database

  beforeEach(async () => {
    db = await createTestDatabase()
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, 'Alice'])
    runSql(db, 'INSERT INTO employees (branch_id, name) VALUES (?, ?)', [1, 'Bob'])
  })

  const insertPayslip = (empId: number, start: string, end: string) => {
    runSql(
      db,
      `INSERT INTO payslips (employee_id, branch_id, pay_period_start, pay_period_end,
        daily_rate, days_worked, total_salary, total_deductions, net_salary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [empId, 1, start, end, 500, 15, 7500, 0, 7500]
    )
  }

  it('getBatchForPrint returns payslips ordered by employee name', () => {
    insertPayslip(2, '2026-03-01', '2026-03-15') // Bob
    insertPayslip(1, '2026-03-01', '2026-03-15') // Alice

    const batch = allRows(
      db,
      `SELECT p.*, e.name as employee_name
       FROM payslips p JOIN employees e ON p.employee_id = e.id
       WHERE p.branch_id = ? AND p.pay_period_start >= ? AND p.pay_period_end <= ?
       ORDER BY e.name`,
      [1, '2026-03-01', '2026-03-15']
    )
    expect(batch).toHaveLength(2)
    expect(batch[0].employee_name).toBe('Alice')
    expect(batch[1].employee_name).toBe('Bob')
  })

  it('getBatchForPrint excludes payslips outside date range', () => {
    insertPayslip(1, '2026-03-01', '2026-03-15')
    insertPayslip(1, '2026-04-01', '2026-04-15')

    const batch = allRows(
      db,
      `SELECT * FROM payslips
       WHERE branch_id = ? AND pay_period_start >= ? AND pay_period_end <= ?`,
      [1, '2026-03-01', '2026-03-15']
    )
    expect(batch).toHaveLength(1)
  })

  it('getAll with null branchId returns all payslips', () => {
    // Simulate "All Branches" query
    insertPayslip(1, '2026-03-01', '2026-03-15')

    const result = allRows(
      db,
      `SELECT p.*, e.name as employee_name, b.name as branch_name
       FROM payslips p
       JOIN employees e ON p.employee_id = e.id
       JOIN branches b ON p.branch_id = b.id
       ORDER BY p.created_at DESC`
    )
    expect(result.length).toBeGreaterThanOrEqual(1)
  })
})
