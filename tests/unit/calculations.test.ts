import { describe, it, expect } from 'vitest'
import {
  calculatePayslip,
  roundTo2,
  formatCurrency,
  formatDate
} from '../../src/renderer/src/lib/calculations'

// ============================================================
// roundTo2 — Happy & Sad Paths
// ============================================================
describe('roundTo2', () => {
  // Happy paths
  it('rounds standard decimals to 2 places', () => {
    expect(roundTo2(1.555)).toBe(1.56)
    expect(roundTo2(10.123)).toBe(10.12)
    expect(roundTo2(99.999)).toBe(100)
  })

  it('keeps integers unchanged', () => {
    expect(roundTo2(5)).toBe(5)
    expect(roundTo2(100)).toBe(100)
  })

  it('keeps already-2-decimal values unchanged', () => {
    expect(roundTo2(3.14)).toBe(3.14)
    expect(roundTo2(99.99)).toBe(99.99)
  })

  // Sad / edge paths
  it('handles zero', () => {
    expect(roundTo2(0)).toBe(0)
  })

  it('handles negative numbers', () => {
    expect(roundTo2(-1.559)).toBe(-1.56)
    expect(roundTo2(-0.001)).toBeCloseTo(0)
    expect(roundTo2(-5.5)).toBe(-5.5)
  })

  it('handles very small numbers', () => {
    expect(roundTo2(0.001)).toBe(0)
    expect(roundTo2(0.009)).toBe(0.01)
  })

  it('handles very large numbers', () => {
    expect(roundTo2(9999999.999)).toBe(10000000)
  })
})

// ============================================================
// calculatePayslip — Happy & Sad Paths
// ============================================================
describe('calculatePayslip', () => {
  // Happy paths
  it('calculates total salary = daily rate × days worked', () => {
    const result = calculatePayslip({
      daily_rate: 500,
      days_worked: 15,
      overtime: 0,
      custom_deductions: []
    })
    expect(result.total_salary).toBe(7500)
    expect(result.total_deductions).toBe(0)
    expect(result.net_salary).toBe(7500)
  })

  it('calculates all 6 deduction fields', () => {
    const result = calculatePayslip({
      daily_rate: 600,
      days_worked: 15,
      overtime: 0,
      custom_deductions: [
        { name: 'SSS Premium', amount: 400 },
        { name: 'SSS Loan', amount: 200 },
        { name: 'Philhealth', amount: 300 },
        { name: 'Pagibig', amount: 100 },
        { name: 'Pagibig Loan', amount: 150 },
        { name: 'Others', amount: 50 }
      ]
    })
    expect(result.total_salary).toBe(9000)
    expect(result.total_deductions).toBe(1200)
    expect(result.net_salary).toBe(7800)
  })

  it('handles half-day worked (0.5)', () => {
    const result = calculatePayslip({
      daily_rate: 500,
      days_worked: 15.5,
      overtime: 0,
      custom_deductions: []
    })
    expect(result.total_salary).toBe(7750)
  })

  it('handles decimal precision in real-world scenario', () => {
    const result = calculatePayslip({
      daily_rate: 456.78,
      days_worked: 13,
      overtime: 0,
      custom_deductions: [
        { name: 'SSS Premium', amount: 180.5 },
        { name: 'Philhealth', amount: 225.25 },
        { name: 'Pagibig', amount: 100 }
      ]
    })
    expect(result.total_salary).toBe(5938.14)
    expect(result.total_deductions).toBe(505.75)
    expect(result.net_salary).toBe(5432.39)
  })

  it('calculates a typical motel employee payslip', () => {
    const result = calculatePayslip({
      daily_rate: 537,
      days_worked: 26,
      overtime: 0,
      custom_deductions: [
        { name: 'SSS Premium', amount: 580 },
        { name: 'SSS Loan', amount: 1000 },
        { name: 'Philhealth', amount: 250 },
        { name: 'Pagibig', amount: 100 },
        { name: 'Pagibig Loan', amount: 500 },
        { name: 'Others', amount: 200 }
      ]
    })
    expect(result.total_salary).toBe(13962)
    expect(result.total_deductions).toBe(2630)
    expect(result.net_salary).toBe(11332)
  })

  // Sad / edge paths
  it('handles all-zero inputs gracefully', () => {
    const result = calculatePayslip({
      daily_rate: 0,
      days_worked: 0,
      overtime: 0,
      custom_deductions: []
    })
    expect(result.total_salary).toBe(0)
    expect(result.total_deductions).toBe(0)
    expect(result.net_salary).toBe(0)
  })

  it('returns negative net salary when deductions exceed salary', () => {
    const result = calculatePayslip({
      daily_rate: 100,
      days_worked: 1,
      overtime: 0,
      custom_deductions: [{ name: 'SSS Premium', amount: 200 }]
    })
    expect(result.total_salary).toBe(100)
    expect(result.total_deductions).toBe(200)
    expect(result.net_salary).toBe(-100)
  })

  it('handles salary with zero days worked (no earnings)', () => {
    const result = calculatePayslip({
      daily_rate: 500,
      days_worked: 0,
      overtime: 0,
      custom_deductions: [{ name: 'SSS Premium', amount: 100 }]
    })
    expect(result.total_salary).toBe(0)
    expect(result.total_deductions).toBe(100)
    expect(result.net_salary).toBe(-100)
  })

  it('handles only one deduction field being non-zero', () => {
    const result = calculatePayslip({
      daily_rate: 500,
      days_worked: 10,
      overtime: 0,
      custom_deductions: [{ name: 'Others', amount: 250 }]
    })
    expect(result.total_salary).toBe(5000)
    expect(result.total_deductions).toBe(250)
    expect(result.net_salary).toBe(4750)
  })

  it('handles very large inputs', () => {
    const result = calculatePayslip({
      daily_rate: 99999.99,
      days_worked: 31,
      overtime: 0,
      custom_deductions: []
    })
    expect(result.total_salary).toBe(3099999.69)
    expect(result.net_salary).toBe(3099999.69)
  })

  it('handles fractional daily rate', () => {
    const result = calculatePayslip({
      daily_rate: 333.33,
      days_worked: 3,
      overtime: 0,
      custom_deductions: []
    })
    expect(result.total_salary).toBe(999.99)
  })
})

// ============================================================
// formatCurrency — Happy & Sad Paths
// ============================================================
describe('formatCurrency', () => {
  // Happy paths
  it('formats standard amounts as PHP', () => {
    const formatted = formatCurrency(1234.56)
    expect(formatted).toContain('1,234.56')
  })

  it('formats whole numbers with .00', () => {
    const formatted = formatCurrency(5000)
    expect(formatted).toContain('5,000.00')
  })

  it('formats large amounts with commas', () => {
    const formatted = formatCurrency(999999.99)
    expect(formatted).toContain('999,999.99')
  })

  // Sad / edge paths
  it('formats zero', () => {
    const formatted = formatCurrency(0)
    expect(formatted).toContain('0.00')
  })

  it('formats negative amounts', () => {
    const formatted = formatCurrency(-500)
    expect(formatted).toContain('500.00')
  })

  it('formats very small amounts', () => {
    const formatted = formatCurrency(0.01)
    expect(formatted).toContain('0.01')
  })

  it('formats single digit amounts', () => {
    const formatted = formatCurrency(5)
    expect(formatted).toContain('5.00')
  })
})

// ============================================================
// formatDate — Happy & Sad Paths
// ============================================================
describe('formatDate', () => {
  // Happy paths
  it('formats ISO date to readable format', () => {
    const formatted = formatDate('2025-01-15')
    expect(formatted).toContain('Jan')
    expect(formatted).toContain('15')
    expect(formatted).toContain('2025')
  })

  it('formats end-of-year date', () => {
    const formatted = formatDate('2025-12-31')
    expect(formatted).toContain('Dec')
    expect(formatted).toContain('31')
    expect(formatted).toContain('2025')
  })

  it('formats leap day', () => {
    const formatted = formatDate('2024-02-29')
    expect(formatted).toContain('Feb')
    expect(formatted).toContain('29')
    expect(formatted).toContain('2024')
  })

  it('formats first day of year', () => {
    const formatted = formatDate('2025-01-01')
    expect(formatted).toContain('Jan')
    expect(formatted).toContain('1')
    expect(formatted).toContain('2025')
  })
})
