// scripts/inspect_authenticated_session.js
require('dotenv').config();
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto('https://qa_care.amerck.com/login', { waitUntil: 'networkidle' });

  // Login securely using process.env
  await page.fill('input[name="user_name"]', process.env.QA_CARE_USERNAME || '');
  await page.fill('input[name="password"]', process.env.QA_CARE_PASSWORD || '');
  await page.click('button[type="submit"]');

  console.log('Waiting for redirection...');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  console.log('Post-login URL:', page.url());

  console.log('Waiting for profile loading to finish...');
  await page.waitForSelector('text=Loading your profile...', { state: 'detached', timeout: 30000 }).catch(() => console.log('Spinner did not detach or timeout'));
  await page.waitForTimeout(3000);
  console.log('Current URL after profile loaded:', page.url());

  // Save updated storage state
  const authStatePath = path.join(__dirname, '..', '.auth', 'user.json');
  await page.context().storageState({ path: authStatePath });
  console.log('Saved authenticated state to:', authStatePath);

  // Take post-login screenshot
  await page.screenshot({ path: path.join(__dirname, '..', 'post_login.png'), fullPage: true });

  // Check navigation links
  const links = await page.$$eval('a[href], button', (elements) =>
    elements
      .map(el => ({ text: el.innerText.trim(), href: el.getAttribute('href'), id: el.id, title: el.getAttribute('title') }))
      .filter(item => item.text || item.title)
      .slice(0, 30)
  );
  console.log('Navigation items found:', JSON.stringify(links, null, 2));

  await browser.close();
})();
