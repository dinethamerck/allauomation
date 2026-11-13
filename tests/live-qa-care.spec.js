// tests/live-qa-care.spec.js
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

test.describe('Live QA Environment: AMERCK CARE Login Flow', () => {
  // Use unauthenticated context for login testing
  test.use({ storageState: { cookies: [], origins: [] } });

  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto('https://qa_care.amerck.com/login');
  });

  test('TC-LIVE-01: Verify Login Page Structure on qa_care.amerck.com', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Amerck Care/i);

    // Verify username and password inputs exist
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();

    // Verify placeholders and attributes
    await expect(loginPage.usernameInput).toHaveAttribute('name', 'user_name');
    await expect(loginPage.passwordInput).toHaveAttribute('name', 'password');
  });

  test('TC-LIVE-02: Authenticate and Navigate to Post-Login Dashboard', async ({ page }) => {
    const username = process.env.QA_CARE_USERNAME;
    const password = process.env.QA_CARE_PASSWORD;

    test.skip(!username || !password, 'Skipping live login test: Set QA_CARE_USERNAME and QA_CARE_PASSWORD in .env');

    // Fill credentials securely from process.env and click Sign In
    await loginPage.login(username, password);

    // Wait for successful redirection away from login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
    expect(page.url()).toContain('/admin');

    // Save refreshed authentication state for subsequent test suites
    await page.context().storageState({ path: '.auth/user.json' });
  });
});
