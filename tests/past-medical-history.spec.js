// tests/past-medical-history.spec.js
const { test, expect } = require('@playwright/test');
const { PastMedicalHistoryPage } = require('../pages/PastMedicalHistoryPage');

test.describe('AMERCK CARE Live - Step 3: Past Medical History', () => {
  let pmhPage;

  test.beforeEach(async ({ page }) => {
    pmhPage = new PastMedicalHistoryPage(page);
    await pmhPage.goto();
  });

  // =========================================================================
  // 1. DIABETES - QUICK SELECTION OPTIONS
  // =========================================================================
  test.describe('1. Diabetes Quick Selection Options', () => {
    test('TC-PMH-01: Should display quick-selection options (Type I, Type II, Other) under Diabetes', async ({ page }) => {
      const diabetesLabel = page.locator('text=Diabetes').first();
      await expect(diabetesLabel).toBeVisible();

      await expect(pmhPage.diabetesOptionType1).toBeVisible();
      await expect(pmhPage.diabetesOptionType2).toBeVisible();
      await expect(pmhPage.diabetesOptionOther).toBeVisible();
    });

    test('TC-PMH-02: Should allow quick selection of Type I Diabetes', async () => {
      await pmhPage.selectDiabetesOption('I');
      const isSelected = await pmhPage.isDiabetesOptionSelected('I');
      expect(isSelected).toBe(true);
    });

    test('TC-PMH-03: Should allow switching selection from Type I to Type II Diabetes', async () => {
      await pmhPage.selectDiabetesOption('I');
      await pmhPage.selectDiabetesOption('II');
      const isType2Selected = await pmhPage.isDiabetesOptionSelected('II');
      expect(isType2Selected).toBe(true);
    });

    test('TC-PMH-04: Should allow selecting "Other" Diabetes option', async () => {
      await pmhPage.selectDiabetesOption('Other');
      const isOtherSelected = await pmhPage.isDiabetesOptionSelected('Other');
      expect(isOtherSelected).toBe(true);
    });
  });

  // =========================================================================
  // 2. CHRONIC KIDNEY DISEASE (CKD) SECTION
  // =========================================================================
  test.describe('2. Chronic Kidney Disease (CKD) Section', () => {
    test('TC-PMH-06: Should verify CKD section is placed before COVID-19 section in layout', async () => {
      await expect(pmhPage.ckdSection).toBeVisible();
      await expect(pmhPage.covidSection).toBeVisible();

      const isPlacedBefore = await pmhPage.isCkdSectionPlacedBeforeCovid();
      expect(isPlacedBefore).toBe(true);
    });

    test('TC-PMH-07: Should provide quick-selection options Type I through Type V for CKD', async () => {
      await expect(pmhPage.ckdOptionType1).toBeVisible();
      await expect(pmhPage.ckdOptionType2).toBeVisible();
      await expect(pmhPage.ckdOptionType3).toBeVisible();
      await expect(pmhPage.ckdOptionType4).toBeVisible();
      await expect(pmhPage.ckdOptionType5).toBeVisible();
    });

    test('TC-PMH-08: Should allow user to select applicable CKD type directly (e.g. Type III)', async () => {
      await pmhPage.selectCkdOption('III');
      const isSelected = await pmhPage.isCkdOptionSelected('III');
      expect(isSelected).toBe(true);
    });

    test('TC-PMH-09: Should allow switching CKD type selection (e.g. from Type III to Type V)', async () => {
      await pmhPage.selectCkdOption('III');
      await pmhPage.selectCkdOption('V');
      const isType5Selected = await pmhPage.isCkdOptionSelected('V');
      expect(isType5Selected).toBe(true);
    });
  });

  // =========================================================================
  // 3. COVID-19 SECTION MODIFICATIONS
  // =========================================================================
  test.describe('3. COVID-19 Section Modifications', () => {
    test('TC-PMH-10: Should have "When" text field replacing previous "Duration" field', async () => {
      await pmhPage.covidSection.scrollIntoViewIfNeeded();
      await expect(pmhPage.covidWhenInput).toBeVisible();
      await expect(pmhPage.covidWhenInput).toHaveAttribute('placeholder', 'When');
    });

    test('TC-PMH-11: Should allow user to enter date or text into the "When" field', async () => {
      await pmhPage.setCovidWhen('August 2021');
      expect(await pmhPage.getCovidWhenValue()).toBe('August 2021');
    });

    test('TC-PMH-12: Should provide Vaccination Status options (Yes / No)', async () => {
      await pmhPage.covidSection.scrollIntoViewIfNeeded();
      await expect(pmhPage.vaccineStatusYesRadio).toBeVisible();
      await expect(pmhPage.vaccineStatusNoRadio).toBeVisible();
    });

    test('TC-PMH-13: Selecting "No" should NOT open modal', async () => {
      await pmhPage.covidSection.scrollIntoViewIfNeeded();
      await pmhPage.setCovidVaccinationStatus('No');
      expect(await pmhPage.isVaccinationModalVisible()).toBe(false);
    });

    test('TC-PMH-14: Selecting "Yes" should display the COVID-19 Vaccination Details modal', async () => {
      await pmhPage.covidSection.scrollIntoViewIfNeeded();
      await pmhPage.setCovidVaccinationStatus('Yes');
      expect(await pmhPage.isVaccinationModalVisible()).toBe(true);
      await pmhPage.cancelVaccinationModal();
    });
  });

  // =========================================================================
  // 4. VACCINATION DETAILS POP-UP / MODAL & DISPLAY
  // =========================================================================
  test.describe('4. Vaccination Details Modal & Display', () => {
    test.beforeEach(async () => {
      await pmhPage.covidSection.scrollIntoViewIfNeeded();
      await pmhPage.setCovidVaccinationStatus('Yes');
      await expect(pmhPage.modalTitle).toBeVisible();
    });

    test('TC-PMH-15: Modal should contain Dose and Vaccine Name fields and Add button', async () => {
      await expect(pmhPage.modalTitle).toBeVisible();
      await expect(pmhPage.doseInputs.first()).toBeVisible();
      await expect(pmhPage.vaccineNameInputs.first()).toBeVisible();
      await expect(pmhPage.btnAddDose).toBeVisible();
      await expect(pmhPage.btnModalOk).toBeVisible();
      await expect(pmhPage.btnModalCancel).toBeVisible();
      await pmhPage.cancelVaccinationModal();
    });

    test('TC-PMH-16: User can enter Dose and Vaccine Name (e.g. Dose 1: Pfizer)', async () => {
      await pmhPage.fillVaccineRow(0, 'Dose 1', 'Pfizer');
      const doseVal = await pmhPage.doseInputs.first().inputValue();
      const nameVal = await pmhPage.vaccineNameInputs.first().inputValue();
      expect(doseVal).toBe('Dose 1');
      expect(nameVal).toBe('Pfizer');
      await pmhPage.cancelVaccinationModal();
    });

    test('TC-PMH-17: User can add another dose row via "+ Add"', async () => {
      const initialCount = await pmhPage.doseInputs.count();
      await pmhPage.clickAddDoseRow();
      const newCount = await pmhPage.doseInputs.count();
      expect(newCount).toBe(initialCount + 1);

      await pmhPage.fillVaccineRow(newCount - 1, 'Dose 2', 'Pfizer');
      const doseVal = await pmhPage.doseInputs.nth(newCount - 1).inputValue();
      const nameVal = await pmhPage.vaccineNameInputs.nth(newCount - 1).inputValue();
      expect(doseVal).toBe('Dose 2');
      expect(nameVal).toBe('Pfizer');
      await pmhPage.cancelVaccinationModal();
    });

    test('TC-PMH-18: Clicking "Cancel" or "✕" dismisses the modal', async () => {
      await pmhPage.cancelVaccinationModal();
      expect(await pmhPage.isVaccinationModalVisible()).toBe(false);
    });

    test('TC-PMH-19: Clicking "OK" confirms and saves vaccination details to main form', async () => {
      await pmhPage.fillVaccineRow(0, 'Dose 1', 'Pfizer');
      await pmhPage.confirmVaccinationModal();
      expect(await pmhPage.isVaccinationModalVisible()).toBe(false);

      // Verify VACCINATION DETAILS section and Edit link are visible on main form
      await expect(pmhPage.vaccinationDetailsText).toBeVisible();
      await expect(pmhPage.btnEditVaccinations).toBeVisible();
    });

    test('TC-PMH-20: User can click "Edit" in main form to re-open modal with preserved data', async ({ page }) => {
      await pmhPage.confirmVaccinationModal();
      await expect(pmhPage.modalTitle).toBeHidden();

      await pmhPage.clickEditVaccinations();
      expect(await pmhPage.isVaccinationModalVisible()).toBe(true);
      await pmhPage.cancelVaccinationModal();
    });
  });
});
