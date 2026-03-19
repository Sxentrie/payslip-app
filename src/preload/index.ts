/**
 * @file: src/preload/index.ts
 *
 * @description:
 * Electron preload script that constructs the typed PayslipAPI
 * object and exposes it to the renderer via contextBridge.
 *
 * @module: Preload.Bridge
 *
 * @overview:
 * This script runs in a privileged context with access to Node.js
 * APIs before the renderer page loads. It builds a PayslipAPI
 * object where each method wraps an ipcRenderer.invoke call to a
 * specific main-process channel. The finished API and the
 * electron-toolkit utilities are then exposed on window.api and
 * window.electron respectively via contextBridge, maintaining
 * contextIsolation security. If contextIsolation is disabled
 * (legacy fallback), the objects are assigned directly to window.
 *
 * @dependencies:
 * - electron
 * - @electron-toolkit/preload
 * - src/shared/types.ts
 *
 * @outputs:
 * - None (side-effect-only preload script)
 */

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { PayslipAPI, PayslipInput, FileFilter } from '../shared/types'

const api: PayslipAPI = {
  // Branches
  getBranches: () => ipcRenderer.invoke('branches:getAll'),
  updateBranch: (data) => ipcRenderer.invoke('branches:update', data),

  // Employees
  getEmployeesByBranch: (branchId) => ipcRenderer.invoke('employees:getByBranch', branchId),
  createEmployee: (data) => ipcRenderer.invoke('employees:create', data),
  updateEmployee: (data) => ipcRenderer.invoke('employees:update', data),
  deleteEmployee: (id) => ipcRenderer.invoke('employees:delete', id),

  // Payslips
  createPayslip: (data: PayslipInput) => ipcRenderer.invoke('payslips:create', data),
  getPayslipsByBranch: (branchId, periodStart?, periodEnd?) =>
    ipcRenderer.invoke('payslips:getByBranch', branchId, periodStart, periodEnd),
  getPayslipById: (id) => ipcRenderer.invoke('payslips:getById', id),
  deletePayslip: (id) => ipcRenderer.invoke('payslips:delete', id),
  getBatchForPrint: (branchId, periodStart, periodEnd) =>
    ipcRenderer.invoke('payslips:getBatchForPrint', branchId, periodStart, periodEnd),
  getDistinctPeriods: (branchId) => ipcRenderer.invoke('payslips:getDistinctPeriods', branchId),

  // Export
  exportPdf: (payslipIds) => ipcRenderer.invoke('export:pdf', payslipIds),
  printViewToPdf: () => ipcRenderer.invoke('export:printPdf'),
  exportDocx: (payslipIds) => ipcRenderer.invoke('export:docx', payslipIds),
  exportXlsx: (payslipIds) => ipcRenderer.invoke('export:xlsx', payslipIds),

  // Dialog
  saveFileDialog: (defaultName: string, filters: FileFilter[]) =>
    ipcRenderer.invoke('dialog:saveFile', defaultName, filters),

  // Settings
  clearAllData: () => ipcRenderer.invoke('settings:clearAllData'),

  // Deductions
  getDeductionTypes: () => ipcRenderer.invoke('deductions:getAll'),
  createDeductionType: (name: string) => ipcRenderer.invoke('deductions:create', name),
  deleteDeductionType: (id: number) => ipcRenderer.invoke('deductions:delete', id)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
