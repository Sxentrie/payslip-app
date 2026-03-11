/**
 * @file: src/renderer/src/lib/calculations.ts
 *
 * @description:
 * Re-export barrel that makes shared calculation utilities
 * available via the @/lib/calculations alias.
 *
 * @module: Renderer.Lib.Calculations
 *
 * @overview:
 * Proxies every export from src/shared/calculations.ts so that
 * renderer components can import calculations through the standard
 * @/ alias without reaching into the shared directory. This keeps
 * import paths consistent across the renderer codebase.
 *
 * @dependencies:
 * - src/shared/calculations.ts
 *
 * @outputs:
 * - calculatePayslip (re-export)
 * - formatCurrency (re-export)
 * - formatDate (re-export)
 * - roundTo2 (re-export)
 * - CustomDeduction (re-export, type)
 * - PayslipCalcInput (re-export, type)
 * - PayslipCalcResult (re-export, type)
 */

// Re-export from shared — keeps the @/lib/calculations alias working for renderer code
export {
  calculatePayslip,
  roundTo2,
  formatCurrency,
  formatDate
} from '../../../shared/calculations'

export type { PayslipCalcInput, PayslipCalcResult } from '../../../shared/calculations'
