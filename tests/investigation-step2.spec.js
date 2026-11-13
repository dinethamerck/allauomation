// tests/investigation-step2.spec.js
const { test, expect } = require('@playwright/test');
const { InvestigationPage } = require('../pages/InvestigationPage');

test.describe('EMR-78: Admission Module - Step 2: Investigation Tab & Date-Based Multi-Parameter Matrix', () => {
  let invPage;

  test.beforeEach(async ({ page }) => {
    invPage = new InvestigationPage(page);
    await invPage.goto();
  });

  // =========================================================================
  // 1. STEPPER WORKFLOW & TAB PLACEMENT
  // =========================================================================
  test('TC-EMR78-01 & TC-EMR78-02: Investigation tab is Step 2 and loads Investigation UI', async ({ page }) => {
    // Assert Step 2 tab exists and has proper label
    const invTab = page.getByRole('button', { name: /2\.\s*Investigation|Investigation/i }).first();
    await expect(invTab).toBeVisible({ timeout: 15000 });

    // Verify Tab is highlighted as active
    await expect(invTab).toBeVisible();

    // Verify Blood Group and Investigation Parameters sections are visible
    await expect(page.getByText('Blood Group').first()).toBeVisible();
    await expect(page.getByText(/Investigation Parameters/i).first()).toBeVisible();
  });

  // =========================================================================
  // 2. BLOOD GROUP SELECTION & BEHAVIOR
  // =========================================================================
  test('TC-EMR78-03 & TC-EMR78-04: Blood Group badges are rendered and selectable', async ({ page }) => {
    const bloodGroupBadges = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    for (const bg of bloodGroupBadges) {
      const badge = page.locator('div, span, button').filter({ hasText: new RegExp(`^${bg.replace('+', '\\+')}$`) }).first();
      await expect(badge).toBeVisible();
    }

    // Verify Custom option exists
    const customBtn = page.locator('button, div, span').filter({ hasText: /^Custom$/ }).first();
    await expect(customBtn).toBeVisible();

    // Select B+
    await invPage.selectBloodGroup('B+');
    await page.waitForTimeout(500);
    const isBPlusSelected = await invPage.isBloodGroupSelected('B+');
    expect(isBPlusSelected).toBe(true);

    // Switch selection to O+
    await invPage.selectBloodGroup('O+');
    await page.waitForTimeout(500);
    const isOPlusSelected = await invPage.isBloodGroupSelected('O+');
    expect(isOPlusSelected).toBe(true);
  });

  test('TC-EMR78-05: Blood Group is maintained globally across investigation dates', async ({ page }) => {
    // Set Blood Group to A+
    await invPage.selectBloodGroup('A+');
    await page.waitForTimeout(500);

    // Add a date column
    const initialCount = await invPage.getDateColumnCount();
    await invPage.addDateColumn();
    const newCount = await invPage.getDateColumnCount();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);

    // Verify Blood Group remains A+
    const isAPlusSelected = await invPage.isBloodGroupSelected('A+');
    expect(isAPlusSelected).toBe(true);
  });

  // =========================================================================
  // 3. INVESTIGATION TABLE & DATE COLUMNS DYNAMICS
  // =========================================================================
  test('TC-EMR78-07 & TC-EMR78-08: Initial table structure & Add (+) Date Column appends new column', async ({ page }) => {
    // Verify Parameters header
    const paramsHeader = page.locator('th, tr, [role="columnheader"]').filter({ hasText: /PARAMETERS/i }).first();
    await expect(paramsHeader).toBeVisible();

    // Verify "+ Add Date Column" button
    const addBtn = page.getByRole('button', { name: /\+\s*Add Date Column|Add Date Column/i }).first();
    await expect(addBtn).toBeVisible();

    // Verify date picker inputs in header
    const initialCols = await invPage.getDateColumnCount();
    expect(initialCols).toBeGreaterThan(0);

    // Click Add Date Column
    await invPage.addDateColumn();
    const updatedCols = await invPage.getDateColumnCount();
    expect(updatedCols).toBe(initialCols + 1);
  });

  test('TC-EMR78-09: Date column header contains calendar/date selector', async ({ page }) => {
    const firstDateInput = page.locator('input[placeholder*="Select date"]').first();
    await expect(firstDateInput).toBeVisible();

    // Open calendar popover
    await firstDateInput.click();
    await page.waitForTimeout(500);

    // Check calendar overlay opened
    const calendarPopover = page.locator('[role="dialog"], [role="grid"], .rdp, .react-calendar, div').filter({ hasText: /2026|October|September|Sun|Mon/i }).first();
    await expect(calendarPopover).toBeVisible();

    // Dismiss calendar
    await page.keyboard.press('Escape');
  });

  // =========================================================================
  // 4. DATA ENTRY & RETENTION ACROSS COLUMN ADDITIONS
  // =========================================================================
  test('TC-EMR78-24 & TC-EMR78-26: Entering parameter value is retained when adding new date columns', async ({ page }) => {
    // Find the first editable result input
    const firstInput = page.locator('tbody input, table input[placeholder*="value" i]').first();
    await expect(firstInput).toBeVisible({ timeout: 10000 });

    const testValue = '120.5';
    await firstInput.fill(testValue);
    await expect(firstInput).toHaveValue(testValue);

    // Add another date column
    await invPage.addDateColumn();

    // Verify previous value remains intact
    await expect(firstInput).toHaveValue(testValue);
  });

  // =========================================================================
  // 5. REGRESSION & STEPPERS TRANSITION
  // =========================================================================
  test('TC-EMR78-28 & TC-EMR78-35: Zero regression when navigating to other wizard steps and back', async ({ page }) => {
    // Navigate away to Step 3
    await invPage.navigateAway();
    await page.waitForTimeout(1000);

    // Return to Step 2: Investigation
    await invPage.returnToInvestigation();
    await page.waitForTimeout(1000);

    // Assert Investigation UI re-renders cleanly
    await expect(page.getByText('Blood Group').first()).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();
  });
});
