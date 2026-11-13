// @ts-check

class PrescriptionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Search bar (cmdk combobox)
    this.searchInput = page.locator('input[placeholder*="Search by name, NIC or mobile"]');
    this.searchResultItems = page.locator('[cmdk-item], [role="option"]');

    // Top Navigation Links (Schedule, Patients, Admissions, Investigations, Report Templates, Care View)
    this.navScheduleLink = page.locator('a[href*="/admin/schedule"]').first();
    this.navPatientsLink = page.locator('a[href*="/admin/patients"]').first();
    this.navAdmissionsLink = page.locator('a[href*="/admin/admissions"]').first();
    this.navInvestigationsLink = page.locator('a[href*="/admin/investigations"]').first();
    this.navReportTemplatesLink = page.locator('a[href*="/admin/report-templates"]').first();
    this.navDocumentsLink = page.locator('a[href*="/admin/letters"]').first();
    this.navPrescriptionLink = page.locator('a[href*="/admin/prescription"]').first();

    // Header & Tabs
    this.todayTab = page.locator('button[role="tab"]:has-text("Today")');
    this.storyTab = page.locator('button[role="tab"]:has-text("Story")');
    this.patientDetailsTab = page.locator('button[role="tab"]:has-text("Patient Details")');

    // Empty state & Patient selection
    this.noPatientCard = page.locator('text=No patient selected');
    this.registerPatientButton = page.locator('button:has-text("Register Patient")');

    // Patient Bio summary (visible after selecting patient)
    this.patientBioHeader = page.locator('div:has-text("New Consultation"), div:has-text("Close Patient")');
    this.closePatientButton = page.locator('button:has-text("Close Patient")');
    this.newConsultationButton = page.locator('button:has-text("New Consultation")');

    // Prescription form inputs
    this.dateInput = page.locator('input[name="date"], input[type="date"], input[value^="202"]').first();
    this.referredByInput = page.locator('input[name="referred_by"]');
    this.presentingProblemsInput = page.locator('textarea[name="presenting_problems"], textarea[placeholder*="History"], textarea').first();
    this.systolicBpInput = page.locator('input[name="systolic_bp"]');
    this.diastolicBpInput = page.locator('input[name="diastolic_bp"]');
    this.bpmInput = page.locator('input[name="bpm"]');
    this.weightInput = page.locator('input[name="weight"]');
    this.heightInput = page.locator('input[name="height"]');
    this.bmiInput = page.locator('input[name="bmi"]');
    this.hcInput = page.locator('input[name="hc"]');
    this.tempInput = page.locator('input[name="temp"]');
    this.rrInput = page.locator('input[name="rr"]');
    this.lungsInput = page.locator('input[name="lungs"]');
    this.cvsInput = page.locator('input[name="cvs"]');
    this.diagnosisInput = page.locator('input[placeholder*="Comma separated diagnosis"]');
    this.managementPlanInput = page.locator('textarea[name="management_plan"]');

    // Medication inputs & controls
    this.addMedicationButton = page.locator('button:has-text("Add Medication")');
    this.clearAllButton = page.locator('div[role="tabpanel"] button:has-text("Clear All")').last();
    this.medicationClearAllButton = this.clearAllButton;
    this.labFindingsClearAllButton = page.locator('div[role="tabpanel"] button:has-text("Clear All")').first();
    this.usePresetButton = page.locator('button:has-text("Use Preset")');
    this.genericNameInputs = page.locator('input[placeholder="Generic name"]');
    this.medicationGenericInput = this.genericNameInputs;
    this.dosageInputs = page.locator('input[placeholder="500mg"], input[placeholder="e.g. 500mg"], table tbody tr td:nth-child(2) input');
    this.medicationDosageInput = this.dosageInputs;
    this.frequencyInputs = page.locator('input[placeholder="BID"], input[placeholder="e.g. BID"], table tbody tr td:nth-child(3) input');
    this.medicationFrequencyInput = this.frequencyInputs;
    this.routeInputs = page.locator('input[placeholder="Oral"], input[placeholder="e.g. Oral"], table tbody tr td:nth-child(4) input');
    this.medicationRouteInput = this.routeInputs;
    this.durationInputs = page.locator('input[placeholder="5 days"], input[placeholder="e.g. 5 days"], table tbody tr td:nth-child(5) input');
    this.medicationDurationInput = this.durationInputs;
    this.deleteMedicationButtons = page.locator('button:has(svg.lucide-circle-x)');

    // Action bar buttons & indicators
    this.saveIndicator = page.locator('#save-indicator');
    this.saveButton = page.locator('button:has-text("Save")');
    this.printButton = page.locator('button:has-text("Print")');
    this.useThisButton = page.locator('button:has-text("Use this")');
    this.endConsultationButton = page.locator('button:has-text("End Consultation")');
    this.sendToPharmacyButton = page.locator('button:has-text("Send to Pharmacy")');

    // Modals
    this.printModal = page.locator('div[role="dialog"]:has-text("Prescription")');
    this.prescriptionModal = page.locator('div[role="dialog"]:has(h2:has-text("Prescription"))');
    this.modalTitle = this.prescriptionModal.locator('h2:has-text("Prescription")');
    this.modalCloseButton = this.prescriptionModal.locator('button:has-text("Close"):not(.absolute)');
    this.modalXButton = this.prescriptionModal.locator('button.absolute');
    this.modalDownloadButton = this.prescriptionModal.locator('button:has-text("Download")');
    this.modalPrintButton = this.prescriptionModal.locator('button:has-text("Print")');
    this.sealToggle = page.locator('#seal-toggle');
    this.downloadPdfButton = page.locator('button:has-text("Download")');
    this.patientWizardModal = page.locator('div[role="dialog"]:has-text("New Patient Wizard")');
    this.patientWizardInput = this.patientWizardModal.locator('input[name="query"], input[placeholder*="ID Card Number"]');
    this.patientWizardSearchButton = this.patientWizardModal.locator('button:has-text("Search")');
    this.patientWizardCloseButton = this.patientWizardModal.locator('button:has-text("Close")');
    this.patientWizardResultCards = this.patientWizardModal.locator('div.cursor-pointer, button:has-text("Add")');
    this.patientWizardAddButtons = this.patientWizardResultCards;
    this.patientWizardCreateNewButton = this.patientWizardModal.locator('button:has-text("Create New Patient")');

    // End Consultation Confirmation Dialog
    this.endConsultationDialog = page.locator('div[role="dialog"]:has(h2:has-text("End Consultation"))');
    this.endConsultationTitle = this.endConsultationDialog.locator('h2:has-text("End Consultation")');
    this.endConsultationWarningText = this.endConsultationDialog.locator('text=Are you sure you want to end this consultation?');
    this.printAndEndConsultationButton = this.endConsultationDialog.locator('button:has-text("Print & End Consultation")');
    this.endConsultationXButton = this.endConsultationDialog.locator('button.absolute');

    // Add Results & Add Reports Buttons and Modals
    this.addResultsButton = page.locator('button:has-text("Add Results"), button:has-text("Results")');
    this.addReportsButton = page.locator('button:has-text("Add Reports"), button:has-text("Reports")');
    this.addResultsDialog = page.locator('div[role="dialog"]:has(h2:has-text("Add/Upload Test Results"))');
    this.addResultsTitle = this.addResultsDialog.locator('h2:has-text("Add/Upload Test Results")');
    this.addResultsTestNameInput = this.addResultsDialog.locator('input[placeholder="Test name"]');
    this.addResultsValueInput = this.addResultsDialog.locator('input[placeholder="Result"]');
    this.addResultsUnitInput = this.addResultsDialog.locator('input[placeholder="Unit"]');
    this.addResultsRangeInput = this.addResultsDialog.locator('input[placeholder="Normal range"]');
    this.addResultsAddTestFieldBtn = this.addResultsDialog.locator('button:has-text("Add Test Field")');
    this.addResultsClearAllBtn = this.addResultsDialog.locator('button:has-text("Clear All")');
    this.addResultsSaveBtn = this.addResultsDialog.locator('button:has-text("Save")');
    this.addResultsUploadPdfBtn = this.addResultsDialog.locator('button:has-text("Upload PDF")');
    this.addResultsXBtn = this.addResultsDialog.locator('button.absolute');

    this.selectReportDialog = page.locator('div[role="dialog"]:has(h2:has-text("Select Report"))');
    this.selectReportTitle = this.selectReportDialog.locator('h2:has-text("Select Report")');
    this.selectReportSearchInput = this.selectReportDialog.locator('input[placeholder="Search…"]');
    this.selectReportCards = this.selectReportDialog.locator('div.rounded-xl.border');
    this.selectReportXBtn = this.selectReportDialog.locator('button.absolute');
  }

  /**
   * Opens Add Results modal and waits for dialog
   */
  async openAddResultsModal() {
    await this.addResultsButton.first().waitFor({ state: 'visible' });
    await this.addResultsButton.first().click();
    await this.page.waitForTimeout(1500);
    await this.addResultsDialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Opens Add Reports catalog modal and waits for dialog
   */
  async openAddReportsModal() {
    await this.addReportsButton.first().waitFor({ state: 'visible' });
    await this.addReportsButton.first().click();
    await this.page.waitForTimeout(1500);
    await this.selectReportDialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Clicks End Consultation button in the action bar and waits for confirmation dialog
   */
  async clickEndConsultation() {
    await this.endConsultationButton.waitFor({ state: 'visible' });
    await this.endConsultationButton.click();
    await this.page.waitForTimeout(1500);
    await this.endConsultationDialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Confirms End Consultation by clicking "Print & End Consultation" and waits for generated prescription modal
   */
  async confirmEndConsultation() {
    await this.printAndEndConsultationButton.waitFor({ state: 'visible' });
    await this.printAndEndConsultationButton.click();
    await this.page.waitForTimeout(2000);
    await this.prescriptionModal.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Opens the prescription preview modal via keyboard shortcut (Ctrl+P)
   */
  async openPrescriptionModal() {
    await this.page.keyboard.press('Control+p');
    await this.prescriptionModal.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(1500);
  }

  /**
   * Closes the prescription preview modal via bottom Close button
   */
  async closePrescriptionModal() {
    await this.modalCloseButton.waitFor({ state: 'visible' });
    await this.modalCloseButton.click();
    await this.page.waitForTimeout(1500);
    await this.prescriptionModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null);
  }

  async goto(params = '') {
    const url = `/admin/prescription${params ? `?${params}` : ''}`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    if (params.includes('pid')) {
      await this.todayTab.waitFor({ state: 'visible', timeout: 30000 });
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Search for a patient by Name, NIC, or Mobile number
   * @param {string} query
   */
  async searchPatient(query) {
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.click();

    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('/patients/getPatients') && res.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    await this.searchInput.fill(query);
    await responsePromise;
    await this.page.waitForTimeout(500); // UI render wait
  }

  /**
   * Select the first patient suggestion from the dropdown
   */
  async selectFirstPatient() {
    await this.searchResultItems.first().waitFor({ state: 'visible', timeout: 8000 });
    const selectedText = await this.searchResultItems.first().innerText();
    await this.searchResultItems.first().click();
    return selectedText;
  }

  /**
   * Full workflow: Search patient and navigate to prescription
   * @param {string} query
   */
  async searchAndSelectPatient(query) {
    await this.searchPatient(query);
    const patientText = await this.selectFirstPatient();
    await this.page.waitForURL((url) => url.searchParams.has('pid'), { timeout: 10000 });
    return patientText;
  }

  /**
   * Opens the Register Patient Wizard modal
   */
  async openPatientWizard() {
    await this.registerPatientButton.first().waitFor({ state: 'visible' });
    await this.registerPatientButton.first().click();
    await this.patientWizardModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Closes the Register Patient Wizard modal via Escape key
   */
  async closePatientWizard() {
    await this.page.keyboard.press('Escape');
    await this.patientWizardModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null);
  }

  /**
   * Search within the New Patient Wizard modal
   * @param {string} identifier
   */
  async searchInPatientWizard(identifier) {
    await this.patientWizardInput.waitFor({ state: 'visible' });
    await this.patientWizardInput.fill(identifier);

    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('getUniqueIdentifyPatients'),
      { timeout: 10000 }
    ).catch(() => null);

    await this.patientWizardSearchButton.click();
    await responsePromise;
    await this.page.waitForTimeout(1000);
  }

  /**
   * Select/add patient from wizard search results
   * @param {number} [index=0]
   */
  async addPatientFromWizard(index = 0) {
    await this.patientWizardResultCards.nth(index).waitFor({ state: 'visible', timeout: 10000 });
    await this.patientWizardResultCards.nth(index).click();
    await this.page.waitForURL((url) => url.searchParams.has('pid'), { timeout: 10000 });
  }

  /**
   * Switch to the Story tab
   */
  async switchToStoryTab() {
    await this.storyTab.waitFor({ state: 'visible' });
    await this.storyTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to the Today tab
   */
  async switchToTodayTab() {
    await this.todayTab.waitFor({ state: 'visible' });
    await this.todayTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to the Patient Details tab (mobile / responsive)
   */
  async switchToPatientDetailsTab() {
    if (await this.patientDetailsTab.isVisible()) {
      await this.patientDetailsTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Checks if a patient is currently selected (pid in URL)
   */
  async isPatientSelected() {
    return this.page.url().includes('pid=');
  }

  /**
   * Navigates to Schedule page via top navbar calendar icon
   */
  async navigateToSchedule() {
    await this.navScheduleLink.waitFor({ state: 'visible' });
    await this.navScheduleLink.click();
    await this.page.waitForURL((url) => url.pathname.includes('/admin/schedule'), { timeout: 10000 });
  }

  /**
   * Navigates to Patients page via top navbar users icon
   */
  async navigateToPatients() {
    await this.navPatientsLink.waitFor({ state: 'visible' });
    await this.navPatientsLink.click();
    await this.page.waitForURL((url) => url.pathname.includes('/admin/patients'), { timeout: 10000 });
  }

  /**
   * Navigates to Admissions page via top navbar admissions icon
   */
  async navigateToAdmissions() {
    await this.navAdmissionsLink.waitFor({ state: 'visible' });
    await this.navAdmissionsLink.click();
    await this.page.waitForURL((url) => url.pathname.includes('/admin/admissions'), { timeout: 10000 });
  }

  /**
   * Navigates to Investigations page via top navbar investigations icon
   */
  async navigateToInvestigations() {
    await this.navInvestigationsLink.waitFor({ state: 'visible' });
    await this.navInvestigationsLink.click();
    await this.page.waitForURL((url) => url.pathname.includes('/admin/investigations'), { timeout: 10000 });
  }

  /**
   * Navigates to Report Templates page via top navbar report templates icon
   */
  async navigateToReportTemplates() {
    await this.navReportTemplatesLink.waitFor({ state: 'visible' });
    await this.navReportTemplatesLink.click();
    await this.page.waitForURL((url) => url.pathname.includes('/admin/report-templates'), { timeout: 10000 });
  }

  /**
   * Navigates to Documents page via top navbar documents icon
   */
  async navigateToDocuments() {
    await this.navDocumentsLink.waitFor({ state: 'visible' });
    await this.navDocumentsLink.click();
    await this.page.waitForURL((url) => url.pathname.includes('/admin/letters'), { timeout: 10000 });
  }

  /**
   * Clears patient search input
   */
  async clearPatientSearch() {
    await this.searchInput.fill('');
    await this.page.waitForTimeout(300);
  }

  /**
   * Gets patient heading locator
   * @param {string} name
   */
  getPatientHeading(name) {
    return this.page.getByRole('heading', { name });
  }

  async waitForSaveIndicator(status = 'All changes saved', timeout = 10000) {
    await this.page.waitForFunction(
      ({ selector, expected }) => {
        const el = document.querySelector(selector);
        return el && el.textContent && el.textContent.includes(expected);
      },
      { selector: '#save-indicator', expected: status },
      { timeout }
    );
  }

  async triggerPrintShortcut() {
    await this.page.keyboard.press('Control+p');
  }

  async triggerSaveShortcut() {
    await this.page.keyboard.press('Control+s');
  }

  /**
   * Fill patient vitals
   * @param {{ systolic?: string, diastolic?: string, bpm?: string, temp?: string, rr?: string, lungs?: string, cvs?: string }} vitals
   */
  async fillVitals(vitals) {
    if (vitals.systolic) {
      await this.systolicBpInput.waitFor({ state: 'visible' });
      await this.systolicBpInput.click();
      await this.systolicBpInput.fill(vitals.systolic);
      await this.systolicBpInput.press('Tab');
      await this.page.waitForTimeout(100);
    }
    if (vitals.diastolic) {
      await this.diastolicBpInput.waitFor({ state: 'visible' });
      await this.diastolicBpInput.click();
      await this.diastolicBpInput.fill(vitals.diastolic);
      await this.diastolicBpInput.press('Tab');
      await this.page.waitForTimeout(100);
    }
    if (vitals.bpm) {
      await this.bpmInput.waitFor({ state: 'visible' });
      await this.bpmInput.click();
      await this.bpmInput.fill(vitals.bpm);
      await this.bpmInput.press('Tab');
      await this.page.waitForTimeout(100);
    }
    if (vitals.weight) {
      await this.weightInput.waitFor({ state: 'visible' });
      await this.weightInput.click();
      await this.weightInput.fill(vitals.weight);
      await this.weightInput.press('Tab');
      await this.page.waitForTimeout(200);
    }
    if (vitals.height) {
      await this.heightInput.waitFor({ state: 'visible' });
      await this.heightInput.click();
      await this.heightInput.fill(vitals.height);
      await this.heightInput.press('Tab');
      await this.page.waitForTimeout(200);
    }
    if (vitals.temp) {
      await this.tempInput.waitFor({ state: 'visible' });
      await this.tempInput.click();
      await this.tempInput.fill(vitals.temp);
      await this.tempInput.press('Tab');
      await this.page.waitForTimeout(100);
    }
    if (vitals.rr) {
      await this.rrInput.waitFor({ state: 'visible' });
      await this.rrInput.click();
      await this.rrInput.fill(vitals.rr);
      await this.rrInput.press('Tab');
      await this.page.waitForTimeout(100);
    }
    if (vitals.lungs) {
      await this.lungsInput.waitFor({ state: 'visible' });
      await this.lungsInput.fill(vitals.lungs);
    }
    if (vitals.cvs) {
      await this.cvsInput.waitFor({ state: 'visible' });
      await this.cvsInput.fill(vitals.cvs);
    }
  }

  /**
   * Fill presenting problems / history
   * @param {string} problems
   */
  async fillPresentingProblems(problems) {
    await this.presentingProblemsInput.waitFor({ state: 'visible' });
    await this.presentingProblemsInput.click();
    await this.presentingProblemsInput.fill(problems);
  }

  /**
   * Add a diagnosis tag
   * @param {string} diagnosis
   */
  async addDiagnosis(diagnosis) {
    await this.diagnosisInput.waitFor({ state: 'visible' });
    await this.diagnosisInput.fill(diagnosis);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Add a new medication row via Add Medication button
   */
  async addNewMedicationRow() {
    await this.addMedicationButton.waitFor({ state: 'visible' });
    await this.addMedicationButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Fill medication fields at a specific row index
   * @param {{ generic?: string, dosage?: string, frequency?: string, route?: string, duration?: string }} med
   * @param {number} [index=0]
   */
  async fillMedicationRow(med, index = 0) {
    if (med.generic) {
      await this.genericNameInputs.nth(index).waitFor({ state: 'visible' });
      await this.genericNameInputs.nth(index).click();
      await this.genericNameInputs.nth(index).fill(med.generic);
      await this.page.waitForTimeout(200);
    }
    if (med.dosage) {
      await this.dosageInputs.nth(index).waitFor({ state: 'visible' });
      await this.dosageInputs.nth(index).click();
      await this.dosageInputs.nth(index).fill(med.dosage);
      await this.page.waitForTimeout(200);
    }
    if (med.frequency) {
      await this.frequencyInputs.nth(index).waitFor({ state: 'visible' });
      await this.frequencyInputs.nth(index).click();
      await this.frequencyInputs.nth(index).fill(med.frequency);
      await this.page.waitForTimeout(200);
    }
    if (med.route) {
      await this.routeInputs.nth(index).waitFor({ state: 'visible' });
      await this.routeInputs.nth(index).click();
      await this.routeInputs.nth(index).fill(med.route);
      await this.page.waitForTimeout(200);
    }
    if (med.duration) {
      await this.durationInputs.nth(index).waitFor({ state: 'visible' });
      await this.durationInputs.nth(index).click();
      await this.durationInputs.nth(index).fill(med.duration);
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Add a medication (legacy helper)
   * @param {{ generic?: string, dosage?: string, frequency?: string, route?: string, duration?: string }} med
   */
  async addMedication(med) {
    await this.fillMedicationRow(med, 0);
  }

  /**
   * Click the Save button
   */
  async clickSave() {
    await this.saveButton.waitFor({ state: 'visible' });
    await this.saveButton.click();
  }

  /**
   * Click the Print button
   */
  async clickPrint() {
    await this.printButton.waitFor({ state: 'visible' });
    await this.printButton.click();
  }
}

module.exports = { PrescriptionPage };
