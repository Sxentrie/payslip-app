# PaySlip App — Agent Rules

## Identity

This is **PaySlip Manager**, an Electron desktop application for generating, managing, and exporting employee payslips for a Philippine-based motel chain. It targets Windows primarily.

## Tech Stack (Do Not Deviate)

| Layer | Technology |
|---|---|
| Runtime | Electron 39 (`electron-vite` 5) |
| Frontend | React 19, TypeScript 5, React Router 7 (HashRouter) |
| Styling | TailwindCSS 4 (via `@tailwindcss/vite`), shadcn/ui primitives (Radix UI) |
| State | Local React state + custom hooks (`useApi.ts`) — **no global store** |
| Database | SQLite via `better-sqlite3` (synchronous, singleton) |
| Export | `jspdf` + `jspdf-autotable`, `docx`, `exceljs` |
| Testing | Vitest (unit), Playwright (E2E) |
| Package Mgr | pnpm |

## Architecture Rules

### Process Boundary — NEVER Violate

- **Main process** (`src/main/`): Database access, file I/O, dialog APIs, export generation. This is the ONLY process that touches `better-sqlite3` or Node.js `fs`.
- **Preload** (`src/preload/index.ts`): Typed IPC bridge via `contextBridge`. Exposes `window.api` (type: `PayslipAPI`). Never add raw `ipcRenderer.send/on` — always use `ipcRenderer.invoke`.
- **Renderer** (`src/renderer/src/`): React UI. **Zero** direct access to Node.js APIs. All data flows through `window.api` calls, consumed exclusively via custom hooks in `src/renderer/src/hooks/useApi.ts`.

### IPC Contract

1. Every new IPC channel **must** be added in three places:
   - `src/main/ipc/<domain>.ts` — handler registration (`ipcMain.handle`)
   - `src/preload/index.ts` — bridge method (`ipcRenderer.invoke`)
   - `src/shared/types.ts` — `PayslipAPI` interface signature
2. Channel naming convention: `<domain>:<action>` (e.g. `payslips:create`, `employees:getByBranch`).
3. Handler registration functions follow the pattern `register<Domain>Handlers()` and are called in `src/main/index.ts`.

### Data Layer

- Single `payslip.db` file stored in Electron `userData` directory.
- Schema lives in `src/main/database.ts` — `initializeSchema()`. Post-v1 columns are added via safe `ALTER TABLE` migrations guarded by `PRAGMA table_info`.
- WAL journal mode and foreign keys are always enabled.
- All monetary values are `REAL`; rounding to 2 decimal places is enforced by `roundTo2()` in `src/shared/calculations.ts`.
- Currency is **PHP** (Philippine Peso). Use `formatCurrency()` from shared calculations.

### Frontend Conventions

- **Routing**: Flat route table in `App.tsx` → all routes nested under `<AppLayout />` which provides sidebar + `<Outlet />`.
- **Pages**: One file per route in `src/renderer/src/pages/`. Pages are the only components that consume hooks from `useApi.ts`.
- **UI primitives**: Use existing shadcn/ui components from `src/renderer/src/components/ui/`. If a new Radix primitive is needed, follow the shadcn/ui pattern (CVA + `cn()` utility).
- **Icons**: Lucide React only.
- **Path alias**: `@` resolves to `src/renderer/src/` (configured in `electron.vite.config.ts`).

### Shared Code

- `src/shared/types.ts` — Single source of truth for ALL cross-process type definitions. Every interface used by main, preload, and renderer lives here.
- `src/shared/calculations.ts` — Pure functions (`calculatePayslip`, `roundTo2`, `formatCurrency`, `formatDate`). No side effects. Used by both renderer and main-process export generators.
- Renderer re-exports shared calculations via `src/renderer/src/lib/calculations.ts` to maintain the `@/` alias convention.

### Export Generators

- Located in `src/main/lib/` — `pdf-generator.ts`, `docx-generator.ts`, `xlsx-generator.ts`.
- Orchestrated by `src/main/ipc/export.ts` which handles save dialogs and file writing.
- Generators must import formatting utilities from `src/shared/calculations.ts` to guarantee numeric consistency with the UI.

## File Header Convention

Every source file uses this JSDoc header:

```
/**
 * @file: <relative path>
 * @description: <one-line summary>
 * @module: <Process>.<Domain> (e.g. Main.Database, Renderer.Hooks)
 * @overview: <detailed paragraph>
 * @dependencies: <bullet list>
 * @outputs: <exported symbols>
 */
```

**Always** include this header when creating new files. Update it when modifying exports.

## Testing

- **Unit tests**: `tests/unit/` — run with `pnpm test`.
- **E2E tests**: `tests/e2e/` — run with `pnpm test:e2e` (requires a build first).
- When adding a new calculation or utility in `src/shared/`, add a corresponding unit test.
- When adding a new page or critical user flow, add or update an E2E test.

## Critical Warnings

> **NEVER** import from `electron`, `fs`, `path`, `better-sqlite3`, or any Node.js built-in inside `src/renderer/`.

> **NEVER** call `window.api` directly from a page component — always go through a hook in `useApi.ts`.

> **NEVER** hardcode currency formatting — always use `formatCurrency()` from shared calculations.

> **NEVER** modify the database schema inline in IPC handlers — all schema changes go through `src/main/database.ts`.
