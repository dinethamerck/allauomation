const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  // 1. Turn toggle ON in Preferences
  await page.goto('https://qa_pg.amerck.care/admin/account', { waitUntil: 'networkidle' });
  const prefTab = page.locator('button, div').filter({ hasText: /^Preferences/ }).first();
  await prefTab.click();
  await page.waitForTimeout(500);

  const taperLabel = page.getByText('Tapering Prescriptions').first();
  await taperLabel.scrollIntoViewIfNeeded();

  const taperSwitch = page.locator('button[role="switch"]').last();
  const isChecked = await taperSwitch.getAttribute('aria-checked');
  console.log('Current switch state:', isChecked);
  if (isChecked !== 'true') {
    await taperSwitch.click();
    await page.waitForTimeout(1000);
    console.log('Switch turned ON:', await taperSwitch.getAttribute('aria-checked'));
  }

  // 2. Open Care View
  await page.goto('https://qa_pg.amerck.care/admin/prescription', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Search & select Dilumi
  const searchInput = page.locator('input[placeholder*="Search by name"]').first();
  await searchInput.fill('Dilumi');
  await page.waitForTimeout(1500);
  await page.locator('div, li, tr').filter({ hasText: /Dilumi/i }).last().click();
  await page.waitForTimeout(2000);

  // Scroll to Medications
  const medHeader = page.locator('text=/Generic\\/Brand/i').first();
  await medHeader.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Find plus button
  const plusBtn = page.locator('button[aria-label*="Add taper step" i]').first();
  console.log('Plus button visible:', await plusBtn.isVisible());
  if (await plusBtn.isVisible()) {
    console.log('Clicking Plus button to add sub-row...');
    await plusBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/taper-sub-row-created.png' });
    console.log('Screenshot saved to scratch/taper-sub-row-created.png');

    // Check newly added inputs/rows
    const allInputs = await page.$$eval('input[placeholder*="Dosage" i], input[placeholder*="500mg" i]', els => els.map(e => ({ placeholder: e.placeholder, value: e.value })));
    console.log('Dosage inputs after plus click:', allInputs);
  }

  await browser.close();
})();
