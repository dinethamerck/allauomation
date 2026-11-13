// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

test.describe('Amerck Care - Authentication & Access Control Suite', () => {
  // Run these tests without saved authentication state
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-AUTH-001: Valid Login with Provider Credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const username = process.env.QA_CARE_USERNAME || 'Janitha01234';
    const password = process.env.QA_CARE_PASSWORD || 'Janitha6868@';

    await loginPage.login(username, password);

    // Verify successful login redirects away from /login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    expect(page.url()).not.toContain('/login');
  });

  test('TC-AUTH-002: Invalid Password Handling displays error and prevents access', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const username = process.env.QA_CARE_USERNAME || 'Janitha01234';
    await loginPage.usernameInput.fill(username);
    await loginPage.passwordInput.fill('WrongPassword123!');
    await loginPage.submitButton.click();

    // Verify still on login page and error indicator/toast appears or form remains unauthenticated
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('TC-AUTH-003: Password Masking & Visibility Toggle', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.passwordInput.fill('Janitha6868@');

    // Default state: type is password (masked)
    expect(await loginPage.isPasswordMasked()).toBe(true);

    // Click toggle if eye icon button exists
    if (await loginPage.passwordToggle.isVisible()) {
      await loginPage.togglePasswordVisibility();
      expect(await loginPage.passwordInput.getAttribute('type')).toBe('text');

      // Click again to re-mask
      await loginPage.togglePasswordVisibility();
      expect(await loginPage.isPasswordMasked()).toBe(true);
    }
  });

  test('TC-AUTH-004: Direct URL Navigation Without Active Session redirects to login', async ({ page }) => {
    await page.goto('/admin/prescription');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/.*login.*/, { timeout: 15000 });
  });
});
