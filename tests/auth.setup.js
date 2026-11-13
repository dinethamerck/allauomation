// @ts-check
const { test: setup, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const path = require('path');
const fs = require('fs');

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate using protected credentials', async ({ page }) => {
  const username = process.env.QA_CARE_USERNAME;
  const password = process.env.QA_CARE_PASSWORD;

  if (!username || !password) {
    throw new Error('QA_CARE_USERNAME or QA_CARE_PASSWORD is not set in .env');
  }

  // Ensure auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Verify inputs are ready
  await expect(loginPage.usernameInput).toBeVisible();
  await expect(loginPage.passwordInput).toBeVisible();

  // Perform login
  await loginPage.login(username, password);

  // Assert user is authenticated by verifying redirection away from login or presence of admin tokens
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });

  // Save signed-in state
  const state = await page.context().storageState();
  const tokenEntry = state.origins.flatMap(o => o.localStorage || []).find(i => i.name === 'token');
  if (tokenEntry) {
    const targetOrigins = ['https://qa_care.amerck.com', 'https://qa_pg.amerck.care'];
    for (const org of targetOrigins) {
      if (!state.origins.some(o => o.origin === org)) {
        state.origins.push({
          origin: org,
          localStorage: [{ name: 'token', value: tokenEntry.value }]
        });
      }
    }
  }
  fs.writeFileSync(authFile, JSON.stringify(state, null, 2));
});
