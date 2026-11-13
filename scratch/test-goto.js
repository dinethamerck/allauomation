const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();
  await page.goto('https://qa_care.amerck.com/admin/admissions', { waitUntil: 'networkidle' });
  console.log('Admissions page loaded');
  await page.waitForTimeout(2000);

  const draftBtn = page.locator('text=Draft').first();
  console.log('Draft button visible:', await draftBtn.isVisible());
  if (await draftBtn.isVisible()) {
    console.log('Clicking Draft button...');
    await draftBtn.click();
    await page.waitForTimeout(3000);
    console.log('URL after clicking Draft:', page.url());
    await page.screenshot({ path: 'scratch/after-draft-click.png' });
    const buttons = await page.locator('button').allInnerTexts();
    console.log('Buttons on page after clicking Draft:', buttons);
  }

  await browser.close();
})();
