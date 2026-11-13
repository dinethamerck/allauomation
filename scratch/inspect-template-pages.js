// scratch/inspect-template-pages.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: '.auth/user.json',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Try direct navigation or find links in menu
  console.log('Navigating to dashboard...');
  await page.goto('https://qa_care.amerck.com/admin/dashboard', { waitUntil: 'networkidle' });

  // Check possible URLs
  const candidateUrls = [
    '/admin/admission-investigations',
    '/admin/investigation-templates',
    '/admin/investigations/templates',
    '/admin/report-templates',
    '/admin/investigations'
  ];

  for (const url of candidateUrls) {
    try {
      await page.goto(`https://qa_care.amerck.com${url}`, { waitUntil: 'networkidle', timeout: 10000 });
      console.log(`Visited ${url} -> Current URL: ${page.url()}, Status: OK, Title: ${await page.title()}`);
      const h1 = await page.locator('h1, h2, h3').allInnerTexts().catch(() => []);
      console.log(`   Headers at ${url}:`, h1.slice(0, 5));
    } catch (e) {
      console.log(`Visited ${url} -> Error: ${e.message}`);
    }
  }

  await browser.close();
})();
