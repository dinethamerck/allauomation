const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  await page.goto('https://qa_care.amerck.com/admin/telemedicine-reports/patients/332977', { waitUntil: 'networkidle' });

  const addReportBtn = page.locator('button:has-text("Add Report")');
  console.log('Add Report button visible:', await addReportBtn.isVisible());
  await addReportBtn.click();
  await page.waitForTimeout(1000);

  const dialog = page.locator('div[role="dialog"]');
  console.log('Dialog visible after Add Report?', await dialog.isVisible());
  if (await dialog.isVisible()) {
    console.log('Dialog text:');
    console.log(await dialog.innerText());

    const elements = await dialog.locator('input, button, select, textarea').evaluateAll(els =>
      els.map(el => ({ tag: el.tagName, type: el.type, name: el.name, placeholder: el.placeholder, text: el.innerText.trim() }))
    );
    console.log('Dialog controls:', JSON.stringify(elements, null, 2));
  }

  await browser.close();
})();
