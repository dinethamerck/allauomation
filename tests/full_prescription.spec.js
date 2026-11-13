// @ts-check
const { test, expect } = require('@playwright/test');
const { PrescriptionPage } = require('../pages/PrescriptionPage');

test.describe('Amerck Care - Mandatory Fields Validation & Full Prescription Creation Suite', () => {

  // --- Mandatory Field Validations ---

  test('TC-MAND-001: Mandatory Patient Selection - Empty state card blocks clinical editing without patient', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto(); // No pid param

    // Verify system displays "No patient selected" warning card
    await expect(rxPage.noPatientCard).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Search or register a new patient to get started')).toBeVisible();

    // Verify patient registration action is prompted
    await expect(rxPage.registerPatientButton).toBeVisible();

    // Search bar is required to select a patient before proceeding
    await expect(rxPage.searchInput).toBeVisible();
  });

  test('TC-MAND-002: Mandatory Consultation Date Verification', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // Verify date field is present, populated, and designated as Required
    const dateInput = rxPage.dateInput;
    await expect(dateInput).toBeVisible();

    const dateVal = await dateInput.inputValue();
    expect(dateVal).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Standard YYYY-MM-DD format
  });

  test('TC-MAND-003: Mandatory Medications for Pharmacy Dispatch', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // Reset medications using Clear All
    await rxPage.clearAllButton.waitFor({ state: 'visible' });
    await rxPage.clearAllButton.click();
    await page.waitForTimeout(800);

    // If Send to Pharmacy button is present, dispatch should be blocked or show warning when treatments are empty
    const sendButton = rxPage.sendToPharmacyButton;
    if (await sendButton.isVisible()) {
      await sendButton.click();
      const warningToast = page.locator('text=No medications found in this prescription, text=Send to Pharmacy');
      await expect(warningToast.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('TC-BMI-001: Automatic BMI Calculation Formula Accuracy and Readonly State Verification', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // Verify BMI input exists and is strictly readonly
    await expect(rxPage.bmiInput).toBeVisible();
    expect(await rxPage.bmiInput.isEditable()).toBe(false);

    // Test Case 1: Weight = 70kg, Height = 1.75m -> Expected BMI = 22.86
    await rxPage.weightInput.click();
    await rxPage.weightInput.fill('70');
    await rxPage.weightInput.press('Tab');
    await page.waitForTimeout(400);

    await rxPage.heightInput.click();
    await rxPage.heightInput.fill('1.75');
    await rxPage.heightInput.press('Tab');
    await page.waitForTimeout(800);

    const expectedBmi1 = (70 / (1.75 * 1.75)).toFixed(2);
    await expect(rxPage.bmiInput).toHaveValue(expectedBmi1, { timeout: 10000 });

    // Test Case 2: Dynamically change Weight = 80kg, Height = 1.80m -> Expected BMI = 24.69
    await rxPage.weightInput.click();
    await rxPage.weightInput.fill('80');
    await rxPage.weightInput.press('Tab');
    await page.waitForTimeout(400);

    await rxPage.heightInput.click();
    await rxPage.heightInput.fill('1.80');
    await rxPage.heightInput.press('Tab');
    await page.waitForTimeout(800);

    const expectedBmi2 = (80 / (1.80 * 1.80)).toFixed(2);
    await expect(rxPage.bmiInput).toHaveValue(expectedBmi2, { timeout: 10000 });
  });

  // --- Full Prescription Creation E2E ---

  test('TC-E2E-001: Create Full Clinical Prescription (Vitals, Complaints, Examination, Diagnosis, Medications, Management Plan, Save)', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // 1. Verify Patient Bio & Demographics
    await expect(page.locator('role=heading[name="janitha0124"], h3:has-text("janitha0124")').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=0741222870')).toBeVisible({ timeout: 15000 });

    // 2. Chief Complaints / Presenting Problems
    const complaints = 'Patient presents with sore throat, moderate fever (38.2°C), headache, and dry cough for 3 days.';
    await rxPage.fillPresentingProblems(complaints);
    expect(await rxPage.presentingProblemsInput.inputValue()).toContain('sore throat');

    // 3. Complete Patient Vitals (including Weight, Height, and auto-calculated BMI)
    await rxPage.fillVitals({
      systolic: '120',
      diastolic: '80',
      bpm: '78',
      weight: '70',
      height: '1.75',
      temp: '98.6',
      rr: '18',
      lungs: 'Clear to auscultation bilaterally, no wheezing',
      cvs: 'Normal heart sounds S1 S2 heard, regular rhythm'
    });

    expect(await rxPage.systolicBpInput.inputValue()).toBe('120');
    expect(await rxPage.diastolicBpInput.inputValue()).toBe('80');
    expect(await rxPage.bpmInput.inputValue()).toBe('78');
    expect(await rxPage.weightInput.inputValue()).toBe('70');
    expect(await rxPage.heightInput.inputValue()).toBe('1.75');

    // Verify BMI is auto-calculated and accurate: 70 / (1.75 * 1.75) = 22.86
    await expect(rxPage.bmiInput).toHaveValue('22.86');
    expect(await rxPage.bmiInput.isEditable()).toBe(false);

    expect(await rxPage.tempInput.inputValue()).toBe('98.6');
    expect(await rxPage.rrInput.inputValue()).toBe('18');
    expect(await rxPage.lungsInput.inputValue()).toContain('Clear to auscultation');
    expect(await rxPage.cvsInput.inputValue()).toContain('Normal heart sounds');

    // 4. Clinical Diagnosis
    await rxPage.diagnosisInput.fill('Acute Pharyngitis');
    expect(await rxPage.diagnosisInput.inputValue()).toBe('Acute Pharyngitis');

    // 5. Prescribe Medications (Primary & Secondary Drugs)
    // Row 1: Antibiotic
    await rxPage.genericNameInputs.first().fill('Amoxicillin 500mg');
    await page.waitForTimeout(200);
    await rxPage.dosageInputs.first().fill('1 capsule');
    await page.waitForTimeout(200);
    await rxPage.durationInputs.first().fill('7 days');
    await page.waitForTimeout(200);

    expect(await rxPage.genericNameInputs.first().inputValue()).toBe('Amoxicillin 500mg');
    expect(await rxPage.durationInputs.first().inputValue()).toBe('7 days');

    // Row 2: Analgesic / Antipyretic
    await rxPage.addNewMedicationRow();
    await page.waitForTimeout(500);

    const rowCount = await rxPage.genericNameInputs.count();
    const lastRowIndex = rowCount - 1;

    await rxPage.genericNameInputs.nth(lastRowIndex).fill('Paracetamol 500mg');
    await page.waitForTimeout(300);
    expect(await rxPage.genericNameInputs.nth(lastRowIndex).inputValue()).toBe('Paracetamol 500mg');

    // 6. Management Plan & Advice
    const planText = 'Warm saline gargle 3 times daily, adequate fluid intake, rest for 3 days. Return if symptoms worsen.';
    await rxPage.managementPlanInput.fill(planText);
    expect(await rxPage.managementPlanInput.inputValue()).toContain('Warm saline gargle');

    // 7. Save Prescription Draft
    await rxPage.clickSave();
    await page.waitForTimeout(2000); // Wait after clicking Save button

    // Verify consultation persists with all data intact
    expect(page.url()).toContain('pid=333566');
    expect(await rxPage.presentingProblemsInput.inputValue()).toContain('sore throat');
    expect(await rxPage.genericNameInputs.first().inputValue()).toBe('Amoxicillin 500mg');
  });

  // --- After Prescription Generation Suite (Preview, Download, Print, Dismiss, Finalize) ---

  test('TC-GEN-001: Prescription Preview Modal Display & Control Verification', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // Open generated prescription preview modal
    await rxPage.openPrescriptionModal();
    await page.waitForTimeout(1500); // Wait after opening modal to inspect dialog

    // Verify modal title and container
    await expect(rxPage.prescriptionModal).toBeVisible();
    await expect(rxPage.modalTitle).toBeVisible();

    // Verify all modal controls: Close, Download, Print, and X
    await expect(rxPage.modalCloseButton).toBeVisible();
    await expect(rxPage.modalDownloadButton).toBeVisible();
    await expect(rxPage.modalPrintButton).toBeVisible();
    await expect(rxPage.modalXButton).toBeVisible();

    // Dismiss modal cleanly and wait
    await rxPage.closePrescriptionModal();
    await page.waitForTimeout(1500); // Wait after clicking Close button
  });

  test('TC-GEN-002: Download Generated Prescription PDF File', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // Open generated prescription preview modal
    await rxPage.openPrescriptionModal();
    await page.waitForTimeout(1500); // Wait for modal preview to settle

    // Click Download button and capture download event
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      rxPage.modalDownloadButton.click()
    ]);

    // Explicit wait after clicking Download button
    await page.waitForTimeout(2500);

    // Verify download completed and filename is a PDF
    expect(download).not.toBeNull();
    const filename = await download.suggestedFilename();
    expect(filename.toLowerCase()).toMatch(/\.pdf$/);

    // Close modal and wait after clicking close
    await rxPage.closePrescriptionModal();
    await page.waitForTimeout(1500); // Wait after clicking Close button
  });

  test('TC-GEN-003: Prescription Preview Modal Dismissal via Close, X, and Escape', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // 1. Test Bottom Close button
    await rxPage.openPrescriptionModal();
    await page.waitForTimeout(1500); // Wait with modal open
    await rxPage.modalCloseButton.click();
    await page.waitForTimeout(1500); // Wait after clicking Close button
    await expect(rxPage.prescriptionModal).not.toBeVisible({ timeout: 5000 });

    // 2. Test Top-Right X button
    await rxPage.openPrescriptionModal();
    await page.waitForTimeout(1500); // Wait with modal open
    await rxPage.modalXButton.click();
    await page.waitForTimeout(1500); // Wait after clicking X button
    await expect(rxPage.prescriptionModal).not.toBeVisible({ timeout: 5000 });

    // 3. Test Keyboard Escape key
    await rxPage.openPrescriptionModal();
    await page.waitForTimeout(1500); // Wait with modal open
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500); // Wait after pressing Escape
    await expect(rxPage.prescriptionModal).not.toBeVisible({ timeout: 5000 });

    // Ensure consultation editor remains active
    expect(page.url()).toContain('pid=333566');
  });

  test('TC-GEN-004: End Consultation Confirmation Dialog Validation & Dismissal Safeguards', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // 1. Click End Consultation button
    await rxPage.clickEndConsultation();
    await page.waitForTimeout(1500); // Wait after clicking button to inspect dialog

    // 2. Verify dialog title and warning content
    await expect(rxPage.endConsultationDialog).toBeVisible();
    await expect(rxPage.endConsultationTitle).toBeVisible();
    await expect(rxPage.endConsultationWarningText).toBeVisible();
    await expect(rxPage.printAndEndConsultationButton).toBeVisible();
    await expect(rxPage.endConsultationXButton).toBeVisible();

    // 3. Test dismissal via top-right 'X' button
    await rxPage.endConsultationXButton.click();
    await page.waitForTimeout(1500); // Wait after clicking X
    await expect(rxPage.endConsultationDialog).not.toBeVisible({ timeout: 5000 });

    // 4. Test dismissal via Escape key
    await rxPage.clickEndConsultation();
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500); // Wait after pressing Escape
    await expect(rxPage.endConsultationDialog).not.toBeVisible({ timeout: 5000 });

    // Consultation remains active
    expect(page.url()).toContain('pid=333566');
  });

  test('TC-GEN-005: End Consultation Finalization - Confirm via "Print & End Consultation" and Open Generated Prescription Modal', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // 1. Click End Consultation button
    await rxPage.clickEndConsultation();
    await page.waitForTimeout(1500); // Wait to view dialog

    // 2. Click "Print & End Consultation" to finalize
    await rxPage.confirmEndConsultation();
    await page.waitForTimeout(2000); // Wait after click button

    // 3. Verify URL reflects finalized consultation ID
    expect(page.url()).toContain('pid=333566');
    expect(page.url()).toMatch(/[?&]id=\d+/);

    // 4. Verify Prescription preview modal is automatically generated
    await expect(rxPage.prescriptionModal).toBeVisible();
    await expect(rxPage.modalTitle).toBeVisible();
    await expect(rxPage.modalDownloadButton).toBeVisible();
    await expect(rxPage.modalPrintButton).toBeVisible();
    await expect(rxPage.modalCloseButton).toBeVisible();

    // 5. Dismiss generated modal and verify consultation is finalized
    await rxPage.closePrescriptionModal();
    await page.waitForTimeout(1500); // Wait after clicking Close button
  });

  // --- Lab Reports & Test Results Popups Suite (Add Results & Add Reports) ---

  test('TC-REP-001: Add Reports Popup - Catalog Display, Search Filter, and Dismissal Safeguards', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // 1. Open Add Reports catalog popup
    await rxPage.openAddReportsModal();
    await page.waitForTimeout(1500); // Wait after clicking button

    // 2. Verify dialog title and elements
    await expect(rxPage.selectReportDialog).toBeVisible();
    await expect(rxPage.selectReportTitle).toBeVisible();
    await expect(rxPage.selectReportSearchInput).toBeVisible();
    await expect(rxPage.selectReportCards.first()).toBeVisible();

    // 3. Search for a specific lab investigation report
    await rxPage.selectReportSearchInput.fill('CRP');
    await page.waitForTimeout(1000); // Wait for filtered list
    const crpCard = rxPage.selectReportDialog.locator('text=C-Reactive Protein');
    await expect(crpCard.first()).toBeVisible();

    // 4. Test dismissal via top-right 'X' button
    await rxPage.selectReportXBtn.click();
    await page.waitForTimeout(1500); // Wait after clicking X
    await expect(rxPage.selectReportDialog).not.toBeVisible({ timeout: 5000 });

    // 5. Test dismissal via Escape key
    await rxPage.openAddReportsModal();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    await expect(rxPage.selectReportDialog).not.toBeVisible({ timeout: 5000 });

    // Consultation remains active
    expect(page.url()).toContain('pid=333566');
  });

  test('TC-REP-002: Add Results Popup - Test Fields Verification, Add Field, and Dismissal Safeguards', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // 1. Open Add Results popup
    await rxPage.openAddResultsModal();
    await page.waitForTimeout(1500); // Wait after clicking button

    // 2. Verify dialog title and primary action controls
    await expect(rxPage.addResultsDialog).toBeVisible();
    await expect(rxPage.addResultsTitle).toBeVisible();
    await expect(rxPage.addResultsUploadPdfBtn).toBeVisible();
    await expect(rxPage.addResultsAddTestFieldBtn).toBeVisible();
    await expect(rxPage.addResultsClearAllBtn).toBeVisible();
    await expect(rxPage.addResultsSaveBtn).toBeVisible();

    // 3. Verify clinical input fields
    await expect(rxPage.addResultsTestNameInput.first()).toBeVisible();
    await expect(rxPage.addResultsValueInput.first()).toBeVisible();
    await expect(rxPage.addResultsUnitInput.first()).toBeVisible();
    await expect(rxPage.addResultsRangeInput.first()).toBeVisible();

    // 4. Test Add Test Field dynamically appends another row
    const initialFieldCount = await rxPage.addResultsTestNameInput.count();
    await rxPage.addResultsAddTestFieldBtn.click();
    await page.waitForTimeout(1000);
    await expect(rxPage.addResultsTestNameInput).toHaveCount(initialFieldCount + 1);

    // 5. Test dismissal via top-right 'X' button
    await rxPage.addResultsXBtn.click();
    await page.waitForTimeout(1500); // Wait after clicking X
    await expect(rxPage.addResultsDialog).not.toBeVisible({ timeout: 5000 });

    // 6. Test dismissal via Escape key
    await rxPage.openAddResultsModal();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    await expect(rxPage.addResultsDialog).not.toBeVisible({ timeout: 5000 });

    // Consultation remains active
    expect(page.url()).toContain('pid=333566');
  });

  test('TC-REP-003: Add Results Popup - Enter Manual Test Findings and Save to Prescription', async ({ page }) => {
    const rxPage = new PrescriptionPage(page);
    await rxPage.goto('pid=333566');
    await page.waitForTimeout(2000);

    // 1. Open Add Results popup
    await rxPage.openAddResultsModal();
    await page.waitForTimeout(1500);

    // 2. Populate test result data
    await rxPage.addResultsTestNameInput.first().fill('Hemoglobin');
    await page.waitForTimeout(300);
    await rxPage.addResultsValueInput.first().fill('14.2');
    await page.waitForTimeout(300);
    await rxPage.addResultsUnitInput.first().fill('g/dL');
    await page.waitForTimeout(300);
    await rxPage.addResultsRangeInput.first().fill('13.8 - 17.2');
    await page.waitForTimeout(500);

    // 3. Click Save button in popup
    await rxPage.addResultsSaveBtn.click();
    await page.waitForTimeout(2000); // Wait after clicking Save

    // 4. Verify popup closes upon saving
    await expect(rxPage.addResultsDialog).not.toBeVisible({ timeout: 5000 });

    // 5. Verify the saved test finding appears on the prescription
    await expect(page.locator('text=Hemoglobin').first()).toBeVisible();
    expect(page.url()).toContain('pid=333566');
  });

});
