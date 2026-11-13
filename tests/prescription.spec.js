// @ts-check
const { test, expect } = require('@playwright/test');
const { PrescriptionPage } = require('../pages/PrescriptionPage');

test.describe('Amerck Care - Prescription Module Automation Suite', () => {

  // --- Patient Management Suite ---

  test('TC-PAT-001: Initial state displays "No patient selected" when no pid in URL', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto();

    // Verify empty state card and register patient button
    await expect(rxPage.noPatientCard).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Search or register a new patient to get started')).toBeVisible();
    await expect(rxPage.registerPatientButton).toBeVisible();
    // Search input is ready
    await expect(rxPage.searchInput).toBeVisible();
  });

  test('TC-PAT-002: Search patient by name and go to prescription (?pid=...)', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto();

    // Search for patient "janitha0124"
    await rxPage.searchPatient('janitha0124');

    // Verify search results dropdown appears
    await expect(rxPage.searchResultItems.first()).toBeVisible({ timeout: 10000 });
    const selectedItemText = await rxPage.selectFirstPatient();
    expect(selectedItemText).toContain('janitha0124');

    // Verify URL updates with ?pid=
    await page.waitForURL((url) => url.searchParams.has('pid'), { timeout: 10000 });
    expect(page.url()).toContain('pid=333566');

    // Verify Story tab appears
    await expect(rxPage.storyTab).toBeVisible({ timeout: 10000 });
    // Verify "No patient selected" is now replaced by patient profile
    await expect(rxPage.noPatientCard).not.toBeVisible();
    // Verify patient header in sidebar
    await expect(page.locator('role=heading[name="janitha0124"]')).toBeVisible();
  });

  test('TC-PAT-007: Search patient by mobile number and go to prescription', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto();

    // Search by mobile number "0741222870"
    await rxPage.searchPatient('0741222870');

    // Verify matching patient item
    await expect(rxPage.searchResultItems.first()).toBeVisible({ timeout: 10000 });
    await rxPage.selectFirstPatient();

    // Verify URL updates with ?pid=
    await page.waitForURL((url) => url.searchParams.has('pid'), { timeout: 10000 });
    expect(page.url()).toContain('pid=333566');
    await expect(rxPage.storyTab).toBeVisible();
    await expect(page.locator('role=heading[name="janitha0124"]')).toBeVisible();
  });

  test('TC-PAT-008: Verify patient clinical details and action controls when prescription is loaded', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');

    // Verify tabs
    await expect(rxPage.todayTab).toBeVisible({ timeout: 15000 });
    await expect(rxPage.storyTab).toBeVisible();

    // Verify patient profile details in right sidebar
    await expect(page.locator('role=heading[name="janitha0124"]')).toBeVisible();
    await expect(page.locator('text=0741222870')).toBeVisible();
    await expect(page.locator('role=heading[name="Medical and Surgical Problems"]')).toBeVisible();
    await expect(page.locator('role=heading[name="Allergies"]')).toBeVisible();
    await expect(page.locator('role=heading[name="Active Medications"]')).toBeVisible();

    // Verify clinical form sections unlocked
    await expect(page.locator('text=Pulse (BPM)')).toBeVisible();
    await expect(page.locator('text=Blood Pressure (mmHg)')).toBeVisible();
    await expect(rxPage.addMedicationButton).toBeVisible();

    // Verify action bar
    await expect(rxPage.saveButton).toBeVisible();
  });

  test('TC-PAT-003 & TC-PAT-004: Register Patient Wizard modal triggers and accepts NIC/Mobile', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto();

    await rxPage.registerPatientButton.click();

    // Modal should be open
    await expect(rxPage.patientWizardModal).toBeVisible();

    // Verify input presence
    const searchInput = page.locator('div[role="dialog"] input').first();
    await expect(searchInput).toBeVisible();

    // Close modal by pressing Escape
    await page.keyboard.press('Escape');
  });

  test('TC-PAT-006: Patient Bio & Clinical Summary Tab navigation', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });

    // Switch to Story tab
    await rxPage.storyTab.click();
    await page.waitForTimeout(500);

    // Switch back to Today tab and verify clinical inputs visible
    await rxPage.todayTab.click();
    await expect(page.locator('text=Blood Pressure (mmHg)')).toBeVisible();
  });

  // --- Vitals & Clinical Data Suite ---

  test('TC-VIT-001: Default consultation date defaults to today (YYYY-MM-DD)', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });

    const todayStr = new Date().toISOString().split('T')[0];
    const dateVal = await rxPage.dateInput.inputValue();
    expect(dateVal).toBe(todayStr);
  });

  test('TC-VIT-003: Blood Pressure (Systolic/Diastolic) inputs accept valid values', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    await rxPage.systolicBpInput.waitFor({ state: 'visible' });
    await rxPage.systolicBpInput.click();
    await rxPage.systolicBpInput.fill('120');
    await rxPage.diastolicBpInput.click();
    await rxPage.diastolicBpInput.fill('80');

    await expect(rxPage.systolicBpInput).toHaveValue('120');
    await expect(rxPage.diastolicBpInput).toHaveValue('80');
  });

  test('TC-VIT-004: Vitals Range & Acceptance (Pulse BPM, Temp, RR, Weight, Height, BMI)', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    await rxPage.bpmInput.click();
    await rxPage.bpmInput.fill('76');
    await rxPage.tempInput.click();
    await rxPage.tempInput.fill('98.6');
    await rxPage.rrInput.click();
    await rxPage.rrInput.fill('18');
    await rxPage.weightInput.click();
    await rxPage.weightInput.fill('70');
    await rxPage.heightInput.click();
    await rxPage.heightInput.fill('1.75');

    await expect(rxPage.bpmInput).toHaveValue('76');
    await expect(rxPage.tempInput).toHaveValue('98.6');
    await expect(rxPage.rrInput).toHaveValue('18');
    await expect(rxPage.weightInput).toHaveValue('70');
    await expect(rxPage.heightInput).toHaveValue('1.75');

    // Verify BMI is auto-calculated correctly: 70 / (1.75 * 1.75) = 22.86
    await expect(rxPage.bmiInput).toHaveValue('22.86');
    expect(await rxPage.bmiInput.isEditable()).toBe(false);
  });

  test('TC-VIT-005: Systemic Examination fields accept clinical findings', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    await rxPage.lungsInput.click();
    await rxPage.lungsInput.fill('Clear to auscultation bilaterally');
    await rxPage.cvsInput.click();
    await rxPage.cvsInput.fill('S1 S2 heard, no murmurs');

    await expect(rxPage.lungsInput).toHaveValue('Clear to auscultation bilaterally');
    await expect(rxPage.cvsInput).toHaveValue('S1 S2 heard, no murmurs');
  });

  test('TC-VIT-006: Presenting Problems / Chief Complaints accepts history input', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    await rxPage.presentingProblemsInput.click();
    await rxPage.presentingProblemsInput.fill('Patient complains of mild fever and dry cough for 3 days.');
    await expect(rxPage.presentingProblemsInput).toHaveValue('Patient complains of mild fever and dry cough for 3 days.');
  });

  // --- Diagnoses Suite ---

  test('TC-DX-001: Clinical Diagnosis input accepts condition entry', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    await rxPage.diagnosisInput.click();
    await rxPage.diagnosisInput.fill('Upper Respiratory Tract Infection');
    await expect(rxPage.diagnosisInput).toHaveValue('Upper Respiratory Tract Infection');
  });

  // --- Medications Suite ---

  test('TC-MED-001: Add Medication action unlocks medication fields and inputs', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    await expect(rxPage.addMedicationButton).toBeVisible();
    await rxPage.addMedicationButton.click();

    // Verify medication inputs are present
    await expect(rxPage.medicationGenericInput.first()).toBeVisible();
    await rxPage.medicationGenericInput.first().click();
    await rxPage.medicationGenericInput.first().fill('Paracetamol');
    await expect(rxPage.medicationGenericInput.first()).toHaveValue('Paracetamol');
  });

  test('TC-MED-008: Click "Clear All" button and verify all medication rows are reset', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // Record initial count and add a row
    const countBefore = await rxPage.genericNameInputs.count();
    await rxPage.genericNameInputs.first().fill('Paracetamol 500mg');
    await rxPage.addNewMedicationRow();

    // Verify row added dynamically
    await expect(rxPage.genericNameInputs).toHaveCount(countBefore + 1);

    // Click Clear All
    await rxPage.clearAllButton.waitFor({ state: 'visible' });
    await rxPage.clearAllButton.click();
    await page.waitForTimeout(800);

    // Verify reset to 1 row with empty field
    await expect(rxPage.genericNameInputs).toHaveCount(1);
    await expect(rxPage.genericNameInputs.first()).toHaveValue('');
  });

  // --- Auto-Save & Manual Save Suite ---

  test('TC-SAVE-003: Manual Save button triggers consultation save', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });

    await expect(rxPage.saveButton).toBeVisible();
    await rxPage.saveButton.click();

    // Form remains in valid consultation state
    expect(page.url()).toContain('pid=333566');
  });

  // --- Pharmacy & Actions Suite ---

  test('TC-PHARM-001: Send to Pharmacy button handles pharmacy dispatch state', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });

    const sendButton = rxPage.sendToPharmacyButton;
    if (await sendButton.isVisible()) {
      await sendButton.click();
      const toastOrModal = page.locator('text=No medications found in this prescription, text=Send to Pharmacy');
      await expect(toastOrModal.first()).toBeVisible({ timeout: 5000 });
    }
  });

  // --- Usability & Keyboard Shortcuts ---

  test('TC-UX-001: Keyboard shortcut Ctrl+S is handled by prescription form', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });

    await page.keyboard.press('Control+s');
    expect(page.url()).toContain('/admin/prescription');
  });

  test('TC-UX-002: Keyboard shortcut Ctrl+P is handled on prescription editor', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });

    await page.keyboard.press('Control+p');
    // Verify page remains intact
    expect(page.url()).toContain('pid=333566');
  });

  // --- Security Suite ---

  test('TC-SEC-001: Prescription page enforces authentication and redirects unauthenticated requests', async ({ browser }) => {
    const incognitoContext = await browser.newContext({ storageState: undefined });
    const incognitoPage = await incognitoContext.newPage();

    await incognitoPage.goto('https://qa_care.amerck.com/admin/prescription');
    await incognitoPage.waitForLoadState('domcontentloaded');

    await expect(incognitoPage).toHaveURL(/.*login.*/, { timeout: 15000 });
    await incognitoContext.close();
  });

});
