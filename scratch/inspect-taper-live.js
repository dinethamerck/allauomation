const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  // 1. Inspect Care View with a patient selected
  console.log('Navigating to Care View (/admin/prescription)...');
  await page.goto('https://qa_pg.amerck.care/admin/prescription', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Search a patient (e.g. Dilumi or 0764981884)
  const searchInput = page.locator('input[placeholder*="Search by name, NIC or mobile number"]').first();
  if (await searchInput.isVisible()) {
    console.log('Searching patient...');
    await searchInput.fill('Dilumi');
    await page.waitForTimeout(2000);
    const resultItem = page.locator('div, li, tr').filter({ hasText: /Dilumi/i }).last();
    if (await resultItem.isVisible()) {
      console.log('Clicking patient result...');
      await resultItem.click();
      await page.waitForTimeout(3000);
    }
  }

  await page.screenshot({ path: 'scratch/care-view-patient-selected.png' });

  // Inspect medication section in Care View
  const medSection = page.locator('text=/add medications|Medications|Prescription/i').first();
  console.log('Medication section text found');
  
  // Find all buttons, tables, inputs
  const careTexts = await page.locator('body').innerText();
  console.log('Care view texts containing taper or medication:', careTexts.split('\n').filter(t => /taper|dosage|duration|frequency|medication/i.test(t)));

  // 2. Check Drug Cabinet Presets
  console.log('Navigating to /admin/drugs/presets...');
  await page.goto('https://qa_pg.amerck.care/admin/drugs/presets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('Presets URL:', page.url());
  await page.screenshot({ path: 'scratch/presets-page.png' });

  const presetTexts = await page.locator('body').innerText();
  console.log('Preset page texts:', presetTexts.split('\n').filter(Boolean).slice(0, 20));

  await browser.close();
})();
