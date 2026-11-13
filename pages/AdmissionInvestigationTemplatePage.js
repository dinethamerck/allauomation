// pages/AdmissionInvestigationTemplatePage.js
const { BasePage } = require('./BasePage');

/**
 * Page Object Model for AMERCK CARE Admission Investigation Templates
 * Route: https://qa_care.amerck.com/admin/admission-investigations
 */
class AdmissionInvestigationTemplatePage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    this.url = '/admin/admission-investigations';
    this.createTemplateButton = page.getByRole('button', { name: /\+\s*Create Template|Create Template/i }).first();
    this.searchTemplateInput = page.locator('input[placeholder*="Search templates" i]');
    this.templateTable = page.locator('table').first();

    // Modal elements
    this.modalDialog = page.locator('[role="dialog"]').first();
    this.templateNameInput = this.modalDialog.locator('input[placeholder*="General Surgery Investigation Template" i]');
    this.descriptionInput = this.modalDialog.locator('textarea[placeholder*="description" i]');
    this.addSectionButton = this.modalDialog.getByRole('button', { name: /Add Section/i });
    this.addParameterButton = this.modalDialog.getByRole('button', { name: /Add Parameter/i });
    this.addGroupButton = this.modalDialog.getByRole('button', { name: /Add Group/i });
    this.saveTemplateButton = this.modalDialog.getByRole('button', { name: /^Create Template$|^Save$/i }).last();
    this.cancelButton = this.modalDialog.getByRole('button', { name: /Cancel/i });
    this.closeButton = this.modalDialog.locator('button:has(svg)').last();
  }

  async goto() {
    await this.page.goto(this.url, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Opens the Create Template modal
   */
  async openCreateModal() {
    await this.createTemplateButton.click();
    await this.modalDialog.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Creates an investigation template with a given name and optional description
   * @param {string} name
   * @param {string} [description]
   */
  async createTemplate(name, description = '') {
    await this.openCreateModal();
    await this.templateNameInput.fill(name);
    if (description) {
      await this.descriptionInput.fill(description);
    }
    await this.saveTemplateButton.click();
    await this.page.waitForTimeout(1500);
  }

  /**
   * Locates a template row by its name
   * @param {string} templateName
   */
  getTemplateRow(templateName) {
    return this.page.locator('tr').filter({ hasText: new RegExp(templateName, 'i') }).first();
  }

  /**
   * Checks if a template is displayed in the templates table
   * @param {string} templateName
   * @returns {Promise<boolean>}
   */
  async isTemplateListed(templateName) {
    const row = this.getTemplateRow(templateName);
    return await row.isVisible();
  }

  /**
   * Deletes a template by name
   * @param {string} templateName
   */
  async deleteTemplate(templateName) {
    const row = this.getTemplateRow(templateName);
    // Click trash can icon in the row
    const deleteBtn = row.locator('button:has(svg.lucide-trash-2), button:has(svg)').last();
    await deleteBtn.click();
    await this.page.waitForTimeout(500);

    // Confirm in popup dialog if present
    const confirmBtn = this.page.getByRole('button', { name: /Delete|Confirm|Yes/i }).last();
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
      await this.page.waitForTimeout(1500);
    }
  }

  /**
   * Copies a template by name
   * @param {string} templateName
   */
  async copyTemplate(templateName) {
    const row = this.getTemplateRow(templateName);
    const copyBtn = row.locator('button:has(svg.lucide-copy), button').nth(1);
    await copyBtn.click();
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { AdmissionInvestigationTemplatePage };
