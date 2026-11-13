const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('https://qa_care.amerck.com/admin/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const visibleLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute('href'),
      visible: a.offsetParent !== null
    }));
  });

  console.log('Visible links on 375x667:');
  console.log(JSON.stringify(visibleLinks.filter(l => l.href && l.href.includes('/settings')), null, 2));

  await browser.close();
})();
