require('dotenv').config();
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function refreshAuth() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const baseUrl = (process.env.BASE_URL || 'https://qa_pg.amerck.care').replace(/\/+$/, '');

  console.log(`Navigating to ${baseUrl}/login...`);
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });

  const username = process.env.QA_CARE_USERNAME;
  const password = process.env.QA_CARE_PASSWORD;

  if (!username || !password) {
    throw new Error('QA_CARE_USERNAME or QA_CARE_PASSWORD is not defined in .env');
  }

  await page.locator('input[name="user_name"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[name="user_name"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  console.log('Waiting for post-login redirection...');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  console.log('Redirected to:', page.url());

  // Wait for loading to finish if any
  await page.waitForTimeout(2000);

  const authDir = path.join(__dirname, '..', '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  const authFile = path.join(authDir, 'user.json');
  await page.context().storageState({ path: authFile });
  console.log(`Saved storageState to ${authFile}`);

  await browser.close();
}

if (require.main === module) {
  refreshAuth().catch((err) => {
    console.error('Failed to authenticate:', err);
    process.exit(1);
  });
}

module.exports = { refreshAuth };
