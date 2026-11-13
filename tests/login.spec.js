// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { DashboardPage } = require('./pages/DashboardPage');

test.describe('AMERCK CARE — Authentication & Login Test Suite (https://qa_care.amerck.com)', () => {
  /** @type {LoginPage} */
  let loginPage;
  /** @type {DashboardPage} */
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.goto();
  });

  // =========================================================================
  // 1. Positive Authentication Scenarios
  // =========================================================================
  test.describe('1. Positive Authentication Scenarios', () => {

    test('TC-01: Should successfully log in with valid credentials (parami / parami)', async ({ page }) => {
      // Step 1: Enter valid credentials
      await loginPage.login('parami', 'parami');

      // Step 2: Verify post-login redirection away from login page
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });
      
      // Step 3: Assert user is on an authenticated page / dashboard
      expect(page.url()).not.toContain('/login');
    });

    test('TC-02: Should handle username with leading/trailing whitespace gracefully', async ({ page }) => {
      // Step 1: Enter credentials with extra whitespace around username
      await loginPage.login('  parami  ', 'parami');

      // Step 2: Verify successful submission and redirection
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });
      expect(page.url()).not.toContain('/login');
    });
  });

  // =========================================================================
  // 2. Negative Authentication Scenarios
  // =========================================================================
  test.describe('2. Negative Authentication Scenarios', () => {

    test('TC-03: Should reject login with invalid password', async ({ page }) => {
      // Step 1: Enter valid user but wrong password
      await loginPage.login('parami', 'WrongPassword123!');

      // Step 2: Wait for response / notification / remain on login page
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/login');
    });

    test('TC-04: Should reject login with non-existent username', async ({ page }) => {
      // Step 1: Enter invalid username
      await loginPage.login('invalid_qa_user_999', 'parami');

      // Step 2: Remain on login page
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/login');
    });

    test('TC-05: Should reject login when both username and password are invalid', async ({ page }) => {
      // Step 1: Enter completely invalid credentials
      await loginPage.login('fakeuser', 'fakepassword');

      // Step 2: Remain on login page
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/login');
    });
  });

  // =========================================================================
  // 3. Form Validation & Field Boundary Scenarios
  // =========================================================================
  test.describe('3. Form Validation Scenarios', () => {

    test('TC-06: Should prevent submission when both username and password are empty', async ({ page }) => {
      // Step 1: Click Sign In without filling inputs
      await loginPage.btnSignIn.click();

      // Step 2: User must remain on login page
      expect(page.url()).toContain('/login');
    });

    test('TC-07: Should prevent submission when password field is empty', async ({ page }) => {
      // Step 1: Fill only username
      await loginPage.usernameInput.fill('parami');
      await loginPage.btnSignIn.click();

      // Step 2: User must remain on login page
      expect(page.url()).toContain('/login');
    });

    test('TC-08: Should prevent submission when username field is empty', async ({ page }) => {
      // Step 1: Fill only password
      await loginPage.passwordInput.fill('parami');
      await loginPage.btnSignIn.click();

      // Step 2: User must remain on login page
      expect(page.url()).toContain('/login');
    });
  });

  // =========================================================================
  // 4. UI Controls & Password Toggle Scenarios
  // =========================================================================
  test.describe('4. UI Controls & Password Visibility', () => {

    test('TC-09: Should toggle password visibility between masked and plain text', async () => {
      // Step 1: Verify initial state is password type
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
      await loginPage.passwordInput.fill('parami');

      // Step 2: Click toggle button to reveal password
      await loginPage.togglePasswordVisibility();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

      // Step 3: Click toggle button again to mask password
      await loginPage.togglePasswordVisibility();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });

    test('TC-10: Should render all essential login page elements and placeholders correctly', async ({ page }) => {
      // Verify Title
      await expect(page).toHaveTitle(/Amerck Care/i);

      // Verify Inputs are visible
      await expect(loginPage.usernameInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.btnSignIn).toBeVisible();

      // Verify Placeholders
      await expect(loginPage.usernameInput).toHaveAttribute('placeholder', 'Required');
      await expect(loginPage.passwordInput).toHaveAttribute('placeholder', 'Required');

      // Verify Links are present
      await expect(loginPage.linkSignUp).toBeVisible();
      await expect(loginPage.linkForgotPassword).toBeVisible();
    });
  });

  // =========================================================================
  // 5. Navigation Links & External Modals
  // =========================================================================
  test.describe('5. Navigation Links Verification', () => {

    test('TC-11: Should navigate to Sign Up page when clicking Sign Up link', async ({ page }) => {
      await loginPage.linkSignUp.click();
      await page.waitForURL((url) => url.pathname.includes('/signup'), { timeout: 15000 });
      expect(page.url()).toContain('/signup');
    });

    test('TC-12: Should navigate to Forgot Password page when clicking Forgot password link', async ({ page }) => {
      await loginPage.linkForgotPassword.click();
      await page.waitForURL((url) => url.pathname.includes('forgotPassword') || url.pathname.includes('initForgetPasswordLink'), { timeout: 15000 });
      expect(page.url()).toContain('forgotPassword');
    });
  });

  // =========================================================================
  // 6. Keyboard Accessibility & Submission
  // =========================================================================
  test.describe('6. Keyboard Accessibility', () => {

    test('TC-13: Should allow submitting the login form using Enter key', async ({ page }) => {
      // Step 1: Fill username
      await loginPage.usernameInput.fill('parami');

      // Step 2: Fill password and press Enter
      await loginPage.passwordInput.fill('parami');
      await loginPage.passwordInput.press('Enter');

      // Step 3: Verify successful login redirection
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });
      expect(page.url()).not.toContain('/login');
    });
  });
});
