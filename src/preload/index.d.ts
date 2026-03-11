/**
 * @file: src/preload/index.d.ts
 *
 * @description:
 * Ambient type declaration that augments the global Window interface
 * with the electron and api properties exposed by the preload bridge.
 *
 * @module: Preload.Types
 *
 * @overview:
 * Declares window.electron (ElectronAPI) and window.api (PayslipAPI)
 * so that renderer TypeScript code can reference these globals with
 * full IntelliSense and compile-time safety, without importing
 * anything. This file is automatically included by the TypeScript
 * compiler via tsconfig.web.json.
 *
 * @dependencies:
 * - @electron-toolkit/preload
 * - src/shared/types.ts
 *
 * @outputs:
 * - Window (global interface augmentation)
 */

import { ElectronAPI } from '@electron-toolkit/preload'
import type { PayslipAPI } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: PayslipAPI
  }
}
