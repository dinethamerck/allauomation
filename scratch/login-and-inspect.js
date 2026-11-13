const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto('https://qa_pg.amerck.care/login', { waitUntil: 'networkidle' });
  console.log('Login page URL:', page.url());

  await page.locator('input[name="user_name"]').fill(process.env.QA_CARE_USERNAME);
  await page.locator('input[name="password"]').fill(process.env.QA_CARE_PASSWORD);
  await page.locator('button:has-text("Sign In")').click();

  await page.waitForNavigation({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);
  console.log('URL after login:', page.url());

  // Save updated storage state
  await context.storageState({ path: '.auth/user.json' });
  console.log('Saved storage state to .auth/user.json');

  // Find all navigation links in sidebar/header
  const links = await page.$$eval('a', els => els.map(a => ({ text: a.innerText.trim().replace(/\n+/g, ' '), href: a.href })).filter(x => x.text));
  console.log('Logged in links:', JSON.stringify(links, null, 2));

  // Find buttons or menu triggers
  const buttons = await page.$$eval('button', els => els.map(b => b.innerText.trim().replace(/\n+/g, ' ')).filter(Boolean));
  console.log('Logged in buttons:', buttons);

  await page.screenshot({ path: 'scratch/after-login.png' });
  await browser.close();
})();
