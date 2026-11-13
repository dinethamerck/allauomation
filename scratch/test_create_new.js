const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  await page.goto('https://qa_care.amerck.com/admin/telemedicine-reports', { waitUntil: 'networkidle' });

  await page.locator('button:has-text("Upload Report")').click();
  await page.waitForTimeout(500);

  const dialog = page.locator('div[role="dialog"]');
  const queryInput = dialog.locator('input[name="query"]');

  await queryInput.fill('0771234567');
  await dialog.locator('button:has-text("Search")').click();
  await page.waitForTimeout(1500);

  const createBtn = dialog.locator('button:has-text("Create New Patient")');
  console.log('Clicking Create New Patient...');
  await createBtn.click();
  await page.waitForTimeout(2000);
  console.log('Current URL after clicking Create New Patient:', page.url());

  await browser.close();
})();
