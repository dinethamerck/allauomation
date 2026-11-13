const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  page.on('response', async res => {
    if (res.url().includes('api') || res.url().includes('telemed') || res.url().includes('patient')) {
      console.log('RESPONSE:', res.status(), res.url());
      try {
        const text = await res.text();
        console.log('DATA:', text.substring(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://qa_care.amerck.com/admin/telemedicine-reports', { waitUntil: 'networkidle' });

  await page.locator('button:has-text("Upload Report")').click();
  await page.waitForTimeout(500);

  const dialog = page.locator('div[role="dialog"]');
  const queryInput = dialog.locator('input[name="query"]');

  await queryInput.fill('0771234567');
  await dialog.locator('button:has-text("Search")').click();
  await page.waitForTimeout(1500);

  // Check the first patient item in the dialog
  const firstPatientCard = dialog.locator('div:has-text("Dineth Sowmina")').first();
  console.log('First patient card HTML:', await firstPatientCard.innerHTML().catch(() => 'none'));

  await browser.close();
})();
