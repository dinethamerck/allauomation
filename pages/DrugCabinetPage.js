// @ts-check

/**
 * Page Object Model for the Amerck Care Drug Cabinet module (/admin/drugs)
 */
class DrugCabinetPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Table & Header Elements
    this.table = page.locator('table');
    this.tableHeaders = page.locator('table thead th');
    this.tableRows = page.locator('table tbody tr');

    // Controls & Action Buttons
    this.searchInput = page.locator('input[placeholder*="Search"]');
    this.addButton = page.locator('button:has-text("Add")');
    this.populateButton = page.locator('button:has-text("Populate")');
    this.presetsLink = page.locator('a:has-text("Presets"), a[href*="presets"]');

    // Drawer / Dialog Elements
    this.dialog = page.locator('div[role="dialog"]');
    this.dialogTitle = page.locator('div[role="dialog"] h2');
    this.genericNameInput = page.locator('div[role="dialog"] input[name="generic_name"]');
    this.brandNameInput = page.locator('div[role="dialog"] input[name="brand_name"]');
    this.dosageInput = page.locator('div[role="dialog"] input[name="dosage"]');
    this.methodInput = page.locator('div[role="dialog"] input[name="method"]');
    this.frequencyInput = page.locator('div[role="dialog"] input[name="frequency"]');
    this.saveButton = page.locator('div[role="dialog"] button:has-text("Save")');
    this.deleteButton = page.locator('div[role="dialog"] button:has-text("Delete")');
    this.closeDialogButton = page.locator('div[role="dialog"] button:has-text("Close"), div[role="dialog"] button:has(svg)').first();

    // Pagination
    this.paginationNext = page.locator('a:has-text("Next"), button:has-text("Next")');
    this.paginationPrev = page.locator('a:has-text("Previous"), button:has-text("Previous")');
  }

  async goto() {
    await this.page.goto('/admin/drugs', { waitUntil: 'domcontentloaded' });
    await this.table.waitFor({ state: 'visible', timeout: 25000 });
    await this.tableRows.first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);
  }

  /**
   * Search for a drug in the cabinet and wait for API sync
   * @param {string} query
   */
  async searchDrug(query) {
    const responsePromise = this.page.waitForResponse(
      resp => resp.url().includes('getDrugs') && resp.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    await this.searchInput.fill(query);
    await responsePromise;
    await this.page.waitForTimeout(400); // DOM render settle
  }

  async clearSearch() {
    const responsePromise = this.page.waitForResponse(
      resp => resp.url().includes('getDrugs') && resp.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    await this.searchInput.fill('');
    await responsePromise;
    await this.page.waitForTimeout(400);
  }

  async openAddModal() {
    await this.addButton.click();
    await this.dialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Fill drug fields in the drawer/dialog
   * @param {{ genericName?: string, brandName?: string, dosage?: string, method?: string, frequency?: string }} data
   */
  async fillDrugForm(data) {
    if (data.genericName !== undefined) {
      await this.genericNameInput.fill(data.genericName);
    }
    if (data.brandName !== undefined) {
      await this.brandNameInput.fill(data.brandName);
    }
    if (data.dosage !== undefined) {
      await this.dosageInput.fill(data.dosage);
    }
    if (data.method !== undefined) {
      await this.methodInput.fill(data.method);
    }
    if (data.frequency !== undefined) {
      await this.frequencyInput.fill(data.frequency);
    }
  }

  async saveDrug() {
    await this.saveButton.click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Helper to add a new drug
   * @param {{ genericName: string, brandName?: string, dosage?: string, method?: string, frequency?: string }} data
   */
  async addDrug(data) {
    await this.openAddModal();
    await this.fillDrugForm(data);
    await this.saveDrug();
  }

  /**
   * Locate a row matching specific text
   * @param {string} text
   */
  getRow(text) {
    return this.page.locator('table tbody tr', { hasText: text });
  }

  /**
   * Click on a row to open the Edit Drug drawer
   * @param {string} text
   */
  async clickRow(text) {
    await this.getRow(text).first().click();
    await this.dialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Edit an existing drug
   * @param {string} targetText
   * @param {{ brandName?: string, dosage?: string, method?: string, frequency?: string }} data
   */
  async editDrug(targetText, data) {
    await this.clickRow(targetText);
    await this.fillDrugForm(data);
    await this.saveDrug();
  }

  /**
   * Delete an existing drug via the Edit modal
   * @param {string} targetText
   */
  async deleteDrug(targetText) {
    await this.clickRow(targetText);
    await this.deleteButton.click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 });
    await this.page.waitForTimeout(500);
  }
}

module.exports = { DrugCabinetPage };
