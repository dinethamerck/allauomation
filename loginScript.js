const { chromium } = require('playwright');

(async () => {
  // Launch the browser
  const browser = await chromium.launch({ headless: false }); // Set to false to see the browser UI
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to login page...');
  await page.goto('https://qa_care.amerck.com/login');

  console.log('Waiting for login inputs...');
  const usernameInput = page.locator('input[name="username"], input[placeholder*="username" i], input[type="text"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();

  await usernameInput.waitFor({ state: 'visible', timeout: 10000 });

  console.log('Entering credentials...');
  await usernameInput.fill('doc_aesthetic');
  await passwordInput.fill('amk@123');

  console.log('Clicking login...');
  await loginButton.click();

  console.log('Waiting for dashboard to load...');
  await page.waitForLoadState('networkidle');

  // Wait for URL to change away from /login
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
  
  console.log('Successfully logged in! Current URL:', page.url());

  // Keep the browser open for a few seconds to see the dashboard
  await page.waitForTimeout(5000);

  console.log('Closing browser...');
  await browser.close();
})();
