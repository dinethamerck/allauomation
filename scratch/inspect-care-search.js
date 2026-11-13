const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  await page.goto('https://qa_pg.amerck.care/admin/prescription', { waitUntil: 'networkidle' });
  const searchInput = page.locator('input[placeholder*="Search by name, NIC or mobile number"]').first();
  await searchInput.fill('0764981884');
  await page.waitForTimeout(2000);

  // Take screenshot of search results popover
  await page.screenshot({ path: 'scratch/care-patient-search.png' });

  // Get all options in the popup
  const options = await page.$$eval('[role="option"], [role="listbox"] *, [data-radix-popper-content-wrapper] *', els => els.map(e => ({
    tag: e.tagName,
    text: e.innerText?.trim()?.replace(/\n+/g, ' '),
    role: e.getAttribute('role'),
    className: e.className
  })).filter(x => x.text));
  console.log('Care search popup options:', options.slice(0, 10));

  // Click the option
  const option = page.locator('[role="option"], [data-radix-collection-item]').first();
  if (await option.isVisible()) {
    console.log('Clicking option...');
    await option.click();
    await page.waitForTimeout(2000);
    console.log('Patient card visible:', await page.locator('text=/Dilumi Abeysekara/i').isVisible());
  }

  await browser.close();
})();
