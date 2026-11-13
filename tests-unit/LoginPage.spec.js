// tests-unit/LoginPage.spec.js
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { mockApp } = require('./helpers/mockApp');

const LOGIN_HTML = (disabled = false) => `
  <form id="f" onsubmit="event.preventDefault(); window.__submitted = {u: this.user_name.value, p: this.password.value};">
    <input name="user_name"><input name="password" type="password">
    <button type="submit" ${disabled ? 'disabled' : ''}>Sign In</button>
  </form>`;

test.describe('LoginPage', () => {
  test('LP-01 constructor exposes the login locators', async ({ page }) => {
    const lp = new LoginPage(page);
    expect(lp.page).toBe(page);
    for (const key of ['usernameInput', 'passwordInput', 'signInButton', 'errorMessage']) {
      expect(lp[key]).toBeTruthy();
    }
  });

  test('LP-02 goto() defaults to the QA Care login URL', async ({ page }) => {
    await mockApp(page, { 'https://qa_care.amerck.com/login': LOGIN_HTML() });
    await new LoginPage(page).goto();
    expect(page.url()).toBe('https://qa_care.amerck.com/login');
  });

  test('LP-03 goto(url) opens a custom URL', async ({ page }) => {
    await mockApp(page, { '/login': LOGIN_HTML() });
    const lp = new LoginPage(page);
    await lp.goto('http://emr.test/login');
    await expect(lp.usernameInput).toBeVisible();
  });

  test('LP-04 login() fills both fields and submits the form', async ({ page }) => {
    await mockApp(page, { '/login': LOGIN_HTML() });
    const lp = new LoginPage(page);
    await lp.goto('http://emr.test/login');
    await lp.login('doctor1', 's3cret!');
    expect(await page.evaluate(() => window.__submitted)).toEqual({ u: 'doctor1', p: 's3cret!' });
  });

  test('LP-05 login() waits for a late-rendered username field', async ({ page }) => {
    await mockApp(page, {
      '/login': `<div id="root"></div><script>
        setTimeout(() => { document.getElementById('root').innerHTML = ${JSON.stringify(LOGIN_HTML())}; }, 500);
      </script>`,
    });
    const lp = new LoginPage(page);
    await lp.goto('http://emr.test/login');
    await lp.login('late', 'user');
    expect(await page.evaluate(() => window.__submitted)).toEqual({ u: 'late', p: 'user' });
  });

  test('LP-06 isSignInEnabled() returns true for an enabled button', async ({ page }) => {
    await mockApp(page, { '/login': LOGIN_HTML(false) });
    const lp = new LoginPage(page);
    await lp.goto('http://emr.test/login');
    expect(await lp.isSignInEnabled()).toBe(true);
  });

  test('LP-07 isSignInEnabled() returns false for a disabled button', async ({ page }) => {
    await mockApp(page, { '/login': LOGIN_HTML(true) });
    const lp = new LoginPage(page);
    await lp.goto('http://emr.test/login');
    expect(await lp.isSignInEnabled()).toBe(false);
  });
});
