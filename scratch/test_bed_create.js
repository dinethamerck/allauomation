const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  console.log('Testing Bed Creation Flow...');
  await page.goto('https://qa_care.amerck.com/admin/settings/ward-management', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Check form submission with empty Bed Number
  await page.locator('button:has-text("Add Bed")').click();
  await page.waitForTimeout(1000);
  const bedModal = page.locator('div[role="dialog"]');
  console.log('Bed modal visible:', await bedModal.isVisible());
  
  // Click Create Bed while empty
  await bedModal.locator('button:has-text("Create Bed")').click();
  await page.waitForTimeout(1000);
  console.log('Still open after empty submit?', await bedModal.isVisible());

  // Fill bed number and check response
  const testBedNum = 'TEST-B-' + Date.now().toString().slice(-4);
  console.log('Filling bed number:', testBedNum);
  const bedInput = bedModal.locator('input').first();
  await bedInput.fill(testBedNum);

  let bedCreated = false;
  page.on('response', res => {
    if (res.url().includes('/beds') && res.request().method() === 'POST') {
      console.log('POST /beds response status:', res.status());
      bedCreated = true;
    }
  });

  await bedModal.locator('button:has-text("Create Bed")').click();
  await page.waitForTimeout(3000);
  console.log('Bed created response triggered?', bedCreated);
  console.log('Modal closed after creation?', !(await bedModal.isVisible()));

  // Search for the newly created bed
  const searchInput = page.locator('input[placeholder*="Search beds by number"]').first();
  await searchInput.fill(testBedNum);
  await page.waitForTimeout(2000);
  const rows = await page.locator('table tbody tr').allInnerTexts();
  console.log('Filtered rows for new bed:', rows);

  await browser.close();
})();
