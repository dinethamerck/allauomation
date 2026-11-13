// pages/PrescriptionPadPage.js
const { BasePage } = require('./BasePage');

/**
 * Page Object Model for Standalone PrescriptionPad Views (Care, OPD, Presets)
 * Targets: https://qa_care.amerck.com
 * Used to verify 0% regression risk when showConditionLabel defaults to false
 */
class PrescriptionPadPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    this.conditionBadges = page.locator('.condition-badge, [data-testid*="condition-badge"]');
    this.btnAddLabels = page.locator('button:has-text("+ Add Label"), button:has-text("Add Label")');
  }

  async gotoCareView() {
    await this.page.goto('/admin/prescription', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2000);
  }

  async gotoOpdView() {
    await this.page.goto('/admin/opd', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2000);
  }

  async gotoPresetsView() {
    await this.page.goto('/admin/drugs', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2000);
  }

  /**
   * Asserts that condition label rows and "+ Add Label" buttons are NOT rendered
   */
  async verifyConditionLabelsNotRendered() {
    const badgeCount = await this.conditionBadges.count();
    const addBtnCount = await this.btnAddLabels.count();

    return {
      badgeCount,
      addBtnCount,
      isClean: badgeCount === 0 && addBtnCount === 0
    };
  }
}

module.exports = { PrescriptionPadPage };
