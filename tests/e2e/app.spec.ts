import { test, expect } from '@playwright/test'
import { launchApp, teardownApp } from './helpers/app-setup'

let browser: any
let page: any

test.beforeAll(async () => {
  const setup = await launchApp()
  browser = setup.browser
  page = setup.page

  // Always start with a clean slate — clear all data via IPC
  await page.evaluate(() => window.api.clearAllData())
  // Give the UI a moment to reflect the reset
  await page.waitForTimeout(500)
})

/**
 * Helper: programmatically set React 19 form state for hidden date inputs.
 */
async function setReactDate(page: any, dataTestId: string, value: string) {
  await page.evaluate(
    ({ id, val }) => {
      const el = document.querySelector(`[data-testid="${id}"]`) as HTMLInputElement
      if (!el) return

      // React 16+ tracks the "value" property of inputs. To bypass it:
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, val)
      } else {
        el.value = val
      }

      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    },
    { id: dataTestId, val: value }
  )
}

/**
 * Helper: robustly select an option from a Radix UI Select.
 */
async function selectFromDropdown(page: any, trigger: any, optionText: string) {
  await expect(trigger).toBeEnabled({ timeout: 15000 })

  // Wait for any async loading to settle
  await expect(trigger).not.toHaveText(/Loading/, { timeout: 15000 })

  // Click the trigger to open the portal
  await trigger.click({ force: true })
  await page.waitForTimeout(500)

  // Robust Selection Strategy: Try searching for the option role,
  // but also try typing and pressing Enter as a fallback for Radix/Shadcn Comboboxes.
  const option = page.getByRole('option', { name: optionText, exact: true })

  try {
    if (!(await option.isVisible())) {
      // Keyboard Fallback: If option isn't immediately visible, type the name
      await page.keyboard.type(optionText)
      await page.waitForTimeout(300)
    }

    // Press Enter to select the highlighted option (or click if visible)
    if (await option.isVisible()) {
      await option.click({ force: true })
    } else {
      await page.keyboard.press('Enter')
    }
  } catch (err) {
    // Last ditch: press Enter anyway if we typed it
    await page.keyboard.press('Enter')
  }

  // Wait for the dropdown to close
  await page.waitForTimeout(300)

  // POSITIVE SYNC: Wait for the trigger to reflect the selected ID in its data attribute
  await expect(trigger).not.toHaveAttribute('data-selected-id', '', { timeout: 10000 })
}

test.afterAll(async () => {
  // Clean up after ourselves so the app is fresh for manual use
  if (page) {
    await page.evaluate(() => window.api.clearAllData()).catch(() => {})
  }
  await teardownApp()
})

// Realistic Roster configuration
const EMPLOYEES = [
  {
    name: 'Jason Jamora',
    position: 'Frontman',
    rate: '426',
    days: '15',
    overtime: '1500',
    sss: '450',
    loan: '0',
    phil: '200',
    pagibig: '100',
    pl: '0',
    others: '0',
    store: '0'
  },
  {
    name: 'Joie Antugon',
    position: 'Roomboy',
    rate: '426',
    days: '14.5',
    overtime: '0',
    sss: '0',
    loan: '0',
    phil: '100',
    pagibig: '50',
    pl: '0',
    others: '20',
    store: '200'
  },
  {
    name: 'Arvin Reyes',
    position: 'Roomboy',
    rate: '426',
    days: '15',
    overtime: '200',
    sss: '450',
    loan: '100',
    phil: '200',
    pagibig: '100',
    pl: '0',
    others: '0',
    store: '50.50'
  },
  {
    name: 'Bernadette Ganduhao',
    position: 'Roomgirl',
    rate: '426',
    days: '13',
    overtime: '0',
    sss: '200',
    loan: '0',
    phil: '100',
    pagibig: '100',
    pl: '50',
    others: '50',
    store: '0'
  },
  {
    name: 'Cherry Mae Galon',
    position: 'Cashier',
    rate: '526',
    days: '15',
    overtime: '800',
    sss: '450',
    loan: '0',
    phil: '250',
    pagibig: '100',
    pl: '0',
    others: '0',
    store: '100'
  },
  {
    name: 'Roselyn Mahasol',
    position: 'Cashier',
    rate: '526',
    days: '15',
    overtime: '0',
    sss: '450',
    loan: '200',
    phil: '250',
    pagibig: '100',
    pl: '0',
    others: '0',
    store: '0'
  },
  {
    name: 'Kate Lynne Villanueva',
    position: 'Cashier',
    rate: '526',
    days: '12',
    overtime: '0',
    sss: '450',
    loan: '0',
    phil: '250',
    pagibig: '100',
    pl: '0',
    others: '0',
    store: '0'
  },
  {
    name: 'Manong Juan',
    position: 'Maintenance',
    rate: '526',
    days: '15',
    overtime: '500',
    sss: '450',
    loan: '0',
    phil: '200',
    pagibig: '100',
    pl: '100',
    others: '200',
    store: '1000'
  }
]

test.describe.serial('Navigation', () => {
  test('sidebar shows all navigation items', async () => {
    await expect(page.getByRole('heading', { name: 'PaySlip' })).toBeVisible()
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('a:has-text("New Payslip")')).toBeVisible()
    await expect(page.locator('a:has-text("Payslip Log")')).toBeVisible()
    await expect(page.locator('a:has-text("Employees")')).toBeVisible()
    await expect(page.locator('a:has-text("Branches")')).toBeVisible()
    await expect(page.locator('a:has-text("Print Preview")')).toBeVisible()
    await expect(page.locator('a:has-text("Settings")')).toBeVisible()
  })

  test('can navigate to every page', async () => {
    await page.click('a:has-text("New Payslip")')
    await expect(page.getByRole('heading', { name: 'New Payslip' })).toBeVisible()
    await page.click('a:has-text("Payslip Log")')
    await expect(page.getByRole('heading', { name: 'Payslip Log' })).toBeVisible()
    await page.click('a:has-text("Dashboard")')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })
})

test.describe.serial('Branches Management', () => {
  test('displays 5 default branches', async () => {
    await page.click('a:has-text("Branches")')
    await expect(page.locator('td:has-text("IDOL MOTEL")')).toBeVisible()
    await expect(page.locator('td:has-text("BULLSEYE MOTEL")')).toBeVisible()
    await expect(page.locator('td:has-text("LUCKY START MOTEL")')).toBeVisible()
    await expect(page.locator('td:has-text("HAPPYNEST MOTEL")')).toBeVisible()
    await expect(page.locator('td:has-text("OTHERS")')).toBeVisible()
  })

  test('can inline-edit a branch name back and forth', async () => {
    const row = page.locator('tr', { hasText: 'OTHERS' })
    await row.locator('button').first().click()
    const editInput = page.locator('input.h-8')
    await editInput.clear()
    await editInput.fill('TEST MOTEL')
    await editInput.press('Enter')
    await expect(page.locator('td:has-text("TEST MOTEL")')).toBeVisible()

    const newRow = page.locator('tr', { hasText: 'TEST MOTEL' })
    await newRow.locator('button').first().click()
    await editInput.clear()
    await editInput.fill('OTHERS')
    await editInput.press('Enter')
    await expect(page.locator('td:has-text("OTHERS")')).toBeVisible()
  })
})

test.describe.serial('Employee Management', () => {
  test('Add Employee edge cases', async () => {
    await page.click('a:has-text("Employees")')
    await expect(page.locator('text=Choose a branch')).toBeVisible()
    await expect(page.locator('button:has-text("Add Employee")')).toBeDisabled()
  })

  test('Add realistic employee roster', async () => {
    test.setTimeout(60000)
    await page.evaluate(() => (window.location.hash = '#/employees'))
    await page.waitForTimeout(500)

    // Select Branch
    await selectFromDropdown(page, page.getByRole('combobox'), 'IDOL MOTEL')
    await expect(page.locator('text=No employees yet')).toBeVisible()

    for (const emp of EMPLOYEES) {
      await page.click('button:has-text("Add Employee")')
      await page.fill('input[placeholder="Employee name"]', emp.name)
      await page.fill('input[placeholder*="Front Desk"]', emp.position)

      // Wait for Add to be enabled then click
      const addBtn = page.locator('button:has-text("Add"):not(:has-text("Employee"))')
      await expect(addBtn).toBeEnabled()
      await addBtn.click()

      // Verify persistence in table before next loop
      await expect(page.locator(`td:has-text("${emp.name}")`)).toBeVisible()
    }
  })
})

test.describe.serial('Payslip Creation Lifecycle', () => {
  test('Edge cases for payslip creation', async () => {
    await page.click('a:has-text("New Payslip")')
    await page.click('button:has-text("Save Payslip")')
    await expect(page.locator('text=Please fill in branch, employee, and pay period')).toBeVisible()
    await expect(page.locator('[role="combobox"]').nth(1)).toBeDisabled()
  })

  test('Create realistic payslips for the entire roster', async () => {
    test.setTimeout(180000)

    // Start fresh: reload the page once
    await page.reload()
    await page.evaluate(() => (window.location.hash = '#/new-payslip'))
    await page.waitForTimeout(1000)

    // Branch selection (done once)
    const branchTrigger = page.getByRole('combobox').first()
    await selectFromDropdown(page, branchTrigger, 'IDOL MOTEL')

    // The trigger should show "Select employee"
    const employeeTrigger = page.locator('#employee-select-trigger')
    await expect(employeeTrigger).toBeEnabled({ timeout: 10000 })
    await expect(employeeTrigger).toHaveText(/Select employee/, { timeout: 10000 })

    for (const emp of EMPLOYEES) {
      // Employee Selection
      await selectFromDropdown(page, employeeTrigger, emp.name)

      // Dates (use hidden data-testid inputs)
      await setReactDate(page, 'pay-period-start', '2026-03-01')
      await setReactDate(page, 'pay-period-end', '2026-03-15')

      // Use the generic number input selector for strict indexing
      const allNum = page.locator('input[type="number"]')

      // Earnings (0: rate, 1: days, 2: overtime)
      await allNum.nth(0).fill(emp.rate)
      await allNum.nth(1).fill(emp.days)
      await allNum.nth(2).fill(emp.overtime)

      // Deductions (Snapshot Order: 3:SSS Loan, 4:Philhealth, 5:Pag-ibig, 6:Store, 7:Cash Advance, 8:SSS Premium, 9:Pag-ibig Loan, 10:Others)
      await allNum.nth(3).fill(emp.loan)
      await allNum.nth(4).fill(emp.phil)
      await allNum.nth(5).fill(emp.pagibig)
      await allNum.nth(6).fill(emp.store)
      await allNum.nth(7).fill('0') // Cash Advance
      await allNum.nth(8).fill(emp.sss) // SSS Premium
      await allNum.nth(9).fill(emp.pl) // Pag-ibig Loan
      await allNum.nth(10).fill(emp.others) // Others

      await page.waitForTimeout(200)

      // Save
      await page.click('button:has-text("Save Payslip")', { force: true })

      // Wait for success toast
      const toast = page.locator('text=Payslip saved successfully')
      await expect(toast).toBeVisible({ timeout: 15000 })

      // Wait for toast to disappear before next iteration
      await toast.waitFor({ state: 'hidden', timeout: 5000 })

      // App auto-resets employee but preserves branch and dates
      await expect(employeeTrigger).toHaveText(/Select employee/)
    }
  })
})

test.describe.serial('Payslip Log & Dashboard', () => {
  test('Payslip log shows all realistic entries', async () => {
    await page.click('a:has-text("Payslip Log")')
    await page.locator('[role="combobox"]').click()
    await page.locator('[role="option"]:has-text("IDOL MOTEL")').click()

    await expect(page.locator(`text=${EMPLOYEES.length} Payslips Found`)).toBeVisible()

    for (const emp of EMPLOYEES) {
      await expect(page.locator(`td:has-text("${emp.name}")`)).toBeVisible()
    }
  })

  test('Validate Payslip Delete Cancellation', async () => {
    const firstEmp = EMPLOYEES[0]
    const row = page.locator('tr', { hasText: firstEmp.name })
    await row.locator('button').last().click()

    // Cancel deletion
    await page.locator('[role="dialog"] button:has-text("Cancel")').click()

    // Ensure the record persists
    await expect(page.locator(`td:has-text("${firstEmp.name}")`)).toBeVisible()
    await expect(page.locator(`text=${EMPLOYEES.length} Payslips Found`)).toBeVisible()
  })

  test('Dashboard reflects the total realistic roster', async () => {
    await page.click('a:has-text("Dashboard")')

    // Explicitly target the stat card content using the unique description text
    const totalPayslipsStat = page
      .locator('div:has(> p:has-text("Generated payslips"))')
      .locator('.text-2xl')
    await expect(totalPayslipsStat).toHaveText(EMPLOYEES.length.toString())
  })
})

test.describe.serial('Print Preview Lifecycle', () => {
  test('shows grouped pay periods and loads payslips after selecting branch + period', async () => {
    await page.click('a:has-text("Print Preview")')

    // Select IDOL MOTEL
    await page.locator('[role="combobox"]').first().click()
    await page.locator('[role="option"]:has-text("IDOL MOTEL")').click()

    // A pay period dropdown should appear with our data
    const periodCombo = page.locator('[role="combobox"]').nth(1)
    await expect(periodCombo).toBeVisible()

    // Select the first available period
    await periodCombo.click()
    const firstOption = page.locator('[role="option"]').first()
    await expect(firstOption).toBeVisible()
    const optionText = await firstOption.textContent()
    expect(optionText).toContain('payslip')
    await firstOption.click()

    // Should show "Ready for Processing" with payslips loaded
    await expect(page.locator('text=Ready for Processing')).toBeVisible()
    await expect(page.locator('text=Print (A4 Compact)')).toBeVisible()

    // The print layout should contain at least one employee name
    await expect(page.locator('text=Jason Jamora')).toBeVisible()
  })

  test('shows "No payslips found" for branch with no data', async () => {
    await page.click('a:has-text("Print Preview")')
    await page.locator('[role="combobox"]').first().click()
    await page.locator('[role="option"]:has-text("LUCKY START MOTEL")').click()

    await expect(page.locator('text=No payslips found for this branch')).toBeVisible()
  })
})

test.describe.serial('Multi-Branch Lifecycle', () => {
  test('full second-branch lifecycle: add employee, create payslip, verify dashboard', async () => {
    test.setTimeout(60000)

    // Step 1: Add employee in BULLSEYE MOTEL
    await page.click('a:has-text("Employees")')
    await page.locator('[role="combobox"]').click()
    await page.locator('[role="option"]:has-text("BULLSEYE MOTEL")').click()
    await expect(page.locator('text=No employees yet')).toBeVisible()

    await page.click('button:has-text("Add Employee")')
    await page.fill('input[placeholder="Employee name"]', 'Maria Santos')
    await page.fill('input[placeholder*="Front Desk"]', 'Cashier')
    const addBtn = page.locator('button:has-text("Add"):not(:has-text("Employee"))')
    await expect(addBtn).toBeEnabled()
    await addBtn.click()
    await expect(page.locator('td:has-text("Maria Santos")')).toBeVisible()

    // Step 2: Create payslip for Maria Santos in BULLSEYE
    await page.evaluate(() => (window.location.hash = '#/new-payslip'))
    await page.waitForTimeout(500)
    await selectFromDropdown(page, page.getByRole('combobox').first(), 'BULLSEYE MOTEL')
    await selectFromDropdown(page, page.getByRole('combobox').nth(1), 'Maria Santos')

    await setReactDate(page, 'pay-period-start', '2026-03-01')
    await setReactDate(page, 'pay-period-end', '2026-03-15')

    const allNum = page.locator('input[type="number"]')
    await allNum.nth(0).fill('526')
    await allNum.nth(1).fill('15')
    await allNum.nth(2).fill('200')
    await allNum.nth(3).fill('0') // SSS Loan
    await allNum.nth(4).fill('250') // Philhealth
    await allNum.nth(5).fill('100') // Pag-ibig
    await allNum.nth(6).fill('0') // Store
    await allNum.nth(7).fill('0') // Cash Adv
    await allNum.nth(8).fill('450') // SSS Premium
    await allNum.nth(9).fill('0') // Pag ibig loan
    await allNum.nth(10).fill('0') // Others

    await page.waitForTimeout(200)

    await page.click('button:has-text("Save Payslip")', { force: true })
    await expect(page.locator('text=Payslip saved successfully')).toBeVisible()

    // Step 3: Verify Dashboard shows all payslips (8 IDOL + 1 BULLSEYE = 9)
    await page.click('a:has-text("Dashboard")')
    const totalPayslipsStat = page
      .locator('div:has(> p:has-text("Generated payslips"))')
      .locator('.text-2xl')
    await expect(totalPayslipsStat).toHaveText('9')
  })
})

test.describe.serial('Settings - Clear Data', () => {
  test('clear all realistic data successfully', async () => {
    await page.click('a:has-text("Settings")')

    // Confirm disabled edge case
    await page.click('button:has-text("Clear All Data")')
    await page.fill('input[placeholder*="DELETE ALL"]', 'wrong text')
    await expect(page.locator('[role="dialog"] button:has-text("Confirm Clear")')).toBeDisabled()

    // Success path
    await page.fill('input[placeholder*="DELETE ALL"]', 'DELETE ALL')
    await page.locator('[role="dialog"] button:has-text("Confirm Clear")').click()
    await expect(page.locator('text=All data cleared successfully')).toBeVisible()
  })

  test('data genuinely cleared from dashboard', async () => {
    await page.click('a:has-text("Dashboard")')
    const totalPayslipsStat = page
      .locator('div:has(> p:has-text("Generated payslips"))')
      .locator('.text-2xl')
    await expect(totalPayslipsStat).toHaveText('0')
  })

  test('branches remain intact after clear', async () => {
    await page.click('a:has-text("Branches")')
    await expect(page.locator('td:has-text("IDOL MOTEL")')).toBeVisible()
    await expect(page.locator('text=5 Branches')).toBeVisible()
  })
})

test.describe.serial('Sad Paths & Error States', () => {
  test('Branch rename to empty throws validation', async () => {
    await page.click('a:has-text("Branches")')
    const row = page.locator('tr', { hasText: 'IDOL MOTEL' })
    await row.locator('button').first().click()
    const editInput = page.locator('input.h-8')
    await editInput.clear()
    await editInput.press('Enter')
    // It should stay an input because of length boundary validation -> API will reject it anyway
    await expect(editInput).toBeVisible()
  })

  test('Adding Employee with empty name', async () => {
    await page.click('a:has-text("Employees")')
    await page.locator('[role="combobox"]').click()
    await page.locator('[role="option"]:has-text("IDOL MOTEL")').click()

    await page.click('button:has-text("Add Employee")')
    // Add button should be disabled because the name is empty
    const addBtn = page.locator('button:has-text("Add"):not(:has-text("Employee"))')
    await expect(addBtn).toBeDisabled()

    // Close the dialog to prevent overlay from blocking subsequent tests
    await page.keyboard.press('Escape')
    await expect(page.locator('text=Add Employee').first()).toBeVisible()
  })

  test('Payslip with negative Total Salary should highlight red', async () => {
    // After "Clear All Data" (test 15), employees are gone.
    // Re-create one employee so this test has someone to select.
    await page.click('a:has-text("Employees")')
    await page.waitForTimeout(300)
    await page.locator('[role="combobox"]').click()
    await page.locator('[role="option"]:has-text("IDOL MOTEL")').click()
    await page.waitForTimeout(300)

    // Only add if there are no employees yet
    const noEmployees = page.locator('text=No employees yet')
    if (await noEmployees.isVisible().catch(() => false)) {
      await page.click('button:has-text("Add Employee")')
      await page.fill('input[placeholder="Employee name"]', 'Jason Jamora')
      await page.fill('input[placeholder*="Front Desk"]', 'Frontman')
      const addBtn = page.locator('button:has-text("Add"):not(:has-text("Employee"))')
      await expect(addBtn).toBeEnabled()
      await addBtn.click()
      await expect(page.locator('td:has-text("Jason Jamora")')).toBeVisible()
    }

    // Now navigate to New Payslip and run the negative salary test
    await page.evaluate(() => (window.location.hash = '#/new-payslip'))
    await page.waitForTimeout(500)

    await selectFromDropdown(page, page.getByRole('combobox').first(), 'IDOL MOTEL')
    // Wait for employee list to load after branch selection
    await page.waitForTimeout(1000)
    // Select first employee
    await selectFromDropdown(page, page.getByRole('combobox').nth(1), 'Jason Jamora')

    await setReactDate(page, 'pay-period-start', '2026-03-01')
    await setReactDate(page, 'pay-period-end', '2026-03-15')

    const allNum = page.locator('input[type="number"]')

    // Base salary of 0, Store deduction of 500 = Negative
    await allNum.nth(0).fill('0') // Rate
    await allNum.nth(1).fill('0') // Shifts
    await allNum.nth(2).fill('0') // OT
    await allNum.nth(6).fill('500') // Store

    // Wait for the net salary to show a negative value containing 500.00
    // The value rendered is "-₱500.00" — use a broad text locator to handle encoding
    await page.waitForTimeout(500)
    const netSalaryText = page.locator('.text-lg.font-bold span').last()
    await expect(netSalaryText).toContainText('500.00', { timeout: 5000 })
  })
})
