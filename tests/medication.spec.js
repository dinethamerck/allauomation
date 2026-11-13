// @ts-check
const { test, expect } = require('@playwright/test');
const { PrescriptionPage } = require('../pages/PrescriptionPage');

test.describe('Amerck Care - Prescription Medication Management Suite', () => {

  test('TC-MED-001: Add single medicine with complete dosage, frequency, route, and duration', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // Fill first medication row
    await rxPage.genericNameInputs.first().waitFor({ state: 'visible' });
    await rxPage.genericNameInputs.first().click();
    await rxPage.genericNameInputs.first().fill('Paracetamol 500mg');
    await page.waitForTimeout(400);
    await rxPage.dosageInputs.first().fill('1 tablet');
    await page.waitForTimeout(300);
    await rxPage.frequencyInputs.first().fill('TDS');
    await page.waitForTimeout(300);
    await rxPage.durationInputs.first().fill('5 days');
    await page.waitForTimeout(400);

    // Assert that each field correctly retains entered values
    await expect(rxPage.genericNameInputs.first()).toHaveValue('Paracetamol 500mg', { timeout: 10000 });
    await expect(rxPage.dosageInputs.first()).toHaveValue('1 tablet');
    await expect(rxPage.frequencyInputs.first()).toHaveValue('TDS');
    await expect(rxPage.durationInputs.first()).toHaveValue('5 days');
  });

  test('TC-MED-002: Add multiple medicines across multiple prescription rows', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    await rxPage.genericNameInputs.first().waitFor({ state: 'visible' });
    const initialCount = await rxPage.genericNameInputs.count();

    // Add another row via Add Medication button
    await rxPage.addNewMedicationRow();

    // Verify row count incremented by 1
    await expect(rxPage.genericNameInputs).toHaveCount(initialCount + 1);

    // Fill the new row with a second medicine
    const newGenericInput = rxPage.genericNameInputs.nth(initialCount);
    await newGenericInput.fill('Omeprazole 20mg');
    expect(await newGenericInput.inputValue()).toBe('Omeprazole 20mg');
  });

  test('TC-MED-003: Modify medicine dosage, frequency, and duration', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    const dosageInput = rxPage.dosageInputs.first();
    const freqInput = rxPage.frequencyInputs.first();
    const durationInput = rxPage.durationInputs.first();

    // Modify dosage and assert
    await dosageInput.fill('2 tablets');
    await page.waitForTimeout(300);
    expect(await dosageInput.inputValue()).toBe('2 tablets');

    // Modify frequency and assert
    await freqInput.fill('TDS');
    await page.waitForTimeout(300);
    expect(await freqInput.inputValue()).toBe('TDS');

    // Modify duration and assert
    await durationInput.fill('7 days');
    await page.waitForTimeout(300);
    expect(await durationInput.inputValue()).toBe('7 days');
  });

  test('TC-MED-004: Medication route specification and verification', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    const routeInput = rxPage.routeInputs.first();
    await expect(routeInput).toBeVisible();

    // Verify route is present and accessible
    const currentRoute = await routeInput.inputValue();
    expect(currentRoute.length).toBeGreaterThan(0);
  });

  test('TC-MED-005: Clinical frequency abbreviations entry (TDS, BD, OD)', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    const freqInput = rxPage.frequencyInputs.first();
    await freqInput.waitFor({ state: 'visible' });

    await freqInput.fill('TDS');
    await page.waitForTimeout(200);
    expect(await freqInput.inputValue()).toBe('TDS');

    await freqInput.fill('BD');
    await page.waitForTimeout(200);
    expect(await freqInput.inputValue()).toBe('BD');

    await freqInput.fill('OD');
    await page.waitForTimeout(200);
    expect(await freqInput.inputValue()).toBe('OD');
  });

  test('TC-MED-006: Prescription draft save preserves prescribed medications', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    const genericInput = rxPage.genericNameInputs.first();
    await genericInput.waitFor({ state: 'visible' });

    const currentValue = await genericInput.inputValue();
    if (!currentValue) {
      await genericInput.fill('Metformin 500mg');
    }

    // Click Save
    await rxPage.clickSave();
    await page.waitForTimeout(1000);

    // Verify consultation page remains stable and URL contains pid
    expect(page.url()).toContain('pid=333566');
    expect((await genericInput.inputValue()).length).toBeGreaterThan(0);
  });

  test('TC-MED-007: Medication quick-action controls (Add Medication, Use Preset, Clear All) are visible and enabled', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    await expect(rxPage.addMedicationButton).toBeVisible();
    await expect(rxPage.addMedicationButton).toBeEnabled();

    await expect(rxPage.usePresetButton).toBeVisible();
    await expect(rxPage.usePresetButton).toBeEnabled();

    await expect(rxPage.clearAllButton).toBeVisible();
    await expect(rxPage.clearAllButton).toBeEnabled();
  });

  test('TC-MED-008: Click "Clear All" button and verify all medication rows and entries are cleared', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // Record initial count and add another row
    const countBefore = await rxPage.genericNameInputs.count();
    await rxPage.addNewMedicationRow();

    // Verify row count incremented by 1
    await expect(rxPage.genericNameInputs).toHaveCount(countBefore + 1);

    // Click "Clear All" button
    await rxPage.clearAllButton.waitFor({ state: 'visible' });
    await rxPage.clearAllButton.click();
    await page.waitForTimeout(800);

    // Assert: Row count resets to 1 (single blank row)
    await expect(rxPage.genericNameInputs).toHaveCount(1);

    // Assert: Generic input is completely cleared
    await expect(rxPage.genericNameInputs.first()).toHaveValue('');
  });

});

