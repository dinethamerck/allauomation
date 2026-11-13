// pages/DrugHistoryPage.js
const { BasePage } = require('./BasePage');

/**
 * Page Object Model for AMERCK CARE Live Step 8: Drug History
 * Features PrescriptionPad with Condition Labels integration
 * Targets: https://qa_care.amerck.com
 */
class DrugHistoryPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    this.step8Tab = page.getByRole('button', { name: /Drug History/i }).or(page.locator('button:has-text("Drug History")')).first();
    this.addLabelButton = page.getByRole('button', { name: /\+ Add More|Add Label/i })
      .or(page.locator('button:has-text("+ Add More"), button:has-text("Add Label")'))
      .first();

    // Condition Selection Modal
    this.conditionModal = page.getByRole('dialog').first();
    this.modalTitle = page.locator('text=Select Past Medical History Labels').first();
    this.btnDone = page.getByRole('button', { name: 'Done' }).first();
    this.btnClose = page.getByRole('button', { name: 'Close' }).first();

    // Inputs in PrescriptionPad
    this.drugNameInput = page.getByPlaceholder(/Generic name/i).first();
    this.dosageInput = page.getByPlaceholder(/500mg/i).first();
    this.frequencyInput = page.getByPlaceholder(/BID/i).first();
    this.routeInput = page.locator('input[value="PO"]').first();
    this.durationInput = page.getByPlaceholder(/5 days/i).first();

    // Labels & Badges
    this.badgesContainer = page.locator('table').locator('div:has(> button)').first();
  }

  /**
   * Navigate to Step 8: Drug History
   */
  async goto() {
    await this.step8Tab.waitFor({ state: 'visible', timeout: 15000 });
    await this.step8Tab.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Open the Condition Labels modal
   */
  async clickAddLabel() {
    const btn = this.page.getByRole('button', { name: /\+ Add More|Add Label/i })
      .or(this.page.locator('button:has-text("+ Add More"), button:has-text("Add Label")'))
      .first();
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if Condition Modal is visible
   */
  async isConditionModalVisible() {
    return await this.conditionModal.isVisible().catch(() => false);
  }

  /**
   * Get all conditions listed in the modal
   */
  async getModalConditionOptions() {
    const dialog = this.conditionModal;
    return await dialog.getByRole('button').allInnerTexts();
  }

  /**
   * Select a condition in the modal
   * @param {string} conditionName
   */
  async selectConditionInModal(conditionName) {
    const item = this.conditionModal.getByRole('button', { name: conditionName, exact: true });
    await item.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click Done in the modal
   */
  async clickDone() {
    await this.btnDone.click();
    await this.page.waitForTimeout(1500);
  }

  /**
   * Close modal via Close button
   */
  async closeModal() {
    await this.btnClose.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get text of active badges rendered under medication input
   */
  async getActiveBadges() {
    const badges = await this.page.$$eval('table tr td div', els =>
      els.map(e => e.innerText.trim()).filter(t => t && !t.includes('Generic name') && !t.includes('+ Add More'))
    );
    return badges;
  }

  /**
   * Remove a badge by clicking its '✕'
   * @param {string} labelText
   */
  async removeBadge(labelText) {
    const badge = this.page.locator('table').getByText(labelText).first();
    const removeBtn = badge.locator('..').locator('button').first();
    await removeBtn.click();
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { DrugHistoryPage };
