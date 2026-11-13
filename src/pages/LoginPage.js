class LoginPage {
  constructor(page) {
    this.page = page;
    this.username = page.locator('input[name="user_name"]');
    this.password = page.locator('input[name="password"]');
    this.signIn = page.getByRole('button', { name: 'Sign In' });
  }

  async goto() {
    await this.page.goto('/login');
    await this.username.waitFor();
  }

  async login({ username, password }) {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.signIn.click();
  }

  async loginAndWait(credentials) {
    await this.login(credentials);
    await this.page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 60_000 });
  }

  token() {
    return this.page.evaluate(() => localStorage.getItem('token'));
  }
}

module.exports = { LoginPage };
