// @ts-check

class ReportTemplatesPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Directory Page Controls
    this.mainContainer = page.locator('main').first();
    this.searchInput = page.locator('input[placeholder="Search templates..."]').first();
    this.newTemplateButton = page.locator('button:has-text("New Template")');
    this.templateCards = page.locator('main .rounded-xl.shadow.border, main .rounded-xl');
    this.paginationSummary = page.locator('text=/Showing \\d+ to \\d+ of \\d+ templates/');
    this.previousButton = page.locator('button:has-text("Previous"), a:has-text("Previous")').first();
    this.nextButton = page.locator('button:has-text("Next"), a:has-text("Next")').first();

    // Template Form Controls (New / Edit)
    this.nameInput = page.locator('input[name="name"]');
    this.abbreviationInput = page.locator('input[name="abbreviation"]');
    this.descriptionInput = page.locator('textarea[name="description"]');
    this.categoryInput = page.locator('input[name="category"]');
    this.saveButton = page.locator('button:has-text("Save")');
    this.backLink = page.locator('a:has-text("Back")').first();

    // Delete Confirmation Dialog
    this.deleteDialog = page.locator('div[role="dialog"]:has-text("Are you sure?"), [role="alertdialog"]');
    this.confirmDeleteButton = this.deleteDialog.locator('button:has-text("Delete Template")');
    this.cancelDeleteButton = this.deleteDialog.locator('button:has-text("Cancel")');
  }

  /**
   * Navigates to Report Templates directory page
   */
  async goto() {
    await this.page.goto('/admin/report-templates', { waitUntil: 'domcontentloaded' });
    await this.searchInput.waitFor({ state: 'visible', timeout: 20000 });
    await this.templateCards.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
  }

  /**
   * Filters template cards by search term
   * @param {string} query
   */
  async search(query) {
    await this.searchInput.waitFor({ state: 'visible' });
    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('getUserTemplates'),
      { timeout: 7000 }
    ).catch(() => null);
    await this.searchInput.fill(query);
    await responsePromise;
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clears template search input
   */
  async clearSearch() {
    await this.searchInput.waitFor({ state: 'visible' });
    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('getUserTemplates'),
      { timeout: 7000 }
    ).catch(() => null);
    await this.searchInput.fill('');
    await responsePromise;
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clicks "New Template" button to open creation page
   */
  async clickNewTemplate() {
    await this.newTemplateButton.waitFor({ state: 'visible' });
    await this.newTemplateButton.click();
    await this.page.waitForURL((url) => url.pathname.includes('/report-templates/new'), { timeout: 10000 });
    await this.nameInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Fills template form fields
   * @param {{ name?: string, abbreviation?: string, description?: string, category?: string }} data
   */
  async fillTemplateDetails(data) {
    if (data.name) {
      await this.nameInput.waitFor({ state: 'visible' });
      await this.nameInput.fill(data.name);
    }
    if (data.abbreviation) {
      await this.abbreviationInput.fill(data.abbreviation);
    }
    if (data.description) {
      await this.descriptionInput.fill(data.description);
    }
    if (data.category) {
      await this.categoryInput.fill(data.category);
    }
  }

  /**
   * Clicks Save button and waits for API persistence
   */
  async saveTemplate() {
    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('report-templates') && (res.status() === 200 || res.status() === 201),
      { timeout: 10000 }
    ).catch(() => null);

    await this.saveButton.click();
    await responsePromise;
    await this.page.waitForTimeout(2000);
  }

  /**
   * Full workflow: Creates a template from directory
   * @param {{ name: string, abbreviation?: string, description?: string, category?: string }} data
   */
  async createTemplate(data) {
    await this.clickNewTemplate();
    await this.fillTemplateDetails(data);
    await this.saveTemplate();
  }

  /**
   * Clicks Back link to return to directory
   */
  async clickBack() {
    await this.backLink.waitFor({ state: 'visible' });
    await this.backLink.click();
    await this.page.waitForURL((url) => url.pathname === '/admin/report-templates' || url.pathname.endsWith('/report-templates'), { timeout: 10000 });
    await this.searchInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Finds card container for a template by abbreviation or text
   * @param {string} text
   */
  getCardByText(text) {
    return this.page.locator('main .rounded-xl').filter({ hasText: text }).first();
  }

  /**
   * Clicks Edit button on a specific template card
   * @param {string} text
   */
  async editTemplateByText(text) {
    const card = this.getCardByText(text);
    const editBtn = card.locator('button[title="Edit template"]');
    await editBtn.waitFor({ state: 'visible' });
    await editBtn.click();
    await this.page.waitForURL((url) => url.pathname.includes('/report-templates/'), { timeout: 10000 });
    await this.nameInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Deletes a template by text/abbreviation and confirms dialog
   * @param {string} text
   */
  async deleteTemplateByText(text) {
    const card = this.getCardByText(text);
    const deleteBtn = card.locator('button[title="Delete template"]');
    await deleteBtn.waitFor({ state: 'visible' });
    await deleteBtn.click();

    await this.deleteDialog.waitFor({ state: 'visible', timeout: 5000 });
    await this.confirmDeleteButton.click();
    await this.deleteDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null);
    await this.page.waitForTimeout(1500);
  }
}

module.exports = { ReportTemplatesPage };
