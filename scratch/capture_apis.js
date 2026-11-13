const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  const apiRequests = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/') || url.includes('/admin/') || url.includes('amerck')) {
      if (!url.endsWith('.js') && !url.endsWith('.css') && !url.endsWith('.png') && !url.endsWith('.svg') && !url.endsWith('.woff2')) {
        apiRequests.push(`${req.method()} ${url}`);
      }
    }
  });

  console.log('Navigating to settings hub...');
  await page.goto('https://qa_care.amerck.com/admin/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Navigating to organizations...');
  await page.goto('https://qa_care.amerck.com/admin/settings/organizations', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Navigating to users...');
  await page.goto('https://qa_care.amerck.com/admin/settings/users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Navigating to roles...');
  await page.goto('https://qa_care.amerck.com/admin/settings/roles', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Navigating to ward-management...');
  await page.goto('https://qa_care.amerck.com/admin/settings/ward-management', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Navigating to consent-form-templates...');
  await page.goto('https://qa_care.amerck.com/admin/settings/consent-form-templates', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Captured API calls:');
  const uniqueApis = Array.from(new Set(apiRequests));
  console.log(JSON.stringify(uniqueApis, null, 2));

  await browser.close();
})();
