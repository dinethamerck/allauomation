/**
 * LoginPage.js - Page Object Model for Login
 * URL: https://qa_care.amerck.com/login
 */
class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Locators - adjust selectors based on actual DOM if needed
    this.usernameInput = page.locator('input[name="username"], input[placeholder*="username" i], input[type="text"]').first();
    this.passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    this.loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    this.errorMessage = page.locator('.error, .alert-danger, [class*="error"], [class*="invalid"]').first();
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Perform login with given credentials
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    await this.usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    // Wait for navigation after login
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify login was successful (dashboard is visible)
   */
  async verifyLoginSuccess() {
    // After login, user should NOT be on /login anymore
    await this.page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
  }
}

module.exports = { LoginPage };
