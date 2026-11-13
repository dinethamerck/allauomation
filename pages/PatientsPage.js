// @ts-check

/**
 * PatientsPage - Page Object Model for Amerck Care EMR Client / Patient Directory & Profile
 * Routes: /admin/patients, /admin/patients/edit/:id, /admin/patients/edit/new
 */
class PatientsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Top Header & Practice Info
    this.practiceHeading = page.locator('button:has-text("Practice"), button:has-text("JR")');

    // Search Controls
    this.searchInput = page.locator('input[name="query"], input[placeholder*="Search"]').first();

    // Directory Table & Headers
    this.patientTable = page.locator('table');
    this.tableHeaders = page.locator('table thead th, th');
    this.patientRows = page.locator('table tbody tr');
    this.firstRow = page.locator('table tbody tr').first();

    // Primary Action Buttons
    this.newPatientButton = page.locator('button:has-text("New"), button:has-text("Patient")').filter({ hasText: 'Patient' }).first();

    // Pagination Controls
    this.nextButton = page.locator('button:has-text("Next"), a:has-text("Next")').first();
    this.previousButton = page.locator('button:has-text("Previous"), a:has-text("Previous")').first();
    this.pageIndicator = page.locator('a:has-text("/"), span:has-text("/"), div:has-text("/")').filter({ hasText: /\d+\s*\/\s*\d+/ }).first();

    // New Patient / Lookup Modal
    this.lookupDialog = page.locator('div[role="dialog"]');
    this.lookupDialogTitle = page.locator('div[role="dialog"] h2, div[role="dialog"] h3, div[role="dialog"] text="unique identifier"');
    this.lookupInput = page.locator('div[role="dialog"] input[name="query"], div[role="dialog"] input[placeholder*="NIC"], div[role="dialog"] input').first();
    this.lookupSearchButton = page.locator('div[role="dialog"] button:has-text("Search")');
    this.lookupCloseButton = page.locator('div[role="dialog"] button:has-text("Close")');

    // Patient Profile Edit Form Locators (/admin/patients/edit/:id)
    this.nameInput = page.locator('input[name="name"]');
    this.ageInput = page.locator('input[name="age"]');
    this.nicInput = page.locator('input[name="nic"]');
    this.genderSelect = page.locator('select[name="gender"]');
    this.maritalStatusSelect = page.locator('select[name="marital_status"]');

    // Contact Information
    this.mobileInput = page.locator('input[name="mobile"]');
    this.whatsappInput = page.locator('input[name="whatsapp"]');
    this.emergencyContactInput = page.locator('input[name="em_contact"]');
    this.emailInput = page.locator('input[name="email"]');
    this.occupationInput = page.locator('input[name="occupation"]');
    this.cityInput = page.locator('input[name="city"]');
    this.addressInput = page.locator('input[name="address"]');

    // Physical Measurements
    this.weightInput = page.locator('input[name="weight"]');
    this.heightInput = page.locator('input[name="height"]');
    this.bmiInput = page.locator('input[name="bmi"]');

    // Medical Information
    this.phnNumberInput = page.locator('input[name="phn_number"]');
    this.bloodGroupSelect = page.locator('select[name="blood_group"]');

    // Form Submit & Actions
    this.saveButton = page.locator('button:has-text("Save")').last();
    this.signConsentButton = page.locator('button:has-text("Sign Consent Form")');
    this.consentStatusBadge = page.locator('text="Consent Form Not Signed", text="Consent Form Signed"');
  }

  /**
   * Navigates to patients list page
   */
  async goto() {
    await this.page.goto('/admin/patients', { waitUntil: 'domcontentloaded' });
    await this.patientTable.waitFor({ state: 'visible', timeout: 20000 });
  }

  /**
   * Searches for a patient by query text
   * @param {string} query
   */
  async searchPatient(query) {
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(1500);
  }

  /**
   * Clears patient search input
   */
  async clearSearch() {
    await this.searchInput.fill('');
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(1500);
  }

  /**
   * Opens New Patient registration wizard modal
   */
  async openNewPatientWizard() {
    await this.newPatientButton.waitFor({ state: 'visible' });
    await this.newPatientButton.click();
    await this.lookupDialog.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Closes New Patient wizard modal
   */
  async closeNewPatientWizard() {
    await this.lookupCloseButton.waitFor({ state: 'visible' });
    await this.lookupCloseButton.click();
    await this.lookupDialog.waitFor({ state: 'hidden', timeout: 5000 });
  }

  /**
   * Clicks a patient row in the table
   * @param {number} [index=0]
   */
  async selectPatientRow(index = 0) {
    await this.patientRows.nth(index).waitFor({ state: 'visible' });
    await this.patientRows.nth(index).click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Navigates to patient edit page directly
   * @param {string|number} patientId
   */
  async gotoEdit(patientId) {
    await this.page.goto(`/admin/patients/edit/${patientId}`, { waitUntil: 'domcontentloaded' });
    await this.nameInput.waitFor({ state: 'visible', timeout: 20000 });
  }
}

module.exports = { PatientsPage };
