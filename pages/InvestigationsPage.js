// @ts-check

class InvestigationsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Header & Actions
    this.mainContainer = page.locator('main').first();
    this.searchInput = page.locator('input[placeholder="Search reports..."]').first();
    this.addReportButton = page.locator('button:has-text("Add New Report"), button:has-text("Add")').first();

    // Directory Table & Rows
    this.table = page.locator('table');
    this.tableHeaders = page.locator('table thead th, table th');
    this.tableRows = page.locator('table tbody tr');
    this.tableBody = page.locator('table tbody');
    this.editButtons = page.locator('table tbody tr button:has-text("Edit")');
    this.createTemplateButtons = page.locator('table tbody tr button:has-text("Create Template")');

    // Pagination
    this.previousButton = page.locator('button:has-text("Previous"), a:has-text("Previous")').first();
    this.nextButton = page.locator('button:has-text("Next"), a:has-text("Next")').first();
    this.pageIndicator = page.locator('text=/\\d+\\/\\d+/').first();

    // Add New Report Modal
    this.addDialog = page.locator('div[role="dialog"]:has-text("Add New Report")');
    this.addDialogTitle = this.addDialog.locator('text=Add New Report');
    this.addAbbreviationInput = this.addDialog.locator('input[name="abbreviation"]');
    this.addNameInput = this.addDialog.locator('input[name="name"]');
    this.addDescriptionInput = this.addDialog.locator('textarea#description, textarea[placeholder*="Additional details"]');
    this.addInstructionsInput = this.addDialog.locator('textarea#instructions, textarea[placeholder*="Special instructions"]');
    this.addCreateButton = this.addDialog.locator('button:has-text("Create Report")');
    this.addCloseButton = this.addDialog.locator('button:has-text("Close"), button.absolute').first();

    // Edit Report Modal
    this.editDialog = page.locator('div[role="dialog"]:has-text("Edit Report")');
    this.editDialogTitle = this.editDialog.locator('text=Edit Report');
    this.editAbbreviationInput = this.editDialog.locator('input[name="abbreviation"]');
    this.editNameInput = this.editDialog.locator('input[name="name"]');
    this.editDescriptionInput = this.editDialog.locator('textarea[placeholder*="Additional details"]');
    this.editInstructionsInput = this.editDialog.locator('textarea[placeholder*="Special instructions"]');
    this.editUpdateButton = this.editDialog.locator('button:has-text("Update Report")');
    this.editDeleteButton = this.editDialog.locator('button:has-text("Delete Report"), button:has-text("Delete")');
    this.editCloseButton = this.editDialog.locator('button:has-text("Close"), button.absolute').first();
  }

  /**
   * Navigates to Investigations directory page
   */
  async goto() {
    await this.page.goto('/admin/investigations', { waitUntil: 'domcontentloaded' });
    await this.searchInput.waitFor({ state: 'visible', timeout: 20000 });
    await this.tableRows.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
  }

  /**
   * Searches for an investigation report by keyword or abbreviation
   * @param {string} query
   */
  async search(query) {
    await this.searchInput.waitFor({ state: 'visible' });
    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('getInvestigations'),
      { timeout: 7000 }
    ).catch(() => null);
    await this.searchInput.fill(query);
    await responsePromise;
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clears investigation search input
   */
  async clearSearch() {
    await this.searchInput.waitFor({ state: 'visible' });
    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('getInvestigations'),
      { timeout: 7000 }
    ).catch(() => null);
    await this.searchInput.fill('');
    await responsePromise;
    await this.page.waitForTimeout(1000);
  }

  /**
   * Opens Add New Report modal
   */
  async openAddReportDialog() {
    await this.addReportButton.waitFor({ state: 'visible' });
    await this.addReportButton.click();
    await this.addDialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Closes Add New Report modal
   */
  async closeAddReportDialog() {
    await this.addCloseButton.waitFor({ state: 'visible' });
    await this.addCloseButton.click();
    await this.addDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null);
  }

  /**
   * Fills and creates a new report
   * @param {{ abbreviation: string, name: string, description?: string, instructions?: string }} reportData
   */
  async createReport(reportData) {
    await this.openAddReportDialog();
    if (reportData.abbreviation) {
      await this.addAbbreviationInput.fill(reportData.abbreviation);
    }
    if (reportData.name) {
      await this.addNameInput.fill(reportData.name);
    }
    if (reportData.description) {
      await this.addDescriptionInput.fill(reportData.description);
    }
    if (reportData.instructions) {
      await this.addInstructionsInput.fill(reportData.instructions);
    }

    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('investigations') && (res.status() === 200 || res.status() === 201),
      { timeout: 10000 }
    ).catch(() => null);

    await this.addCreateButton.click();
    await responsePromise;
    await this.page.waitForTimeout(1500);
  }

  /**
   * Opens Edit modal for a row index
   * @param {number} [index=0]
   */
  async openEditDialog(index = 0) {
    await this.tableRows.first().waitFor({ state: 'visible', timeout: 15000 });
    const editBtn = this.editButtons.nth(index);
    await editBtn.waitFor({ state: 'visible', timeout: 15000 });
    await editBtn.click();
    await this.editDialog.waitFor({ state: 'visible', timeout: 5000 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Finds row by text
   * @param {string} text
   */
  getRowByText(text) {
    return this.tableRows.filter({ hasText: text }).first();
  }

  /**
   * Opens Edit modal for a row matching text
   * @param {string} text
   */
  async openEditDialogByText(text) {
    const row = this.getRowByText(text);
    await row.waitFor({ state: 'visible', timeout: 15000 });
    const editBtn = row.locator('button:has-text("Edit")');
    await editBtn.waitFor({ state: 'visible', timeout: 15000 });
    await editBtn.click();
    await this.editDialog.waitFor({ state: 'visible', timeout: 5000 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Closes Edit modal
   */
  async closeEditDialog() {
    await this.editCloseButton.waitFor({ state: 'visible' });
    await this.editCloseButton.click();
    await this.editDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null);
  }

  /**
   * Updates an existing report
   * @param {{ name?: string, description?: string, instructions?: string }} updateData
   */
  async updateReport(updateData) {
    if (updateData.name) {
      await this.editNameInput.fill(updateData.name);
    }
    if (updateData.description) {
      await this.editDescriptionInput.fill(updateData.description);
    }
    if (updateData.instructions) {
      await this.editInstructionsInput.fill(updateData.instructions);
    }

    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('investigations') && res.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    await this.editUpdateButton.click();
    await responsePromise;
    await this.page.waitForTimeout(1500);
  }

  /**
   * Deletes report from currently open Edit modal
   */
  async deleteReport() {
    await this.editDeleteButton.waitFor({ state: 'visible' });
    await this.editDeleteButton.click();
    await this.page.waitForTimeout(1000);

    // If confirmation button appears, click it
    const confirmBtn = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")').last();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await this.editDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null);
    await this.page.waitForTimeout(1500);
  }
}

module.exports = { InvestigationsPage };
