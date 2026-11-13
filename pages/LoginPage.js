// pages/LoginPage.js
const { BasePage } = require('./BasePage');

/**
 * Page Object Model for AMERCK CARE Login Page (https://qa_care.amerck.com/login)
 */
class LoginPage extends BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);

    this.usernameInput = page.locator('input[name="user_name"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.signInButton = page.locator('button[type="submit"]', { hasText: 'Sign In' });
    this.errorMessage = page.locator('[data-rht-toaster] [role="status"], .text-destructive, .error-message');
  }

  /**
   * Navigate to the login page
   * @param {string} url
   */
  async goto(url = 'https://qa_care.amerck.com/login') {
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Perform login action
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    await this.usernameInput.waitFor({ state: 'visible' });
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  /**
   * Check if login button is enabled
   */
  async isSignInEnabled() {
    return await this.signInButton.isEnabled();
  }
}

module.exports = { LoginPage };
