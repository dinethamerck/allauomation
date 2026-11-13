// @ts-check

/**
 * Page Object Model for AMERCK CARE Dashboard Page
 */
class DashboardPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Common Dashboard locators
    this.header = page.locator('header');
    this.sidebar = page.locator('aside, nav[aria-label*="sidebar"], nav');
    this.userMenu = page.locator('button[aria-haspopup="menu"], [data-testid="user-profile"], header button:has(svg), header .user-avatar');
    this.logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Sign Out")');
  }

  /**
   * Wait for navigation to complete after login
   */
  async waitForDashboardLoad() {
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
  }
}

module.exports = { DashboardPage };
