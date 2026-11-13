// tests/drug-history-step8-integration.spec.js
const { test, expect } = require('@playwright/test');
const { PastMedicalHistoryPage } = require('../pages/PastMedicalHistoryPage');
const { DrugHistoryPage } = require('../pages/DrugHistoryPage');

test.describe('AMERCK CARE Live - Step 8: Drug History & PrescriptionPad Integration', () => {
  let pmhPage;
  let drugPage;

  test.beforeEach(async ({ page }) => {
    pmhPage = new PastMedicalHistoryPage(page);
    drugPage = new DrugHistoryPage(page);

    // Start at Step 3
    await pmhPage.goto();

    // Select Diabetes Type II
    await pmhPage.selectDiabetesOption('II');

    // Select CKD Type II
    await pmhPage.selectCkdOption('II');

    // Check Previous Blood Transfusions using live text selector (to test exclusion)
    const transfusionCheckbox = page.locator('label, span').filter({ hasText: /Before 3 months/i }).first();
    if (await transfusionCheckbox.isVisible()) {
      await transfusionCheckbox.click();
    }

    // Enter Other PMH notes using live placeholder
    const otherNotes = page.getByPlaceholder(/Enter details\/complications\/additional notes/i).last();
    if (await otherNotes.isVisible()) {
      await otherNotes.fill('Seasonal allergic rhinitis');
    }

    // Navigate to Step 8: Drug History
    await drugPage.goto();
  });

  // =========================================================================
  // 1. CONDITION EXTRACTION & EXCLUSION RULES
  // =========================================================================
  test('TC-ST8-01: Should dynamically extract conditions including CKD & Diabetes, while excluding Blood Transfusions and Other PMH', async ({ page }) => {
    await drugPage.clickAddLabel();
    expect(await drugPage.isConditionModalVisible()).toBe(true);

    const dialog = drugPage.conditionModal;
    await dialog.waitFor({ state: 'visible', timeout: 10000 });
    const dialogText = await dialog.innerText();

    // Explicitly included:
    expect(dialogText).toContain('Chronic Kidney Disease (CKD)');
    expect(dialogText).toContain('Diabetes');
    expect(dialogText).toContain('Past ACS/IHD');

    // Strictly excluded:
    expect(dialogText).not.toContain('Previous Blood Transfusions');
    expect(dialogText).not.toContain('Before 3 months');
    expect(dialogText).not.toContain('Other Past Medical Problems');
    expect(dialogText).not.toContain('Seasonal allergic rhinitis');

    await drugPage.closeModal();
  });

  // =========================================================================
  // 2. PRESCRIPTIONPAD MULTI-LABEL DISPLAY & COMPACT BADGES
  // =========================================================================
  test('TC-ST8-02: Should display active condition labels as compact badge with remove button and "+ Add More"', async ({ page }) => {
    // Check if Chronic Kidney Disease (CKD) badge is already attached from Step 3
    const existingBadge = page.locator('table').getByText('Chronic Kidney Disease (CKD)').first();
    const hasExistingBadge = await existingBadge.isVisible().catch(() => false);

    if (!hasExistingBadge) {
      await drugPage.clickAddLabel();
      await drugPage.selectConditionInModal('Chronic Kidney Disease (CKD)');
      await drugPage.clickDone();
    }

    // Verify badge is rendered under Generic/Brand in table
    const badge = page.locator('table').getByText('Chronic Kidney Disease (CKD)').first();
    await expect(badge).toBeVisible();

    // Verify remove button is present on the badge pill
    const removeBtn = badge.locator('..').locator('button').first();
    await expect(removeBtn).toBeVisible();

    // Verify "+ Add More" button is rendered next to badge
    const addMoreBtn = page.getByRole('button', { name: '+ Add More' })
      .or(page.locator('button:has-text("+ Add More")'))
      .first();
    await expect(addMoreBtn).toBeVisible();
  });

  // =========================================================================
  // 3. ROW ALIGNMENT & INPUT INTEGRITY
  // =========================================================================
  test('TC-ST8-03: Row Alignment & Medication Input fields remain functional and intact', async ({ page }) => {
    await expect(drugPage.drugNameInput).toBeVisible();
    await drugPage.drugNameInput.fill('Panadol');
    await expect(drugPage.drugNameInput).toHaveValue('Panadol');

    await expect(drugPage.dosageInput).toBeVisible();
    await drugPage.dosageInput.fill('500mg');
    await expect(drugPage.dosageInput).toHaveValue('500mg');

    await expect(drugPage.frequencyInput).toBeVisible();
    await drugPage.frequencyInput.fill('BID');
    await expect(drugPage.frequencyInput).toHaveValue('BID');

    await expect(drugPage.durationInput).toBeVisible();
    await drugPage.durationInput.fill('5 days');
    await expect(drugPage.durationInput).toHaveValue('5 days');
  });
});
