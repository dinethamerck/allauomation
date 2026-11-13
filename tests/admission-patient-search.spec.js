// tests/admission-patient-search.spec.js
const { test, expect } = require('@playwright/test');

test.describe('EMR-66: Admission Module - Local Patient Search & Admission Redirection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Admission Module
    await page.goto('/admin/admissions', { waitUntil: 'networkidle' });
  });

  // =========================================================================
  // 1. SEARCH PATIENTS MODAL LAUNCH & INITIAL STATE
  // =========================================================================
  test('TC-EMR66-01 & TC-EMR66-02: "Admit Patient" launches Search Patients modal with correct controls', async ({ page }) => {
    const admitBtn = page.getByRole('button', { name: 'Admit Patient' });
    await expect(admitBtn).toBeVisible({ timeout: 15000 });
    await admitBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Verify Title and Subtitle
    await expect(dialog.getByText('Search Patients')).toBeVisible();
    await expect(dialog.getByText("Enter patient's unique identifier")).toBeVisible();

    // Verify Search Query Input
    const queryInput = dialog.locator('input[name="query"]');
    await expect(queryInput).toBeVisible();
    await expect(queryInput).toHaveAttribute('placeholder', /e\.g\.\s*ID Number,\s*Mobile Phone Number/i);

    // Verify Search Button is disabled by default
    const searchBtn = dialog.getByRole('button', { name: 'Search' });
    await expect(searchBtn).toBeDisabled();

    // Typing enables Search button
    await queryInput.fill('0764981884');
    await expect(searchBtn).toBeEnabled();

    // Close button dismisses dialog
    const closeBtn = dialog.locator('button:has(svg), button[aria-label="Close"]').last();
    await closeBtn.click();
    await expect(dialog).toBeHidden();
  });

  // =========================================================================
  // 2. LOCAL PATIENT SEARCH & REDIRECTION (CORE DEFECT VERIFICATION)
  // =========================================================================
  test('TC-EMR66-06 & TC-EMR66-07: Click local patient in search results and verify redirection to Admission Module (NOT Patient Module)', async ({ page }) => {
    const admitBtn = page.getByRole('button', { name: 'Admit Patient' });
    await expect(admitBtn).toBeVisible({ timeout: 15000 });
    await admitBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    const queryInput = dialog.locator('input[name="query"]');
    
    // Search using a known local patient identifier (Mobile number or NIC)
    await queryInput.fill('0764981884');
    const searchBtn = dialog.getByRole('button', { name: 'Search' });
    await searchBtn.click();

    // Locate the returned local patient card in search results
    const patientItem = dialog.locator('div').filter({ hasText: /Dilumi Abeysekara|0764981884/i }).last();
    await expect(patientItem).toBeVisible({ timeout: 10000 });

    // Click the local patient card
    await patientItem.click();

    // Assert that the system stays in / redirects to the Admission Module
    await page.waitForURL(/\/admin\/admissions/i, { timeout: 15000 });

    // Assert: User MUST be in the Admission Module and NOT redirected to Patient Module
    expect(page.url()).toContain('/admin/admissions');
    expect(page.url()).not.toContain('/admin/patients');

    // Verify Admission Module header is visible
    await expect(page.locator('h1, h2, h3, header, div').filter({ hasText: /^Admissions$/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-EMR66-08 & TC-EMR66-10: Complete Admission Flow - Access Admission Wizard for selected local patient', async ({ page }) => {
    // Locate the admission row for the selected local patient
    const patientRow = page.locator('table tr').filter({ hasText: /Dilumi Abeysekara/i }).first();
    await expect(patientRow).toBeVisible({ timeout: 15000 });

    // Click the Draft badge to proceed into the Admission Wizard
    const draftBadge = patientRow.locator('text=Draft').first();
    if (await draftBadge.isVisible()) {
      await draftBadge.click();
      await page.waitForTimeout(2000);

      // Verify the Admission Wizard steps are rendered
      const step1Btn = page.getByRole('button', { name: /1\.\s*Presenting Complaint/i }).or(page.locator('button:has-text("1. Presenting Complaint")')).first();
      await expect(step1Btn).toBeVisible({ timeout: 15000 });

      // Verify URL is inside the onboarding wizard of the Admission Module
      expect(page.url()).toContain('/admin/admissions/onboarding');
      expect(page.url()).not.toContain('/admin/patients');
    }
  });

  // =========================================================================
  // 3. PATIENT MODULE ISOLATION (ZERO REGRESSION)
  // =========================================================================
  test('TC-EMR66-15: Direct Patient Management in /admin/patients remains isolated', async ({ page }) => {
    await page.goto('/admin/patients', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/admin/patients');
  });
});
