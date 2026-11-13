const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const baseURL = process.env.BASE_URL || 'https://qa_pg.amerck.care';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  console.log('Navigating to baseURL:', baseURL);
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log('Current URL:', page.url());

  // Check all links and menu items
  const links = await page.$$eval('a', els => els.map(a => ({ text: a.innerText.trim(), href: a.href })).filter(x => x.text || x.href));
  console.log('Found Links:', JSON.stringify(links.filter(l => /account|preference|care|drug|preset|setting/i.test(l.text) || /account|preference|care|drug|preset|setting/i.test(l.href)), null, 2));

  // Look for buttons that might open user menu or settings
  const buttons = await page.$$eval('button', els => els.map(b => b.innerText.trim()).filter(Boolean));
  console.log('Found Buttons matching keywords:', buttons.filter(b => /account|preference|profile|setting|menu/i.test(b)));

  // Try finding user avatar or profile button
  const avatar = page.locator('header button, [data-testid*="user"], [data-testid*="avatar"], button:has(svg)').last();
  if (await avatar.isVisible()) {
    console.log('Clicking potential user menu button...');
    await avatar.click();
    await page.waitForTimeout(1000);
    const menuLinks = await page.$$eval('a, [role="menuitem"], button', els => els.map(e => ({ text: e.innerText.trim(), href: e.href || '' })).filter(x => x.text));
    console.log('Menu items after clicking avatar:', menuLinks);
  }

  await page.screenshot({ path: 'scratch/dashboard.png' });
  await browser.close();
})();
