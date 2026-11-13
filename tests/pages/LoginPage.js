// @ts-check

/**
 * Page Object Model for AMERCK CARE Login Page
 * URL: https://qa_care.amerck.com/login
 */
class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Locators
    this.usernameInput = page.locator('input[name="user_name"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.btnSignIn = page.locator('button[type="submit"]');
    this.togglePasswordBtn = page.locator('form button[type="button"]');
    this.linkSignUp = page.locator('a[href*="signup"]');
    this.linkForgotPassword = page.locator('a[href*="forgotPassword"]');
    this.toaster = page.locator('[data-rht-toaster]');
    this.toastMessage = page.locator('[data-rht-toaster] [role="status"], [data-rht-toaster] div');
  }

  /**
   * Navigate to Login Page
   */
  async goto() {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for the form inputs to become interactive
    await this.usernameInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Perform login action
   * @param {string} [username]
   * @param {string} [password]
   */
  async login(username = process.env.QA_USERNAME || 'parami', password = process.env.QA_PASSWORD || 'parami') {
    if (username !== undefined && username !== '') {
      await this.usernameInput.fill(username);
    }
    if (password !== undefined && password !== '') {
      await this.passwordInput.fill(password);
    }
    await this.btnSignIn.click();
  }

  /**
   * Toggle password visibility eye icon
   */
  async togglePasswordVisibility() {
    await this.togglePasswordBtn.click();
  }
}

module.exports = { LoginPage };
