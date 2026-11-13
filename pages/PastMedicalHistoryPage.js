// pages/PastMedicalHistoryPage.js
const { BasePage } = require('./BasePage');

/**
 * Page Object Model for AMERCK CARE Live Admission Wizard
 * Module: EMR -> Admission -> Step 3: Past Medical History
 * Targets: https://qa_care.amerck.com
 */
class PastMedicalHistoryPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    // Sidebar navigation tabs
    this.step3Tab = page.locator('button, li').filter({ hasText: /Past Medical History/i }).first();
    this.step8Tab = page.locator('button, li').filter({ hasText: /Drug History/i }).first();

    // Diabetes card & quick selection pills
    this.diabetesCard = page.locator('div').filter({ hasText: /^Diabetes/ }).first();
    this.diabetesSection = this.diabetesCard;
    this.diabetesOptionType1 = this.diabetesCard.locator('div, span, button').filter({ hasText: /^I$/ }).first();
    this.diabetesOptionType2 = this.diabetesCard.locator('div, span, button').filter({ hasText: /^II$/ }).first();
    this.diabetesOptionOther = this.diabetesCard.locator('button, div').filter({ hasText: /^Other$/ }).first();

    // Chronic Kidney Disease (CKD) card & quick selection pills
    this.ckdCard = page.locator('div').filter({ hasText: /^Chronic Kidney Disease \(CKD\)/ }).first();
    this.ckdSection = this.ckdCard;
    this.ckdOptionType1 = this.ckdCard.locator('div, span, button').filter({ hasText: /^I$/ }).first();
    this.ckdOptionType2 = this.ckdCard.locator('div, span, button').filter({ hasText: /^II$/ }).first();
    this.ckdOptionType3 = this.ckdCard.locator('div, span, button').filter({ hasText: /^III$/ }).first();
    this.ckdOptionType4 = this.ckdCard.locator('div, span, button').filter({ hasText: /^IV$/ }).first();
    this.ckdOptionType5 = this.ckdCard.locator('div, span, button').filter({ hasText: /^V$/ }).first();

    // COVID-19 card & inputs
    this.covidCard = page.locator('div').filter({ hasText: /^COVID 19/ }).first();
    this.covidSection = this.covidCard;
    this.covidWhenInput = page.getByPlaceholder('When');
    this.vaccineStatusYesRadio = this.covidCard.locator('label, button, div, span').filter({ hasText: /^Yes$/ }).first();
    this.vaccineStatusNoRadio = this.covidCard.locator('label, button, div, span').filter({ hasText: /^No$/ }).first();
    this.btnEditVaccinations = page.locator('button, a').filter({ hasText: /^Edit$/ }).first();
    this.vaccinationDetailsText = page.locator('text=VACCINATION DETAILS');

    // Vaccination Modal Dialog
    this.vaccinationModal = page.locator('[role="dialog"]').or(page.locator('div:has-text("COVID-19 Vaccination Details")')).last();
    this.modalTitle = page.locator('text=COVID-19 Vaccination Details').last();
    this.doseInputs = page.locator('input[placeholder*="1st Dose"], input[placeholder*="Dose"]');
    this.vaccineNameInputs = page.locator('input[placeholder*="Pfizer"], input[placeholder*="Vaccine Name"]');
    this.btnAddDose = page.locator('button:has-text("Add")').last();
    this.btnModalOk = page.locator('button:has-text("OK")').last();
    this.btnModalCancel = page.locator('button:has-text("Cancel")').last();

    // Blood Transfusions
    this.transfusionBefore3m = page.locator('label:has-text("Before 3 months")');
    this.transfusionWithin3m = page.locator('label:has-text("Within 3 months")');
    this.transfusionAdverse = page.locator('label:has-text("Had adverse reaction")');
  }

  /**
   * Navigate directly to Admission Wizard Step 3
   */
  async goto() {
    await this.page.goto('/admin/admissions', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);

    const draftBtn = this.page.locator('text=Draft').first();
    if (await draftBtn.isVisible()) {
      await draftBtn.click();
    } else {
      await this.page.getByRole('button', { name: 'Admit Patient' }).first().click();
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

    await this.page.waitForTimeout(2500);
    const pmhTab = this.page.getByRole('button', { name: /Past Medical History/i }).or(this.page.locator('button:has-text("Past Medical History")')).first();
    await pmhTab.waitFor({ state: 'visible', timeout: 15000 });
    await pmhTab.click();
    await this.page.waitForTimeout(1500);
  }

  // --- Diabetes Methods ---

  async selectDiabetesOption(type) {
    if (type === 'Type I' || type === 'I') {
      const isSelected = await this.isDiabetesOptionSelected('I');
      if (!isSelected) {
        await this.diabetesOptionType1.click();
        await this.page.waitForTimeout(500);
      }
    } else if (type === 'Type II' || type === 'II') {
      const isSelected = await this.isDiabetesOptionSelected('II');
      if (!isSelected) {
        await this.diabetesOptionType2.click();
        await this.page.waitForTimeout(500);
      }
    } else if (type === 'Other') {
      const isSelected = await this.isDiabetesOptionSelected('Other');
      if (!isSelected) {
        await this.diabetesOptionOther.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async isDiabetesOptionSelected(type) {
    let el;
    if (type === 'Type I' || type === 'I') el = this.diabetesOptionType1;
    else if (type === 'Type II' || type === 'II') el = this.diabetesOptionType2;
    else el = this.diabetesOptionOther;

    if (type === 'Other') {
      const state = await el.getAttribute('data-state');
      const expanded = await el.getAttribute('aria-expanded');
      return state === 'open' || expanded === 'true';
    }

    const classNames = (await el.getAttribute('class')) || '';
    return classNames.includes('bg-blue-500') || classNames.includes('primary') || classNames.includes('selected');
  }

  // --- CKD Methods ---

  async selectCkdOption(type) {
    const map = {
      'Type I': this.ckdOptionType1,
      'Type II': this.ckdOptionType2,
      'Type III': this.ckdOptionType3,
      'Type IV': this.ckdOptionType4,
      'Type V': this.ckdOptionType5,
      'I': this.ckdOptionType1,
      'II': this.ckdOptionType2,
      'III': this.ckdOptionType3,
      'IV': this.ckdOptionType4,
      'V': this.ckdOptionType5,
    };
    if (map[type]) {
      await map[type].click();
    }
  }

  async isCkdOptionSelected(type) {
    const map = {
      'Type I': this.ckdOptionType1,
      'Type II': this.ckdOptionType2,
      'Type III': this.ckdOptionType3,
      'Type IV': this.ckdOptionType4,
      'Type V': this.ckdOptionType5,
      'I': this.ckdOptionType1,
      'II': this.ckdOptionType2,
      'III': this.ckdOptionType3,
      'IV': this.ckdOptionType4,
      'V': this.ckdOptionType5,
    };
    const el = map[type];
    const classNames = (await el.getAttribute('class')) || '';
    return classNames.includes('bg-blue-500') || classNames.includes('primary') || classNames.includes('selected');
  }

  async isCkdSectionPlacedBeforeCovid() {
    const ckdBox = await this.ckdCard.boundingBox();
    const covidBox = await this.covidCard.boundingBox();
    if (!ckdBox || !covidBox) return false;
    return ckdBox.y < covidBox.y;
  }

  // --- COVID-19 & Vaccination Methods ---

  async setCovidWhen(text) {
    await this.covidWhenInput.scrollIntoViewIfNeeded();
    await this.covidWhenInput.fill(text);
  }

  async getCovidWhenValue() {
    return await this.covidWhenInput.inputValue();
  }

  async setCovidVaccinationStatus(status) {
    await this.covidCard.scrollIntoViewIfNeeded();
    if (status === 'Yes') {
      const yesRadio = this.covidCard.locator('input[value="Yes"], input[type="radio"]').first();
      const isChecked = await yesRadio.isChecked().catch(() => false);
      if (isChecked && (await this.btnEditVaccinations.isVisible())) {
        await this.btnEditVaccinations.click();
      } else {
        await this.vaccineStatusNoRadio.click();
        await this.page.waitForTimeout(500);
        await this.vaccineStatusYesRadio.click();
      }
    } else {
      await this.vaccineStatusNoRadio.click();
    }
    await this.page.waitForTimeout(1000);
  }

  async isVaccinationModalVisible() {
    return await this.modalTitle.isVisible();
  }

  async fillVaccineRow(index, dose, name) {
    await this.doseInputs.nth(index).fill(dose);
    await this.vaccineNameInputs.nth(index).fill(name);
  }

  async clickAddDoseRow() {
    await this.btnAddDose.click();
  }

  async confirmVaccinationModal() {
    await this.btnModalOk.click();
    await this.page.waitForTimeout(1000);
  }

  async cancelVaccinationModal() {
    await this.btnModalCancel.click();
    await this.page.waitForTimeout(1000);
  }

  async clickEditVaccinations() {
    await this.btnEditVaccinations.click();
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { PastMedicalHistoryPage };
