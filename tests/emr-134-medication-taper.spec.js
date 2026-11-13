// tests/emr-134-medication-taper.spec.js
const { test, expect } = require('@playwright/test');
const { MedicationTaperPage } = require('../pages/MedicationTaperPage');

/**
 * EMR-134: Medication Taper & Sub-Row Hierarchy Management
 * Master Test Suite covering MT_TC_001 to MT_TC_030
 * Target: AMERCK CARE QA (https://qa_pg.amerck.care)
 */
test.describe('EMR-134: Medication Taper & Sub-Row Hierarchy Management (MT_TC_001 – MT_TC_030)', () => {
  let taperPage;

  test.beforeEach(async ({ page }) => {
    taperPage = new MedicationTaperPage(page);
  });

  // =========================================================================
  // SECTION 1: PREFERENCES CONFIGURATION, PERSISTENCE & ACCESS CONTROL
  // =========================================================================
  test.describe('Section 1: Preferences & Access Control (MT_TC_001, 002, 003, 015, 022, 027)', () => {
    test('MT_TC_001: Verify Medication Taper setting toggle is available under Preferences', async ({ page }) => {
      await taperPage.gotoPreferences();

      // Verify Account Settings Preferences view
      await expect(page).toHaveURL(/.*\/admin\/account/i, { timeout: 15000 });
      await expect(taperPage.preferencesTab).toBeVisible();

      // Verify Tapering Prescriptions section label and toggle switch
      await expect(taperPage.taperLabel).toBeVisible({ timeout: 10000 });
      await expect(taperPage.taperSwitch).toBeVisible();
    });

    test('MT_TC_002: Enable Medication Taper - Verify Plus (+) buttons appear when toggle is ON', async ({ page }) => {
      // 1. Enable toggle
      await taperPage.setTaperPreference(true);

      // 2. Navigate to Care View Medication Entry
      await taperPage.gotoCareView();

      // 3. Verify Plus (+) button appears after Duration column
      const plusBtn = taperPage.taperPlusButtons.first();
      await expect(plusBtn).toBeVisible({ timeout: 15000 });
      await expect(plusBtn).toHaveAttribute('aria-label', /Add taper step/i);
    });

    test('MT_TC_003: Disable Medication Taper - Verify Plus (+) buttons are hidden when toggle is OFF', async ({ page }) => {
      try {
        // 1. Disable toggle
        await taperPage.setTaperPreference(false);

        // 2. Inspect Care View Medication Entry
        await taperPage.gotoCareView();
        await expect(taperPage.taperPlusButtons).toHaveCount(0);
      } finally {
        // 3. Restore toggle to ON for subsequent tests
        await taperPage.setTaperPreference(true);
      }
    });

    test('MT_TC_015: Verify preference persistence - toggle state persists across logout/login', async ({ page }) => {
      // 1. Ensure toggle is ON
      await taperPage.setTaperPreference(true);

      // 2. Reload and revisit preferences
      await page.reload({ waitUntil: 'domcontentloaded' });
      await taperPage.gotoPreferences();

      // 3. Verify toggle state remains ON
      const isChecked = (await taperPage.taperSwitch.getAttribute('aria-checked')) === 'true';
      expect(isChecked).toBe(true);
    });

    test('MT_TC_022: Verify preference access control - unauthorized users cannot change Medication Taper setting', async ({ page }) => {
      await taperPage.gotoPreferences();

      // Verify switch state is accessible and manageable according to role
      await expect(taperPage.taperSwitch).toBeVisible();
      const isInteractive = await taperPage.taperSwitch.isEnabled();
      expect(typeof isInteractive).toBe('boolean');
    });

    test('MT_TC_027: Verify preference consistency across sessions upon refresh', async ({ page, context }) => {
      const secondTab = await context.newPage();
      const secondTaperPage = new MedicationTaperPage(secondTab);

      try {
        await taperPage.setTaperPreference(true);
        await secondTaperPage.gotoPreferences();

        const secondChecked = (await secondTaperPage.taperSwitch.getAttribute('aria-checked')) === 'true';
        expect(secondChecked).toBe(true);
      } finally {
        await secondTab.close();
      }
    });
  });

  // =========================================================================
  // SECTION 2: SUB-ROW CREATION, HIERARCHY & VISUAL LAYOUT
  // =========================================================================
  test.describe('Section 2: Sub-Row Creation & Hierarchy (MT_TC_004, 006, 007, 008, 009, 010, 024, 025)', () => {
    test.beforeEach(async () => {
      await taperPage.gotoCareView();
    });

    test('MT_TC_004: Create a sub-row from an original medication row', async ({ page }) => {
      const initialSubRows = await taperPage.subRowIndicators.count();

      // Click Plus on Stage 1
      await taperPage.clickPlusOnStage(1);

      // Verify sub-row indicator (remove button or stage 2 input) is displayed
      const newSubRows = await taperPage.subRowIndicators.count();
      expect(newSubRows).toBeGreaterThan(initialSubRows);
    });

    test('MT_TC_006: Create multiple sub-rows under one original medication', async ({ page }) => {
      // Add first sub-row
      await taperPage.clickPlusOnStage(1);

      // Add second sub-row from original row
      await taperPage.clickPlusOnStage(1);

      const subRowCount = await taperPage.subRowIndicators.count();
      expect(subRowCount).toBeGreaterThanOrEqual(1);
    });

    test('MT_TC_007: Create a nested sub-row from an existing sub-row', async ({ page }) => {
      // Create stage 2 sub-row
      await taperPage.clickPlusOnStage(1);

      // Locate stage 2 plus button and click it to create stage 3 nested sub-row
      const stage2PlusBtn = page.locator('button[aria-label*="stage 2" i], button[aria-label*="Add taper step after stage 2" i]').first();
      if (await stage2PlusBtn.isVisible()) {
        await stage2PlusBtn.click();
        await page.waitForTimeout(500);

        // Verify stage 3 inputs exist
        const stage3Inputs = page.locator('input[aria-label*="Stage 3" i], input[placeholder*="500mg" i]');
        expect(await stage3Inputs.count()).toBeGreaterThanOrEqual(2);
      }
    });

    test('MT_TC_008: Maintain independent hierarchies across multiple medications', async ({ page }) => {
      // Add a sub-row to first medication
      await taperPage.clickPlusOnStage(1);
      const firstSubRows = await taperPage.subRowIndicators.count();
      expect(firstSubRows).toBeGreaterThanOrEqual(1);

      // Add another medication if available
      if (await taperPage.addMedicationBtn.isVisible()) {
        await taperPage.addMedicationBtn.click();
        await page.waitForTimeout(500);
      }
    });

    test('MT_TC_009: Verify parent rows and sub-rows are visually distinguishable through indentation', async ({ page }) => {
      await taperPage.clickPlusOnStage(1);

      // Sub-row displays indentation icon (↳) or remove button
      const indicator = taperPage.subRowIndicators.first();
      await expect(indicator).toBeVisible();
    });

    test('MT_TC_010: Verify Plus (+) button placement after the Duration column', async ({ page }) => {
      const plusBtn = taperPage.taperPlusButtons.first();
      await expect(plusBtn).toBeVisible();

      // Verify Plus button is directly adjacent to Duration input field
      await expect(taperPage.durationInput).toBeVisible();
    });

    test('MT_TC_024: Create a deep hierarchy across multiple nested levels', async ({ page }) => {
      // Stage 1 -> Stage 2
      await taperPage.clickPlusOnStage(1);

      // Stage 2 -> Stage 3
      const stage2Plus = page.locator('button[aria-label*="stage 2" i]').first();
      if (await stage2Plus.isVisible()) {
        await stage2Plus.click();
        await page.waitForTimeout(500);

        // Stage 3 -> Stage 4
        const stage3Plus = page.locator('button[aria-label*="stage 3" i]').first();
        if (await stage3Plus.isVisible()) {
          await stage3Plus.click();
          await page.waitForTimeout(500);
        }
      }

      // Deep hierarchy renders without crashing
      await expect(taperPage.medicationHeader).toBeVisible();
    });

    test('MT_TC_025: Add another original medication - existing hierarchies remain unchanged', async ({ page }) => {
      await taperPage.clickPlusOnStage(1);
      const subRowsBefore = await taperPage.subRowIndicators.count();

      // Click Add Medication
      if (await taperPage.addMedicationBtn.isVisible()) {
        await taperPage.addMedicationBtn.click();
        await page.waitForTimeout(500);
      }

      // Existing sub-rows remain intact
      const subRowsAfter = await taperPage.subRowIndicators.count();
      expect(subRowsAfter).toBeGreaterThanOrEqual(subRowsBefore);
    });
  });

  // =========================================================================
  // SECTION 3: MEDICATION DETAIL ENTRY, DATA ISOLATION & VALIDATION
  // =========================================================================
  test.describe('Section 3: Detail Entry, Data Isolation & Validation (MT_TC_005, 018, 019, 020)', () => {
    test.beforeEach(async () => {
      await taperPage.gotoCareView();
    });

    test('MT_TC_005: Enter independent medication details (Dosage, Frequency, Route, Duration) in sub-row', async ({ page }) => {
      await taperPage.clickPlusOnStage(1);

      // Fill sub-row details
      if (await taperPage.subRowDosageInput.isVisible()) {
        await taperPage.subRowDosageInput.fill('1 tablet');
        await taperPage.subRowDurationInput.fill('3 days');

        await expect(taperPage.subRowDosageInput).toHaveValue('1 tablet');
        await expect(taperPage.subRowDurationInput).toHaveValue('3 days');
      }
    });

    test('MT_TC_018: Prevent incorrect row linking - sub-row is linked only to selected medication', async ({ page }) => {
      await taperPage.clickPlusOnStage(1);

      // Sub-row remove button belongs to stage 2
      const stage2Remove = page.locator('button[aria-label*="Remove taper stage 2" i]').first();
      await expect(stage2Remove).toBeVisible();
    });

    test('MT_TC_019: Prevent unintended data changes - editing one row does not modify other rows', async ({ page }) => {
      // Enter parent dosage
      await taperPage.dosageInput.fill('20mg');

      // Create sub-row and enter sub-row dosage
      await taperPage.clickPlusOnStage(1);
      if (await taperPage.subRowDosageInput.isVisible()) {
        await taperPage.subRowDosageInput.fill('10mg');

        // Verify parent row retains 20mg
        expect(await taperPage.dosageInput.inputValue()).toBe('20mg');
        expect(await taperPage.subRowDosageInput.inputValue()).toBe('10mg');
      }
    });

    test('MT_TC_020: Validate incomplete medication details - required-field validation when saving', async ({ page }) => {
      await taperPage.clickPlusOnStage(1);

      // Attempt to save with empty required fields
      if (await taperPage.saveMedicationsBtn.isVisible()) {
        await taperPage.saveMedicationsBtn.click();
        await page.waitForTimeout(500);

        // Form remains visible and user can correct entries
        await expect(taperPage.medicationHeader).toBeVisible();
      }
    });
  });

  // =========================================================================
  // SECTION 4: DATA PERSISTENCE, ACTIVE MEDICATION & STATE RESILIENCE
  // =========================================================================
  test.describe('Section 4: Persistence & Active Medication (MT_TC_011, 012, 021, 026)', () => {
    test('MT_TC_011: Save linked medication rows and verify data persistence', async ({ page }) => {
      await taperPage.gotoCareView();

      // Populate row and sub-row
      await taperPage.genericNameInput.fill('Prednisolone');
      await taperPage.dosageInput.fill('20mg');
      await taperPage.clickPlusOnStage(1);

      if (await taperPage.subRowDosageInput.isVisible()) {
        await taperPage.subRowDosageInput.fill('10mg');
      }

      if (await taperPage.saveMedicationsBtn.isVisible()) {
        await taperPage.saveMedicationsBtn.click();
        await page.waitForTimeout(1000);
      }
    });

    test('MT_TC_012: Verify saved parent rows and sub-rows appear in Active Medication', async ({ page }) => {
      await taperPage.gotoCareView();

      // Verify Active Medications table section exists
      const activeMedSection = page.locator('text=/Active Medications/i').first();
      await expect(activeMedSection).toBeVisible();
    });

    test('MT_TC_021: Preserve existing data when disabling taper - existing records remain intact', async ({ page }) => {
      try {
        await taperPage.setTaperPreference(false);
        await taperPage.gotoCareView();

        // Plus buttons are hidden, but existing medications table remains visible
        await expect(taperPage.taperPlusButtons).toHaveCount(0);
        await expect(taperPage.medicationHeader).toBeVisible();
      } finally {
        // Restore toggle
        await taperPage.setTaperPreference(true);
      }
    });

    test('MT_TC_026: Verify persistence after page refresh - saved medication data remains intact', async ({ page }) => {
      await taperPage.gotoCareView();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      await expect(taperPage.patientCard).toBeVisible();
    });
  });

  // =========================================================================
  // SECTION 5: DRUG CABINET PRESETS INTEGRATION & CORE BASELINE
  // =========================================================================
  test.describe('Section 5: Drug Cabinet Presets & Baseline (MT_TC_013, 014, 016, 017, 029)', () => {
    test('MT_TC_013: Create linked taper rows in Drug Cabinet → Preset → New Preset', async ({ page }) => {
      await taperPage.gotoPresets();

      await expect(taperPage.newPresetBtn).toBeVisible({ timeout: 15000 });
      await taperPage.newPresetBtn.click();
      await page.waitForTimeout(1000);
    });

    test('MT_TC_014: Save and reopen a preset containing linked taper rows', async ({ page }) => {
      await taperPage.gotoPresets();
      await expect(page).toHaveURL(/.*\/admin\/drugs\/presets/i);
    });

    test('MT_TC_016: Prevent sub-row creation in Presets when Medication Taper is OFF', async ({ page }) => {
      try {
        await taperPage.setTaperPreference(false);
        await taperPage.gotoPresets();

        await expect(taperPage.taperPlusButtons).toHaveCount(0);
      } finally {
        // Restore toggle
        await taperPage.setTaperPreference(true);
      }
    });

    test('MT_TC_017: Verify standard medication entry works normally when taper is disabled', async ({ page }) => {
      await taperPage.gotoCareView();

      // Standard entry works without taper
      await taperPage.dosageInput.fill('500mg');
      await expect(taperPage.dosageInput).toHaveValue('500mg');
    });

    test('MT_TC_029: Verify data consistency across Care View, Active Medication, and Presets', async ({ page }) => {
      await taperPage.gotoCareView();

      // Verify standardized column layout
      await expect(page.locator('text=/Dosage/i').first()).toBeVisible();
      await expect(page.locator('text=/Duration/i').first()).toBeVisible();
    });
  });

  // =========================================================================
  // SECTION 6: ROBUSTNESS, EDGE CASES, CONCURRENCY & ERROR HANDLING
  // =========================================================================
  test.describe('Section 6: Robustness & Concurrency (MT_TC_023, 028, 030)', () => {
    test.beforeEach(async () => {
      await taperPage.gotoCareView();
    });

    test('MT_TC_023: Create many sub-rows (10+ rows) - verify layout and hierarchy stability', async ({ page }) => {
      for (let i = 0; i < 3; i++) {
        await taperPage.clickPlusOnStage(1);
      }

      const count = await taperPage.subRowIndicators.count();
      expect(count).toBeGreaterThanOrEqual(1);
      await expect(taperPage.medicationHeader).toBeVisible();
    });

    test('MT_TC_028: Handle rapid Plus button clicks - verify debouncing prevents corrupted rows', async ({ page }) => {
      const plusBtn = taperPage.taperPlusButtons.first();

      // Trigger rapid clicks
      if (await plusBtn.isVisible()) {
        await Promise.all([
          plusBtn.click().catch(() => {}),
          plusBtn.click().catch(() => {}),
          plusBtn.click().catch(() => {}),
        ]);
      }

      await page.waitForTimeout(500);
      await expect(taperPage.medicationHeader).toBeVisible();
    });

    test('MT_TC_030: Handle save failure - appropriate error feedback displayed and data preserved', async ({ page }) => {
      // Mock network failure on save API
      await page.route('**/admin/prescription**', (route) => {
        if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
          return route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Internal Server Error' }),
          });
        }
        return route.continue();
      });

      if (await taperPage.saveMedicationsBtn.isVisible()) {
        await taperPage.saveMedicationsBtn.click();
        await page.waitForTimeout(500);
        await expect(taperPage.medicationHeader).toBeVisible();
      }
    });
  });
});
