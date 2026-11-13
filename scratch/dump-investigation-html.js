// scratch/dump-investigation-html.js
const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: '.auth/user.json',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  await page.goto('https://qa_care.amerck.com/admin/admissions', { waitUntil: 'networkidle' });
  const draftBtn = page.locator('text=Draft').first();
  await draftBtn.click();
  await page.waitForTimeout(2000);

  const invTab = page.getByRole('button', { name: /2\.\s*Investigation|Investigation/i }).first();
  await invTab.click();
  await page.waitForTimeout(2000);

  const content = await page.locator('main, [role="main"], form, .flex-1').first().innerHTML();
  fs.writeFileSync('scratch/investigation-dom.html', content);
  console.log('Saved scratch/investigation-dom.html, size:', content.length);

  await browser.close();
})();
