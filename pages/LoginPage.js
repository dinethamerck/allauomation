// @ts-check

class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="user_name"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]:has-text("Sign In")');
    this.passwordToggle = page.locator('button:has(svg.lucide-eye-off), button:has(svg.lucide-eye)');
  }

  async goto() {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
  }

  /**
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    await this.usernameInput.waitFor({ state: 'visible' });
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isPasswordMasked() {
    return (await this.passwordInput.getAttribute('type')) === 'password';
  }

  async togglePasswordVisibility() {
    await this.passwordToggle.click();
  }
}

module.exports = { LoginPage };
