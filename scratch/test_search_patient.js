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

  // Open Upload Report dialog
  await page.locator('button:has-text("Upload Report")').click();
  await page.waitForTimeout(1000);

  const dialog = page.locator('div[role="dialog"]');
  const queryInput = dialog.locator('input[name="query"]');

  // Test with a 10-digit mobile number: 0771234567
  console.log('--- Testing Mobile Search ---');
  await queryInput.fill('0771234567');
  await dialog.locator('button:has-text("Search")').click();
  await page.waitForTimeout(2000);
  console.log('Dialog text after mobile search:');
  console.log(await dialog.innerText());

  // Check if there are patient cards or "Create New Patient" button
  const buttonsAfterSearch = await dialog.locator('button, a').allInnerTexts();
  console.log('Buttons/links after search:', buttonsAfterSearch);

  await browser.close();
})();
