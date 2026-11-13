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
  await page.waitForTimeout(500);

  const dialog = page.locator('div[role="dialog"]');
  const queryInput = dialog.locator('input[name="query"]');

  await queryInput.fill('0771234567');
  await dialog.locator('button:has-text("Search")').click();
  await page.waitForTimeout(1500);

  // Click "Create New Patient" to see what URL or page it opens
  const createNewBtn = dialog.locator('a:has-text("Create New Patient"), button:has-text("Create New Patient")');
  console.log('Create New Patient href:', await createNewBtn.getAttribute('href').catch(() => 'no href'));

  // Also check "Add" button
  const addBtn = dialog.locator('button:has-text("Add")').first();
  console.log('Add button visible:', await addBtn.isVisible());

  await browser.close();
})();
