// tests/regression-views.spec.js
const { test, expect } = require('@playwright/test');
const { PrescriptionPadPage } = require('../pages/PrescriptionPadPage');

test.describe('Regression Testing: Shared PrescriptionPad in Other Modules (0% Regression Risk)', () => {
  let padPage;

  test.beforeEach(async ({ page }) => {
    padPage = new PrescriptionPadPage(page);
  });

  test('TC-REG-01: Care View (/admin/prescription) should NOT render condition labels or "+ Add Label" button', async ({ page }) => {
    await padPage.gotoCareView();

    // Verify condition labels are completely absent (showConditionLabel defaults to false)
    const check = await padPage.verifyConditionLabelsNotRendered();
    expect(check.isClean).toBe(true);
    expect(check.badgeCount).toBe(0);
    expect(check.addBtnCount).toBe(0);
  });

  test('TC-REG-02: OPD View (/admin/opd) should NOT render condition labels or "+ Add Label" button', async ({ page }) => {
    await padPage.gotoOpdView();

    const check = await padPage.verifyConditionLabelsNotRendered();
    expect(check.isClean).toBe(true);
    expect(check.badgeCount).toBe(0);
    expect(check.addBtnCount).toBe(0);
  });

  test('TC-REG-03: Drug Cabinet / Presets (/admin/drugs) should NOT render condition labels', async ({ page }) => {
    await padPage.gotoPresetsView();

    const check = await padPage.verifyConditionLabelsNotRendered();
    expect(check.isClean).toBe(true);
    expect(check.badgeCount).toBe(0);
  });
});
