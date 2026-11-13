const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

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

  // Click Plus
  const plusBtn = page.locator('button[aria-label*="Add taper step" i]').first();
  await plusBtn.click();
  await page.waitForTimeout(1000);

  // Scroll medications section into center of view
  await medHeader.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch/taper-sub-row-centered.png' });

  // Get details of all inputs and buttons in the medication table area
  const medInputs = await page.$$eval('input', els => els.map(e => ({
    name: e.name,
    placeholder: e.placeholder,
    value: e.value,
    ariaLabel: e.getAttribute('aria-label')
  })).filter(x => /dosage|frequency|route|duration|generic|500mg|BID|PO|5 d/i.test(JSON.stringify(x))));
  console.log('Medication inputs:', medInputs);

  const buttons = await page.$$eval('button', els => els.map(b => ({
    text: b.innerText.trim(),
    ariaLabel: b.getAttribute('aria-label'),
    className: b.className
  })).filter(x => x.ariaLabel || x.text === '+'));
  console.log('Taper/action buttons in table:', buttons);

  await browser.close();
})();
