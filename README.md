# PaySlip — Desktop Payroll Manager

> **Electron + React + SQLite** desktop application for generating, managing, and printing employee payslips across multiple motel branches. Built for speed, paper efficiency, and zero internet dependency.

**Version:** 1.0.0 · **Platform:** Windows (primary), macOS, Linux · **Package Manager:** pnpm

---

## 📖 The Story

This application was born out of operational necessity for **IDOL MOTEL** and its four sister branches: **BULLSEYE MOTEL**, **LUCKY START MOTEL**, **HAPPYNEST MOTEL**, and a catch-all **OTHERS** category.

### The Problem

Management previously calculated payslips **by hand** — working out daily rates, deductions (SSS, PhilHealth, Pag-IBIG, loans), and net salaries with a calculator, then hand-writing the results onto paper slips and stuffing them into cash envelopes. This process was:

- **Error-prone** — mental math on 6 deduction categories across 8+ employees per branch
- **Time-consuming** — done every 15 days (semi-monthly pay cycle)
- **Paper-wasteful** — each employee got a full sheet despite the slip containing only a few lines
- **Unauditable** — no digital record; if the envelope was lost, the data was gone

### The Solution

This app digitizes the entire payroll cycle:

1. **Input** — Select a branch, pick an employee, enter daily rate + days worked + deductions
2. **Calculate** — The engine auto-computes gross salary, total deductions, and net salary
3. **Store** — Everything is persisted in a local SQLite database (zero cloud dependency)
4. **Print** — A purpose-built `@media print` layout fits **up to 10 payslips on a single A4 page** (2 columns × 5 rows), with dynamic font sizing that scales from 10pt down to 7.5pt depending on how many payslips are on the page. This directly replaces the wasteful one-slip-per-page approach
5. **Export** — Payslips can also be exported as PDF, Microsoft Word (.docx), or Excel (.xlsx) files

---

## 🛠️ Tech Stack

### Core Runtime
| Layer | Technology | Purpose |
|---|---|---|
| Desktop Shell | **Electron 39** | Cross-platform native window, OS dialogs, print-to-PDF |
| Frontend | **React 19** + **TypeScript 5.9** | Component UI with type safety |
| Styling | **Tailwind CSS 4** + **Shadcn UI** (Radix primitives) | Design system with custom components |
| Database | **better-sqlite3** | Synchronous, embedded SQLite with WAL mode |
| Routing | **react-router-dom 7** (HashRouter) | Client-side SPA navigation |
| Build Tool | **electron-vite 5** + **Vite 7** | Fast HMR dev server + production bundler |

### Export Engines (Main Process)
| Format | Library | Method |
|---|---|---|
| PDF (programmatic) | `jspdf` + `jspdf-autotable` | Tabular report via `autoTable(doc, {...})` |
| PDF (screen-identical) | Electron `printToPDF` | Captures the Print Preview exactly as rendered |
| Word (.docx) | `docx` | Paragraph + table builder with bold net-salary rows |
| Excel (.xlsx) | `exceljs` | Styled workbook with PHP currency formatting |

### Dev & Test
| Tool | Purpose |
|---|---|
| **Vitest 4** | Unit tests (calculations, database schema) |
| **Playwright 1.58** | E2E tests against the built Electron app |
| **ESLint 9** + **Prettier 3** | Linting and formatting |
| **sql.js** | Pure-JS SQLite for unit tests (no native bindings needed) |
| **electron-builder 26** | NSIS installer packaging for Windows |

---

## 🧠 AI Agent Context

> **This section exists exclusively for future AI agents.** It maps the architecture, database schema, IPC bridge, and file structure so you can modify this codebase without re-reading every file.

### Project Structure

```
src/
├── main/                     # Electron Main Process (Node.js)
│   ├── index.ts              # Window creation, IPC registration, security flags
│   ├── database.ts           # SQLite init, schema, WAL mode, singleton
│   ├── ipc/                  # IPC handler groups (one file per domain)
│   │   ├── branches.ts       # branches:getAll, branches:update
│   │   ├── employees.ts      # employees:getByBranch, create, update, delete
│   │   ├── payslips.ts       # payslips:create, getByBranch, getById, delete,
│   │   │                     #   getBatchForPrint, getDistinctPeriods
│   │   ├── export.ts         # export:pdf, export:printPdf, export:docx, export:xlsx,
│   │   │                     #   dialog:saveFile
│   │   └── settings.ts       # settings:clearAllData
│   └── lib/                  # Export generators (called by IPC handlers)
│       ├── pdf-generator.ts   # jspdf + autoTable
│       ├── docx-generator.ts  # docx library
│       └── xlsx-generator.ts  # exceljs library
├── preload/
│   └── index.ts              # contextBridge — exposes `window.api` to renderer
├── shared/                   # Code shared across main + renderer
│   ├── types.ts              # All TypeScript interfaces + PayslipAPI contract
│   └── calculations.ts       # calculatePayslip, roundTo2, formatCurrency, formatDate
└── renderer/src/             # React Frontend (Browser Context)
    ├── main.tsx              # React entry (imports globals.css, renders <App>)
    ├── App.tsx               # HashRouter with 7 routes inside AppLayout
    ├── assets/
    │   └── globals.css       # Tailwind v4 @import, custom theme, @media print rules
    ├── components/
    │   ├── AppLayout.tsx     # Sidebar + main content wrapper
    │   ├── PrintLayout.tsx   # A4 print grid (2 cols × 5 rows, page breaks)
    │   └── ui/               # Shadcn components: button, card, dialog, input,
    │                         #   label, select, separator, table
    ├── hooks/
    │   └── useApi.ts         # React hooks: useBranches, useEmployees, usePayslips,
    │                         #   usePrintBatch, usePayPeriods
    ├── lib/
    │   ├── calculations.ts   # Re-export barrel → shared/calculations.ts
    │   └── utils.ts          # cn() utility (clsx + tailwind-merge)
    └── pages/                # Route pages
        ├── Dashboard.tsx     # Stats overview (total payslips, salary, deductions)
        ├── NewPayslip.tsx    # Payslip creation form with live calculation
        ├── PayslipLog.tsx    # Filterable payslip history table with delete
        ├── Employees.tsx     # CRUD for employees per branch
        ├── Branches.tsx      # Branch name editing
        ├── PrintPreview.tsx  # Branch + period selector → PrintLayout + export buttons
        └── Settings.tsx      # Clear all data with confirmation dialog
```

### SQLite Database Schema

The database file is stored at `{userData}/payslip.db` (e.g., `%APPDATA%/payslip-app/payslip.db` on Windows). WAL mode and foreign keys are enabled on every connection.

```sql
-- BRANCHES (5 seeded on first launch)
CREATE TABLE branches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
-- Seeds: IDOL MOTEL, BULLSEYE MOTEL, LUCKY START MOTEL, HAPPYNEST MOTEL, OTHERS

-- EMPLOYEES (soft-delete via is_active flag)
CREATE TABLE employees (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id   INTEGER NOT NULL REFERENCES branches(id),
  name        TEXT    NOT NULL,
  position    TEXT,                              -- nullable (e.g., "Frontman", "Cashier")
  is_active   INTEGER NOT NULL DEFAULT 1,       -- 1 = active, 0 = soft-deleted
  created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX idx_employees_branch ON employees(branch_id);

-- PAYSLIPS (the core data — one row per employee per pay period)
CREATE TABLE payslips (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id       INTEGER NOT NULL REFERENCES employees(id),
  branch_id         INTEGER NOT NULL REFERENCES branches(id),
  pay_period_start  TEXT    NOT NULL,           -- ISO date "2026-03-01"
  pay_period_end    TEXT    NOT NULL,           -- ISO date "2026-03-15"
  daily_rate        REAL    NOT NULL,
  days_worked       REAL    NOT NULL,           -- supports half-days (e.g., 15.5)
  total_salary      REAL    NOT NULL,           -- daily_rate × days_worked
  sss_premium       REAL    NOT NULL DEFAULT 0, -- 6 deduction categories
  sss_loan          REAL    NOT NULL DEFAULT 0,
  philhealth        REAL    NOT NULL DEFAULT 0,
  pagibig           REAL    NOT NULL DEFAULT 0,
  pagibig_loan      REAL    NOT NULL DEFAULT 0,
  others            REAL    NOT NULL DEFAULT 0,
  others_note       TEXT,                       -- freeform note for "others" deduction
  total_deductions  REAL    NOT NULL DEFAULT 0, -- sum of all 6 deductions
  net_salary        REAL    NOT NULL,           -- total_salary - total_deductions
  created_at        TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_branch   ON payslips(branch_id);
CREATE INDEX idx_payslips_period   ON payslips(pay_period_start, pay_period_end);
```

### Electron IPC Channel Map

All communication between the React renderer and the Node.js main process goes through `contextBridge` → `window.api`. The renderer **never** has direct access to Node APIs or the database.

```
┌─────────────────────────────────────────────────────────────────┐
│  RENDERER (React)                                               │
│  window.api.methodName(args)                                    │
│       ↓ ipcRenderer.invoke('channel', args)                     │
├─────────────────────────────────────────────────────────────────┤
│  PRELOAD (preload/index.ts)                                     │
│  contextBridge.exposeInMainWorld('api', { ... })                │
├─────────────────────────────────────────────────────────────────┤
│  MAIN PROCESS (main/ipc/*.ts)                                   │
│  ipcMain.handle('channel', handler)                             │
└─────────────────────────────────────────────────────────────────┘
```

| Group | Channel | Handler File | Description |
|---|---|---|---|
| **Branches** | `branches:getAll` | `ipc/branches.ts` | Returns all 5 branches |
| | `branches:update` | | Rename a branch |
| **Employees** | `employees:getByBranch` | `ipc/employees.ts` | Active employees for a branch |
| | `employees:create` | | Add employee to branch |
| | `employees:update` | | Edit name/position/active status |
| | `employees:delete` | | Hard-delete an employee |
| **Payslips** | `payslips:create` | `ipc/payslips.ts` | Insert new payslip row |
| | `payslips:getByBranch` | | Filter by branch + optional date range (null = all) |
| | `payslips:getById` | | Single payslip with JOINed names |
| | `payslips:delete` | | Hard-delete a payslip |
| | `payslips:getBatchForPrint` | | Payslips for a branch+period, ordered by employee name |
| | `payslips:getDistinctPeriods` | | Grouped pay periods per branch with count |
| **Export** | `export:pdf` | `ipc/export.ts` | Programmatic PDF via jspdf+autoTable |
| | `export:printPdf` | | Screen-identical PDF via Electron printToPDF |
| | `export:docx` | | MS Word export via docx library |
| | `export:xlsx` | | MS Excel export via exceljs library |
| | `dialog:saveFile` | | Native OS save-file dialog |
| **Settings** | `settings:clearAllData` | `ipc/settings.ts` | Wipes all tables, resets autoincrement, re-seeds branches |

### Security Configuration

```typescript
// main/index.ts → BrowserWindow webPreferences
{
  contextIsolation: true,    // renderer cannot access Node globals
  nodeIntegration: false,    // no require() in renderer
  sandbox: false             // required for better-sqlite3 native bindings
}
```

All IPC handlers validate input arguments at runtime before executing SQL queries. Parameterized queries are used everywhere (no string concatenation SQL).

### Print Layout Architecture

The print system is the most business-critical feature. It is designed to save paper:

- `PrintLayout.tsx` chunks payslips into **pages of 10** (2 columns × 5 rows)
- Font size scales dynamically: `10pt` (≤4 slips) → `9pt` (≤6) → `8pt` (≤8) → `7.5pt` (≤10)
- Each page gets `page-break-after: always` for multi-page printing
- `globals.css` contains `@media print` rules that hide the sidebar, scrollbars, and neutralize the `flex h-screen` app layout wrapper
- The "Save as PDF (Identical)" button uses Electron's `webContents.printToPDF()` to capture the exact visual layout with custom A4 margins (0.15in all sides)

### Calculation Engine

Located in `src/shared/calculations.ts` — a single source of truth used by both the renderer (live preview) and the main process (export generators).

```
total_salary    = roundTo2(daily_rate × days_worked)
total_deductions = roundTo2(sss_premium + sss_loan + philhealth + pagibig + pagibig_loan + others)
net_salary      = roundTo2(total_salary - total_deductions)
```

Currency is formatted as `₱1,234.56` using `Intl.NumberFormat('en-PH', { currency: 'PHP' })`.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 20
- **pnpm** (recommended; npm/yarn work but lockfile is pnpm)
- **Windows** for building the .exe installer (cross-compilation is possible but untested)

### Install

```bash
pnpm install
```

### Development (Hot Reload)

```bash
pnpm dev
```

Opens the Electron window with Vite HMR on `http://localhost:5173/`. Changes to React components reflect instantly. Changes to `main/` or `preload/` trigger a full Electron restart.

### Build (Typecheck + Bundle)

```bash
npm run build
```

Runs TypeScript type-checking (`tsc --noEmit` for both Node and Web configs) then bundles via electron-vite. Output goes to `out/`.

### Package as Windows Installer (.exe)

```bash
npm run build:win
```

Produces an NSIS installer at `dist/payslip-app-1.0.0-setup.exe`.

### Run Tests

```bash
# Unit tests only (68 tests, ~1.5s)
npm test

# E2E tests only (17 tests, ~28s) — builds first, then launches Playwright
npm run test:e2e

# Both unit + E2E sequentially
npm run test:all
```

### All Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Dev server with HMR |
| `npm run build` | Typecheck + bundle |
| `npm run build:win` | Build + package Windows .exe installer |
| `npm run build:mac` | Build + package macOS .dmg |
| `npm run build:linux` | Build + package Linux AppImage/deb/snap |
| `npm run build:unpack` | Build + unpack (no installer, for debugging) |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Build + run Playwright E2E tests |
| `npm run test:all` | Unit tests + E2E tests sequentially |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint (cached) |
| `npm run format` | Prettier format all files |
| `npm run typecheck` | TypeScript check (Node + Web) |
| `npm start` | Preview production build in Electron (must build first) |

---

## 🧪 Test Architecture

### Unit Tests (`tests/unit/`)
- **`calculations.test.ts`** (29 tests) — `roundTo2`, `calculatePayslip`, `formatCurrency`, `formatDate` with happy/sad/edge paths
- **`database.test.ts`** (39 tests) — Schema validation, CRUD operations, FK constraints, distinct period queries, batch queries, clear-data + re-seed. Uses `sql.js` (pure JS SQLite) so no native bindings are needed

### E2E Tests (`tests/e2e/`)
- **`app.spec.ts`** (17 tests) — Full lifecycle in a real Electron window via Playwright:
  - Navigation (sidebar, all 7 pages)
  - Branch management
  - Employee CRUD (add, verify, edge cases)
  - Payslip creation for a realistic roster (8 employees across positions: Frontman, Roomboy, Cashier, Maintenance)
  - Payslip log filtering + Dashboard stat verification
  - Print Preview lifecycle (branch → period dropdown → layout rendering)
  - Multi-branch lifecycle (second branch employee + payslip + cross-branch dashboard)
  - Settings clear-data with confirmation dialog + post-clear verification

**Idempotency:** E2E tests call `window.api.clearAllData()` in both `beforeAll` and `afterAll` to ensure every run starts and ends with a clean database.

---

## 🗺️ Future Roadmap

- [ ] Payslip PDF auto-attach to email (SMTP integration)
- [ ] Payroll period templates (recurring schedules)
- [ ] Employee salary history tracking
- [ ] Multi-user login with role-based access
- [ ] Auto-update via electron-updater
- [ ] Backup/restore database to USB or cloud
- [ ] Dark mode toggle
- [ ] Branch-level reporting (monthly/quarterly summaries)
