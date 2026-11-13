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

  // Scroll to Medications section
  const medHeader = page.locator('text=/Generic\\/Brand/i').first();
  await medHeader.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/medications-section.png' });

  // Check table headers and rows
  const headers = await page.$$eval('table th, [role="columnheader"]', els => els.map(e => e.innerText.trim()).filter(Boolean));
  console.log('Medication table headers:', headers);

  // Check Plus button
  const plusButtons = await page.$$eval('button', els => els.map(b => ({ text: b.innerText.trim(), class: b.className, label: b.getAttribute('aria-label') })).filter(b => b.text === '+' || /taper/i.test(b.label || '')));
  console.log('Plus / taper buttons found:', plusButtons);

  await browser.close();
})();
