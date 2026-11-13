const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  await page.goto('https://qa_pg.amerck.care/admin/prescription', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Search & select patient
  const searchInput = page.locator('input[placeholder*="Search by name"]').first();
  await searchInput.fill('Dilumi');
  await page.waitForTimeout(1500);
  await page.locator('div, li, tr').filter({ hasText: /Dilumi/i }).last().click();
  await page.waitForTimeout(2000);

  // Find the taper plus button
  const plusBtn = page.locator('button[aria-label*="Add taper" i]').first();
  console.log('Plus button visible:', await plusBtn.isVisible());

  if (await plusBtn.isVisible()) {
    console.log('Clicking Add taper button...');
    await plusBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/after-taper-plus-click.png' });

    // Inspect the new row(s) and hierarchy
    const rows = await page.$$eval('div[class*="grid"], [class*="taper"], input[placeholder*="Dosage"]', els => els.map(e => ({
      tag: e.tagName,
      className: e.className,
      placeholder: e.placeholder || '',
      value: e.value || '',
      label: e.getAttribute('aria-label') || ''
    })));
    console.log('DOM after plus click:', rows.slice(0, 15));
  }

  await browser.close();
})();
