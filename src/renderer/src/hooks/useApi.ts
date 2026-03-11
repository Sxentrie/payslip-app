/**
 * @file: src/renderer/src/hooks/useApi.ts
 *
 * @description:
 * Custom React hooks that encapsulate every window.api call with
 * loading/error state management and automatic data fetching.
 *
 * @module: Renderer.Hooks
 *
 * @overview:
 * Provides a generic useApiCall hook that wraps any async function
 * with loading, data, and error state. On top of that, specialised
 * hooks are built: useBranches, useEmployees, usePayslips,
 * usePrintBatch, usePayPeriods, and useDeductionTypes. Each hook
 * auto-fetches on mount (or when dependencies change) and exposes
 * a refresh function. This module is the single point of contact
 * between React components and the IPC bridge — no page component
 * calls window.api directly.
 *
 * @dependencies:
 * - react
 * - src/shared/types.ts
 *
 * @outputs:
 * - useApiCall (hook)
 * - useBranches (hook)
 * - useEmployees (hook)
 * - usePayslips (hook)
 * - usePrintBatch (hook)
 * - usePayPeriods (hook)
 * - useDeductionTypes (hook)
 */

import { useState, useEffect, useCallback } from 'react'
import type { Branch, Employee, PayslipInput, PayslipWithDetails, PayPeriod, DeductionType } from '../../../shared/types'

// Generic hook for async API calls
function useApiCall<T>() {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiCall()
      setData(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, execute, setData }
}

// Branch hooks
export function useBranches() {
  const { data: branches, loading, error, execute, setData } = useApiCall<Branch[]>()

  const fetchBranches = useCallback(() => {
    return execute(() => window.api.getBranches())
  }, [execute])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  const updateBranch = useCallback(
    async (id: number, name: string) => {
      const updated = await window.api.updateBranch({ id, name })
      setData((prev) => prev?.map((b) => (b.id === updated.id ? updated : b)) ?? null)
      return updated
    },
    [setData]
  )

  return { branches: branches ?? [], loading, error, refetch: fetchBranches, updateBranch }
}

// Employee hooks
export function useEmployees(branchId: number | null) {
  const { data: employees, loading, error, execute, setData } = useApiCall<Employee[]>()

  const fetchEmployees = useCallback(() => {
    if (branchId === null) return Promise.resolve([])
    return execute(() => window.api.getEmployeesByBranch(branchId))
  }, [branchId, execute])

  useEffect(() => {
    if (branchId !== null) {
      fetchEmployees()
    }
  }, [branchId, fetchEmployees])

  const createEmployee = useCallback(
    async (name: string, position?: string) => {
      if (branchId === null) throw new Error('No branch selected')
      const created = await window.api.createEmployee({ branchId, name, position })
      setData((prev) => [...(prev ?? []), created])
      return created
    },
    [branchId, setData]
  )

  const deleteEmployee = useCallback(
    async (id: number) => {
      await window.api.deleteEmployee(id)
      setData((prev) => prev?.filter((e) => e.id !== id) ?? null)
    },
    [setData]
  )

  return {
    employees: employees ?? [],
    loading,
    error,
    refetch: fetchEmployees,
    createEmployee,
    deleteEmployee
  }
}

// Payslip hooks
export function usePayslips(branchId: number | null) {
  const { data: payslips, loading, error, execute, setData } = useApiCall<PayslipWithDetails[]>()

  const fetchPayslips = useCallback(
    (periodStart?: string, periodEnd?: string) => {
      // Pass branchId (even if null) directly to the backend to support "All Branches" querying
      return execute(() => window.api.getPayslipsByBranch(branchId, periodStart, periodEnd))
    },
    [branchId, execute]
  )

  useEffect(() => {
    fetchPayslips()
  }, [branchId, fetchPayslips])

  const createPayslip = useCallback(
    async (data: PayslipInput) => {
      const created = await window.api.createPayslip(data)
      // Always refetch to keep stats and lists in sync
      await fetchPayslips()
      return created
    },
    [fetchPayslips]
  )

  const deletePayslip = useCallback(
    async (id: number) => {
      await window.api.deletePayslip(id)
      setData((prev) => prev?.filter((p) => p.id !== id) ?? null)
    },
    [setData]
  )

  return {
    payslips: payslips ?? [],
    loading,
    error,
    refetch: fetchPayslips,
    createPayslip,
    deletePayslip
  }
}

// Print batch hooks
export function usePrintBatch() {
  const { data: payslips, loading, error, execute, setData } = useApiCall<PayslipWithDetails[]>()

  const fetchPrintBatch = useCallback(
    (branchId: number, periodStart: string, periodEnd: string) => {
      return execute(() => window.api.getBatchForPrint(branchId, periodStart, periodEnd))
    },
    [execute]
  )

  const clearBatch = useCallback(() => {
    setData(null)
  }, [setData])

  return { payslips, loading, error, fetchPrintBatch, clearBatch }
}

// Pay period hooks — distinct periods per branch
export function usePayPeriods(branchId: number | null) {
  const { data: periods, loading, execute } = useApiCall<PayPeriod[]>()

  const fetchPeriods = useCallback(() => {
    if (branchId === null) return Promise.resolve([])
    return execute(() => window.api.getDistinctPeriods(branchId))
  }, [branchId, execute])

  useEffect(() => {
    if (branchId !== null) {
      fetchPeriods()
    }
  }, [branchId, fetchPeriods])

  return { periods: periods ?? [], loading, refetch: fetchPeriods }
}

// Deduction hooks
export function useDeductionTypes() {
  const { data: deductionTypes, loading, error, execute, setData } = useApiCall<DeductionType[]>()

  const fetchDeductionTypes = useCallback(() => {
    return execute(() => window.api.getDeductionTypes())
  }, [execute])

  useEffect(() => {
    fetchDeductionTypes()
  }, [fetchDeductionTypes])

  const createDeductionType = useCallback(
    async (name: string) => {
      const created = await window.api.createDeductionType(name)
      setData((prev) => [...(prev ?? []), created])
      return created
    },
    [setData]
  )

  const deleteDeductionType = useCallback(
    async (id: number) => {
      await window.api.deleteDeductionType(id)
      setData((prev) => prev?.filter((d) => d.id !== id) ?? null)
    },
    [setData]
  )

  return {
    deductionTypes: deductionTypes ?? [],
    loading,
    error,
    refetch: fetchDeductionTypes,
    createDeductionType,
    deleteDeductionType
  }
}
