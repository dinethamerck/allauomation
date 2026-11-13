// @ts-check

/**
 * Page Object Model for the Amerck Care Diagnosis Directory module (/admin/diagnosis)
 */
class DiagnosisPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Header & Actions
    this.heading = page.locator('h1, h2, h3, div').filter({ hasText: /^Diagnosis$/ }).first();
    this.searchInput = page.locator('input[placeholder*="Search"], input[name="query"]').first();
    this.addDiagnosisButton = page.locator('button:has-text("Add")').first();

    // Table & Columns
    this.table = page.locator('table');
    this.tableHeaders = page.locator('table thead th, table th');
    this.tableRows = page.locator('table tbody tr');
    this.tableBody = page.locator('table tbody');
    this.customBadges = page.locator('table tbody tr').locator('text=Custom');
    this.globalBadges = page.locator('table tbody tr').locator('text=Global');

    // Pagination
    this.previousButton = page.locator('button:has-text("Previous"), a:has-text("Previous")').first();
    this.nextButton = page.locator('button:has-text("Next"), a:has-text("Next")').first();
    this.pageIndicator = page.locator('text=/\\d+\\/\\d+/').first();

    // Add Diagnosis Dialog
    this.addDialog = page.locator('div[role="dialog"]').filter({ hasText: 'Add Diagnosis' });
    this.addDialogTitle = this.addDialog.locator('text=Add Diagnosis');
    this.addDescriptionInput = this.addDialog.locator('input[name="description"]');
    this.addCodeInput = this.addDialog.locator('input[name="code"]');
    this.addSaveButton = this.addDialog.locator('button[type="submit"]:has-text("Save")');
    this.addCloseButton = this.addDialog.locator('button:has-text("Close"), button.absolute').first();

    // Edit Diagnosis Dialog
    this.editDialog = page.locator('div[role="dialog"]').filter({ hasText: 'Edit Diagnosis' });
    this.editDialogTitle = this.editDialog.locator('text=Edit Diagnosis');
    this.editDescriptionInput = this.editDialog.locator('input[name="description"]');
    this.editCodeInput = this.editDialog.locator('input[name="code"]');
    this.editSaveButton = this.editDialog.locator('button:has-text("Save"):not(:has-text("Save as Custom"))');
    this.editDeleteButton = this.editDialog.locator('button:has-text("Delete")');
    this.editCloseButton = this.editDialog.locator('button:has-text("Close"), button.absolute').first();

    // Global Diagnosis elements inside Edit Dialog
    this.globalSaveCustomButton = this.editDialog.locator('button:has-text("Save as Custom Diagnosis")');
    this.globalInfoNotice = this.editDialog.locator('text=This is a global reference diagnosis');

    // Sidebar navigation links
    this.sidebarDiagnosisLink = page.locator('nav a[href*="/admin/diagnosis"], aside a[href*="/admin/diagnosis"], a:has-text("Diagnosis")').first();
    this.sidebarAdmissionsLink = page.locator('a[href*="/admin/admissions"]').first();
    this.sidebarScheduleLink = page.locator('a[href*="/admin/schedule"]').first();
    this.sidebarPatientsLink = page.locator('a[href*="/admin/patients"]').first();
    this.sidebarDrugCabinetLink = page.locator('a[href*="/admin/drugs"]').first();
    this.sidebarCareViewLink = page.locator('a[href*="/admin/prescription"]').first();
    this.sidebarInvestigationsLink = page.locator('a[href*="/admin/investigations"]').first();
    this.sidebarReportTemplatesLink = page.locator('a[href*="/admin/report-templates"]').first();
    this.sidebarDocumentsLink = page.locator('a[href*="/admin/letters"]').first();
  }

  /**
   * Navigates to Diagnosis directory page and waits for initial data load
   */
  async goto() {
    const responsePromise = this.page.waitForResponse(
      resp => resp.url().includes('/diagnosis/getDiagnosis') && resp.status() === 200,
      { timeout: 25000 }
    ).catch(() => null);

    await this.page.goto('/admin/diagnosis', { waitUntil: 'domcontentloaded' });
    await this.searchInput.waitFor({ state: 'visible', timeout: 20000 });
    await responsePromise;
    await this.tableRows.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
  }

  /**
   * Searches for a diagnosis by keyword or ICD code
   * @param {string} query
   */
  async search(query) {
    const responsePromise = this.page.waitForResponse(
      resp => resp.url().includes('/diagnosis/getDiagnosis') && resp.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    await this.searchInput.fill(query);
    await responsePromise;
  }

  /**
   * Clears the search input field and re-syncs table
   */
  async clearSearch() {
    const responsePromise = this.page.waitForResponse(
      resp => resp.url().includes('/diagnosis/getDiagnosis') && resp.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    await this.searchInput.fill('');
    await responsePromise;
  }

  /**
   * Opens the "Add Diagnosis" modal dialog
   */
  async openAddDialog() {
    await this.addDiagnosisButton.click();
    await this.addDialog.waitFor({ state: 'visible', timeout: 8000 });
  }

  /**
   * Fills and creates a new custom diagnosis
   * @param {string} description Diagnosis Name
   * @param {string} [code] ICD Code
   */
  async createDiagnosis(description, code = '') {
    await this.openAddDialog();
    await this.addDescriptionInput.fill(description);
    if (code) {
      await this.addCodeInput.fill(code);
    }

    const postPromise = this.page.waitForResponse(
      resp => resp.url().includes('/diagnosis') && resp.request().method() === 'POST' && (resp.status() === 200 || resp.status() === 201),
      { timeout: 10000 }
    ).catch(() => null);

    await this.addSaveButton.click();
    await postPromise;
    await this.addDialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => null);
  }

  /**
   * Opens the edit modal for a diagnosis row matching text
   * @param {string} text
   */
  async openDiagnosisRow(text) {
    let row = this.page.locator('table tbody tr', { hasText: text }).first();
    const isVisible = await row.isVisible().catch(() => false);
    if (!isVisible) {
      await this.search(text);
      row = this.page.locator('table tbody tr', { hasText: text }).first();
    }
    await row.waitFor({ state: 'visible', timeout: 10000 });
    await row.click();
    await this.editDialog.waitFor({ state: 'visible', timeout: 8000 });
  }

  /**
   * Opens the first custom diagnosis in the current view
   */
  async openFirstCustomDiagnosis() {
    const customRow = this.page.locator('table tbody tr:has-text("Custom")').first();
    await customRow.waitFor({ state: 'visible', timeout: 10000 });
    await customRow.click();
    await this.editDialog.waitFor({ state: 'visible', timeout: 8000 });
  }

  /**
   * Opens the first global diagnosis in the current view
   */
  async openFirstGlobalDiagnosis() {
    const globalRow = this.page.locator('table tbody tr:has-text("Global")').first();
    await globalRow.waitFor({ state: 'visible', timeout: 10000 });
    await globalRow.click();
    await this.editDialog.waitFor({ state: 'visible', timeout: 8000 });
  }

  /**
   * Updates an existing diagnosis from the Edit modal
   * @param {string} newDescription
   * @param {string} [newCode]
   */
  async updateDiagnosis(newDescription, newCode) {
    if (newDescription) {
      await this.editDescriptionInput.fill(newDescription);
    }
    if (newCode !== undefined) {
      await this.editCodeInput.fill(newCode);
    }

    const putPromise = this.page.waitForResponse(
      resp => resp.url().includes('/diagnosis') && resp.request().method() === 'PUT' && resp.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    await this.editSaveButton.click();
    await putPromise;
    await this.editDialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => null);
  }

  /**
   * Deletes a custom diagnosis from the Edit modal
   */
  async deleteDiagnosis() {
    const deletePromise = this.page.waitForResponse(
      resp => resp.url().includes('/diagnosis') && resp.request().method() === 'DELETE' && resp.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    await this.editDeleteButton.click();
    await deletePromise;
    await this.editDialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => null);
  }

  /**
   * Saves a global reference diagnosis as a custom diagnosis
   */
  async saveAsCustom() {
    const postOrPutPromise = this.page.waitForResponse(
      resp => resp.url().includes('/diagnosis') && (resp.status() === 200 || resp.status() === 201),
      { timeout: 15000 }
    ).catch(() => null);

    await this.globalSaveCustomButton.click();
    await postOrPutPromise;
    await this.page.waitForTimeout(500);
  }

  /**
   * Closes active dialog (Add or Edit) via Close button
   */
  async closeDialog() {
    const closeBtn = this.page.locator('div[role="dialog"] button:has-text("Close"), div[role="dialog"] button.absolute').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Navigates to next page in table
   */
  async nextPage() {
    const responsePromise = this.page.waitForResponse(
      resp => resp.url().includes('/diagnosis/getDiagnosis') && resp.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    await this.nextButton.click();
    await responsePromise;
    await this.page.waitForTimeout(300);
  }

  /**
   * Navigates to previous page in table
   */
  async prevPage() {
    const responsePromise = this.page.waitForResponse(
      resp => resp.url().includes('/diagnosis/getDiagnosis') && resp.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    await this.previousButton.click();
    await responsePromise;
    await this.page.waitForTimeout(300);
  }

  /**
   * Returns current page indicator string, e.g. "1/1960"
   * @returns {Promise<string>}
   */
  async getPageIndicatorText() {
    return await this.pageIndicator.innerText();
  }

  /**
   * Returns count of rows currently in table
   * @returns {Promise<number>}
   */
  async getRowCount() {
    return await this.tableRows.count();
  }
}

module.exports = { DiagnosisPage };
