// scratch/inspect-copy-dialog.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: '.auth/user.json',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  await page.goto('https://qa_care.amerck.com/admin/admission-investigations', { waitUntil: 'networkidle' });
  const fbcRow = page.locator('tr').filter({ hasText: 'FBC' }).first();
  const copyBtn = fbcRow.locator('button').nth(1);
  await copyBtn.click();
  await page.waitForTimeout(1000);

  const dialogText = await page.locator('[role="dialog"]').innerText().catch(() => 'no dialog');
  console.log('Dialog Text:', dialogText);

  await browser.close();
})();
