require('dotenv').config();
const { chromium } = require('@playwright/test');
const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE, viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto('/admin/admissions/onboarding/222?step=7', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /8\.\s*Social History/ }).click();
  await page.locator('text=No. of Children').waitFor();
  const inputs = page.locator('input[type="number"]');
  await inputs.nth(0).fill('2'); await inputs.nth(1).fill('1.5');
  await page.getByRole('button', { name: /11\.\s*Summary/ }).click();
  await page.waitForTimeout(2500);
  const txt = await page.locator('main, body').first().innerText();
  const i = txt.search(/child/i);
  console.log(i >= 0 ? txt.slice(Math.max(0, i - 300), i + 400) : 'no "child" text in summary\n' + txt.slice(0, 1500));
  await page.screenshot({ path: 'scratch/emr67-summary.png', fullPage: true });
  await browser.close();
})();
