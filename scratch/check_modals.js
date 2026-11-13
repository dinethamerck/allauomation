const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  // 1. Check Profile menu
  console.log('Navigating to /admin/settings...');
  await page.goto('https://qa_care.amerck.com/admin/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const jrBtn = page.locator('button:has-text("JR")');
  if (await jrBtn.isVisible()) {
    await jrBtn.click();
    await page.waitForTimeout(1000);
    const menuTexts = await page.evaluate(() => {
      const el = document.querySelector('[role="menu"]');
      return el ? el.innerText : 'no menu';
    });
    console.log('Profile Menu content:\n', menuTexts);
    await page.keyboard.press('Escape');
  }

  // 2. Check Add Role modal/page
  console.log('\nNavigating to /admin/settings/roles...');
  await page.goto('https://qa_care.amerck.com/admin/settings/roles', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const addRoleBtn = page.locator('button:has-text("Add Role")');
  if (await addRoleBtn.isVisible()) {
    await addRoleBtn.click();
    await page.waitForTimeout(1500);
    const modalContent = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') || document.querySelector('form');
      return dialog ? dialog.innerText : 'no dialog found (current url: ' + window.location.href + ')';
    });
    console.log('Add Role form/modal:\n', modalContent);
    await page.keyboard.press('Escape');
  }

  // 3. Check Add Bed modal/page
  console.log('\nNavigating to /admin/settings/ward-management...');
  await page.goto('https://qa_care.amerck.com/admin/settings/ward-management', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const addBedBtn = page.locator('button:has-text("Add Bed")');
  if (await addBedBtn.isVisible()) {
    await addBedBtn.click();
    await page.waitForTimeout(1500);
    const bedDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') || document.querySelector('form');
      return dialog ? dialog.innerText : 'no dialog found (current url: ' + window.location.href + ')';
    });
    console.log('Add Bed form/modal:\n', bedDialog);
    await page.keyboard.press('Escape');
  }

  // 4. Check Add Template modal/page
  console.log('\nNavigating to /admin/settings/consent-form-templates...');
  await page.goto('https://qa_care.amerck.com/admin/settings/consent-form-templates', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const addTmplBtn = page.locator('button:has-text("Add Template")');
  if (await addTmplBtn.isVisible()) {
    await addTmplBtn.click();
    await page.waitForTimeout(1500);
    console.log('After clicking Add Template URL:', page.url());
    const tmplDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') || document.querySelector('form');
      return dialog ? dialog.innerText : 'no dialog found';
    });
    console.log('Add Template form/modal:\n', tmplDialog);
  }

  await browser.close();
})();
