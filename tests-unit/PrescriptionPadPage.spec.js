// tests-unit/PrescriptionPadPage.spec.js
const { test, expect } = require('@playwright/test');
const { PrescriptionPadPage } = require('../pages/PrescriptionPadPage');
const { mockApp, doc } = require('./helpers/mockApp');

const ROUTES = {
  '/admin/prescription': '<h1>Care View</h1>',
  '/admin/opd': '<h1>OPD</h1>',
  '/admin/drugs': '<h1>Drugs</h1>',
};

test.describe('PrescriptionPadPage', () => {
  test('PP-01 gotoCareView() opens /admin/prescription', async ({ page }) => {
    await mockApp(page, ROUTES);
    await new PrescriptionPadPage(page).gotoCareView();
    expect(new URL(page.url()).pathname).toBe('/admin/prescription');
    await expect(page.locator('h1')).toHaveText('Care View');
  });

  test('PP-02 gotoOpdView() opens /admin/opd', async ({ page }) => {
    await mockApp(page, ROUTES);
    await new PrescriptionPadPage(page).gotoOpdView();
    expect(new URL(page.url()).pathname).toBe('/admin/opd');
  });

  test('PP-03 gotoPresetsView() opens /admin/drugs', async ({ page }) => {
    await mockApp(page, ROUTES);
    await new PrescriptionPadPage(page).gotoPresetsView();
    expect(new URL(page.url()).pathname).toBe('/admin/drugs');
  });

  test('PP-04 verifyConditionLabelsNotRendered() reports clean when nothing is rendered', async ({ page }) => {
    await page.setContent(doc('<table><tr><td><input placeholder="Generic name"></td></tr></table>'));
    expect(await new PrescriptionPadPage(page).verifyConditionLabelsNotRendered())
      .toEqual({ badgeCount: 0, addBtnCount: 0, isClean: true });
  });

  test('PP-05 verifyConditionLabelsNotRendered() counts badges and Add Label buttons', async ({ page }) => {
    await page.setContent(doc(`
      <span class="condition-badge">Diabetes</span>
      <span data-testid="condition-badge-ckd">CKD</span>
      <button>+ Add Label</button>`));
    expect(await new PrescriptionPadPage(page).verifyConditionLabelsNotRendered())
      .toEqual({ badgeCount: 2, addBtnCount: 1, isClean: false });
  });

  test('PP-06 verifyConditionLabelsNotRendered() is not clean with only an Add Label button', async ({ page }) => {
    await page.setContent(doc('<button>Add Label</button>'));
    const result = await new PrescriptionPadPage(page).verifyConditionLabelsNotRendered();
    expect(result).toEqual({ badgeCount: 0, addBtnCount: 1, isClean: false });
  });
});
