// pages/MedicationTaperPage.js
const { BasePage } = require('./BasePage');

/**
 * Page Object Model for EMR-134: Medication Taper & Sub-Row Hierarchy Management
 * Targets: AMERCK CARE QA (https://qa_pg.amerck.care)
 */
class MedicationTaperPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    // =========================================================================
    // Account Management → Preferences Locators
    // =========================================================================
    this.preferencesTab = page.locator('button, div').filter({ hasText: /^Preferences/ }).first();
    this.taperLabel = page.locator('text=/Tapering Prescriptions/i').first();
    this.taperSwitch = page.locator('button[role="switch"]').last();

    // =========================================================================
    // Care View / Medication Entry Locators
    // =========================================================================
    this.patientSearchInput = page.getByPlaceholder(/Search by name, NIC or mobile number/i);
    this.noPatientHeading = page.locator('text=/No patient selected/i').first();
    this.patientCard = page.locator('text=/Dilumi Abeysekara|Blood Group/i').first();
    this.medicationHeader = page.locator('text=/Generic\\/Brand/i').first();
    this.medicationTable = page.locator('table, div[class*="grid"]').filter({ hasText: /Generic\/Brand|Duration/i }).first();
    
    // Taper Plus buttons and Remove buttons
    this.taperPlusButtons = page.locator('button[aria-label*="Add taper step" i]');
    this.taperRemoveButtons = page.locator('button[aria-label*="Remove taper" i]');
    this.subRowIndicators = page.locator('button[aria-label*="Remove taper" i], input[aria-label*="Stage 2" i]');

    // Primary row inputs
    this.genericNameInput = page.locator('input[placeholder="Generic name"]').first();
    this.dosageInput = page.locator('input[placeholder="e.g. 500mg"]').first();
    this.frequencyInput = page.locator('input[placeholder="e.g. BID"]').first();
    this.routeInput = page.locator('input[placeholder*="Oral" i], input[value="PO"]').first();
    this.durationInput = page.locator('input[placeholder*="5 day" i], input[placeholder*="5 c" i], input[placeholder*="5 d" i]').first();

    // Sub-row (Stage 2) inputs
    this.subRowGenericInput = page.locator('input[aria-label*="Stage 2 medicine" i]').or(page.locator('input[placeholder="Generic name"]').nth(1));
    this.subRowDosageInput = page.locator('input[aria-label*="Stage 2 dosage" i]').or(page.locator('input[placeholder="e.g. 500mg"]').nth(1));
    this.subRowFrequencyInput = page.locator('input[aria-label*="Stage 2 frequency" i]').or(page.locator('input[placeholder="e.g. BID"]').nth(1));
    this.subRowRouteInput = page.locator('input[aria-label*="Stage 2 route" i]').or(page.locator('input[placeholder*="Oral" i]').nth(1));
    this.subRowDurationInput = page.locator('input[aria-label*="Stage 2 duration" i]').or(page.locator('input[placeholder*="5 day" i]').nth(1));

    // Common Action buttons
    this.addMedicationBtn = page.getByRole('button', { name: /Add Medication/i });
    this.saveMedicationsBtn = page.getByRole('button', { name: /Save/i }).first();
    this.clearAllBtn = page.getByRole('button', { name: /Clear All/i });
    this.usePresetBtn = page.getByRole('button', { name: /Use Preset/i });

    // Drug Cabinet Presets
    this.presetsNav = page.locator('a, button').filter({ hasText: /Presets/i });
    this.newPresetBtn = page.getByRole('button', { name: /New Preset/i }).or(page.getByRole('link', { name: /New Preset/i })).or(page.locator('a, button').filter({ hasText: /New Preset/i }).first());
  }

  /**
   * Navigate to Account Management → Preferences
   */
  async gotoPreferences() {
    await this.page.goto('/admin/account', { waitUntil: 'domcontentloaded' });
    await this.ensureAuthenticated();
    await this.preferencesTab.waitFor({ state: 'visible', timeout: 15000 });
    await this.preferencesTab.click();
    await this.taperLabel.waitFor({ state: 'visible', timeout: 15000 });
    await this.taperLabel.scrollIntoViewIfNeeded();
  }

  /**
   * Toggle the Medication Taper preference
   * @param {boolean} targetState
   */
  async setTaperPreference(targetState) {
    await this.gotoPreferences();
    await this.taperSwitch.waitFor({ state: 'visible', timeout: 10000 });
    const isChecked = (await this.taperSwitch.getAttribute('aria-checked')) === 'true';
    if (isChecked !== targetState) {
      const responsePromise = this.page.waitForResponse(
        res => res.url().includes('editProfileData') && res.status() === 200,
        { timeout: 10000 }
      ).catch(() => null);

      await this.taperSwitch.click();
      await responsePromise;
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Navigate to Care View and ensure patient is selected
   */
  async gotoCareView() {
    await this.page.goto('/admin/prescription', { waitUntil: 'domcontentloaded' });
    await this.ensureAuthenticated();
    await this.patientSearchInput.waitFor({ state: 'visible', timeout: 15000 });

    const isNoPatient = await this.noPatientHeading.isVisible().catch(() => false);
    if (isNoPatient) {
      await this.patientSearchInput.click();
      await this.patientSearchInput.fill('0764981884');
      const option = this.page.locator('[role="option"]').first();
      await option.waitFor({ state: 'visible', timeout: 15000 });
      await option.click();
      await this.noPatientHeading.waitFor({ state: 'hidden', timeout: 15000 });
    }

    // Scroll to medications section
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await this.medicationHeader.waitFor({ state: 'visible', timeout: 15000 });
    await this.medicationHeader.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
  }

  /**
   * Reset the medication table to clean state
   */
  async resetMedications() {
    if (await this.clearAllBtn.isVisible().catch(() => false)) {
      await this.clearAllBtn.click();
      await this.page.waitForTimeout(500);
      const confirmDialogBtn = this.page.locator('[role="dialog"], [role="alertdialog"]').locator('button').filter({ hasText: /Clear|Yes|Confirm/i }).first();
      if (await confirmDialogBtn.isVisible().catch(() => false)) {
        await confirmDialogBtn.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * Click the Plus (+) button on a taper stage
   * @param {number} stage
   */
  async clickPlusOnStage(stage = 1) {
    const btn = this.page.locator(`button[aria-label*="stage ${stage}" i], button[aria-label*="Add taper step" i]`).first();
    await btn.waitFor({ state: 'attached', timeout: 10000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Navigate to Drug Cabinet Presets
   */
  async gotoPresets() {
    await this.page.goto('/admin/drugs/presets', { waitUntil: 'domcontentloaded' });
    await this.ensureAuthenticated();
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { MedicationTaperPage };
