// pages/InvestigationPage.js
const { BasePage } = require('./BasePage');

/**
 * Page Object Model for AMERCK CARE Live Admission Wizard
 * Module: EMR -> Admission -> Step 2: Investigation Tab & Date-Based Multi-Parameter Matrix
 * Targets: https://qa_care.amerck.com
 */
class InvestigationPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    // Sidebar navigation tabs
    this.stepperSidebar = page.locator('nav, aside, div').filter({ hasText: /Presenting Complaint/i }).first();
    this.investigationTab = page.getByRole('button', { name: /2\.\s*Investigation|Investigation/i }).first();
    this.presentingComplaintTab = page.getByRole('button', { name: /1\.\s*Presenting Complaint/i }).first();
    this.step3Tab = page.getByRole('button', { name: /3\.\s*Systemic Inquiry|3\.\s*Past Medical/i }).first();

    // Blood Group selectors
    this.bloodGroupSection = page.locator('div, section').filter({ hasText: /^Blood Group/i }).first();
    this.bloodGroupBadges = this.bloodGroupSection.locator('div, span, button').filter({ hasText: /^(A\+|A-|B\+|B-|AB\+|AB-|O\+|O-|Custom)$/ });

    // Table elements
    this.table = page.locator('table').first();
    this.parametersHeader = page.locator('th, tr, [role="columnheader"]').filter({ hasText: /Parameters/i }).first();
    this.addDateColumnButton = page.getByRole('button', { name: /\+\s*Add Date Column|Add Date Column/i }).first();
    this.dateInputs = page.locator('input[placeholder*="Select date"]');

    // Toaster notification
    this.toaster = page.locator('[data-rht-toaster]');
  }

  /**
   * Navigates to Admissions and opens an active draft or creates a local admission to reach Step 2
   */
  async goto() {
    await this.page.goto('/admin/admissions', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);

    const draftBtn = this.page.locator('text=Draft').first();
    if (await draftBtn.isVisible()) {
      await draftBtn.click();
    } else {
      const admitBtn = this.page.getByRole('button', { name: 'Admit Patient' }).first();
      await admitBtn.click();
      await this.page.waitForTimeout(1000);
      const dialog = this.page.locator('[role="dialog"]').first();
      await dialog.locator('input[name="query"]').fill('0764981884');
      await dialog.getByRole('button', { name: 'Search' }).click();
      await this.page.waitForTimeout(2000);
      const patientCard = dialog.locator('div:has-text("Dilumi Abeysekara")').last();
      if (await patientCard.isVisible()) {
        await patientCard.click();
        await this.page.waitForTimeout(1500);
        const newDraft = this.page.locator('text=Draft').first();
        if (await newDraft.isVisible()) {
          await newDraft.click();
        }
      }
    }

    await this.toaster.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.investigationTab.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  /**
   * Get the locator for a specific blood group badge
   * (e.g. 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Custom')
   * @param {string} bloodGroup
   */
  getBloodGroupBadge(bloodGroup) {
    return this.bloodGroupSection.getByText(bloodGroup, { exact: true }).first();
  }

  /**
   * Select a blood group
   * @param {string} bloodGroup
   */
  async selectBloodGroup(bloodGroup) {
    const badge = this.getBloodGroupBadge(bloodGroup);
    await badge.waitFor({ state: 'visible', timeout: 10000 });
    await badge.click();
  }

  /**
   * Check if a specific blood group badge is active / selected
   * @param {string} bloodGroup
   * @returns {Promise<boolean>}
   */
  async isBloodGroupSelected(bloodGroup) {
    const badge = this.getBloodGroupBadge(bloodGroup);
    const classAttr = (await badge.getAttribute('class')) || '';
    const parentClass = (await badge.locator('..').getAttribute('class')) || '';
    const ariaPressed = await badge.getAttribute('aria-pressed');

    if (
      classAttr.includes('bg-blue') ||
      classAttr.includes('text-white') ||
      classAttr.includes('active') ||
      classAttr.includes('selected') ||
      classAttr.includes('primary') ||
      parentClass.includes('bg-blue') ||
      parentClass.includes('selected') ||
      ariaPressed === 'true'
    ) {
      return true;
    }

    // Inspect computed style in browser
    return await badge.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const isWhiteText = style.color === 'rgb(255, 255, 255)';
      const isBlueOrColoredBg =
        style.backgroundColor &&
        style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
        !style.backgroundColor.includes('243, 244, 246') &&
        !style.backgroundColor.includes('241, 245, 249') &&
        !style.backgroundColor.includes('255, 255, 255');
      return isWhiteText || isBlueOrColoredBg;
    });
  }

  /**
   * Clicks '+ Add Date Column' button
   */
  async addDateColumn() {
    await this.addDateColumnButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Returns the count of date columns currently present
   * @returns {Promise<number>}
   */
  async getDateColumnCount() {
    return await this.dateInputs.count();
  }

  /**
   * Select a date using the calendar picker for a given column index (0-indexed)
   * @param {number} columnIndex
   * @param {string|number} dayNumber
   */
  async selectDateForColumn(columnIndex = 0, dayNumber = '2') {
    const dateInput = this.dateInputs.nth(columnIndex);
    await dateInput.click();
    await this.page.waitForTimeout(500);

    const dayBtn = this.page
      .locator('[role="dialog"], [role="grid"], .rdp, .react-calendar, div')
      .locator('button, [role="gridcell"]')
      .filter({ hasText: new RegExp(`^\\s*${dayNumber}\\s*$`) })
      .first();

    if (await dayBtn.isVisible().catch(() => false)) {
      await dayBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * Gets the row locator for a specific parameter name or the first available data row
   * @param {string} [parameterName]
   */
  getParameterRow(parameterName) {
    if (parameterName) {
      const row = this.page.locator('tbody tr, table tr').filter({ hasText: new RegExp(parameterName, 'i') }).first();
      return row;
    }
    return this.page.locator('tbody tr, table tr').filter({ has: this.page.locator('input') }).first();
  }

  /**
   * Enters a test result value into a parameter's cell at a specific date column index
   * @param {string} parameterName
   * @param {number} columnIndex (0-indexed)
   * @param {string} value
   */
  async setParameterValue(parameterName, columnIndex, value) {
    const row = this.getParameterRow(parameterName);
    const input = row.locator('input').nth(columnIndex);
    await input.scrollIntoViewIfNeeded();
    await input.fill(value);
  }

  /**
   * Reads the value from a parameter's cell at a specific date column index
   * @param {string} parameterName
   * @param {number} columnIndex (0-indexed)
   * @returns {Promise<string>}
   */
  async getParameterValue(parameterName, columnIndex) {
    const row = this.getParameterRow(parameterName);
    const input = row.locator('input').nth(columnIndex);
    return await input.inputValue();
  }

  /**
   * Navigates away from Investigation step to another step to test persistence
   */
  async navigateAway() {
    await this.step3Tab.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  /**
   * Returns back to Step 2: Investigation tab
   */
  async returnToInvestigation() {
    await this.investigationTab.click({ force: true });
    await this.page.waitForTimeout(1500);
  }
}

module.exports = { InvestigationPage };
