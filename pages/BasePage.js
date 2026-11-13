// pages/BasePage.js

/**
 * BasePage containing common utilities and reusable Playwright abstractions
 */
class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigate to a relative or absolute URL
   * @param {string} path
   */
  async navigate(path = '/') {
    await this.page.goto(path);
  }

  /**
   * Wait for network idle or DOM load
   */
  async waitForReady() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get element text content trimmed
   * @param {import('@playwright/test').Locator} locator
   */
  async getText(locator) {
    return (await locator.textContent() || '').trim();
  }

  /**
   * Detects if the browser got redirected to /login and performs automated re-login
   */
  async ensureAuthenticated() {
    // Check if the current URL or redirected URL is /login
    const currentUrl = this.page.url();
    const isLoginPage = currentUrl.includes('/login') || (await this.page.locator('input[name="user_name"]').isVisible().catch(() => false));
    if (isLoginPage) {
      console.log(`[BasePage] Detected /login on ${currentUrl}. Performing automated re-login...`);
      const username = process.env.QA_CARE_USERNAME;
      const password = process.env.QA_CARE_PASSWORD;
      if (username && password) {
        const usernameInput = this.page.locator('input[name="user_name"]');
        const passwordInput = this.page.locator('input[name="password"]');
        const submitBtn = this.page.locator('button[type="submit"]');

        await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
        await usernameInput.fill(username);
        await passwordInput.fill(password);
        await submitBtn.click();

        await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
        await this.page.waitForTimeout(1000);

        // Update stored auth state
        try {
          const path = require('path');
          const authPath = path.join(__dirname, '..', '.auth', 'user.json');
          await this.page.context().storageState({ path: authPath });
        } catch (_) {}
      }
    }
  }
}

module.exports = { BasePage };
