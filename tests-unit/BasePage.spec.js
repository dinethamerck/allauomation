// tests-unit/BasePage.spec.js
const { test, expect } = require('@playwright/test');
const { BasePage } = require('../pages/BasePage');
const { mockApp, doc } = require('./helpers/mockApp');

const LOGIN_FORM = `
  <form id="f" action="/dashboard" method="get">
    <input name="user_name"><input name="password" type="password">
    <button type="submit">Sign In</button>
  </form>`;

/** Temporarily sets credentials in process.env for the duration of fn. */
async function withCreds(user, pass, fn) {
  const saved = { u: process.env.QA_CARE_USERNAME, p: process.env.QA_CARE_PASSWORD };
  const set = (k, v) => { if (v === undefined) delete process.env[k]; else process.env[k] = v; };
  set('QA_CARE_USERNAME', user);
  set('QA_CARE_PASSWORD', pass);
  try {
    return await fn();
  } finally {
    set('QA_CARE_USERNAME', saved.u);
    set('QA_CARE_PASSWORD', saved.p);
  }
}

/** Stubs context.storageState so tests never overwrite the real .auth/user.json. */
function stubStorageState(page) {
  const calls = [];
  page.context().storageState = async (opts) => { calls.push(opts); return {}; };
  return calls;
}

test.describe('BasePage', () => {
  test('BP-01 constructor stores the page reference', async ({ page }) => {
    expect(new BasePage(page).page).toBe(page);
  });

  test('BP-02 navigate() defaults to "/"', async ({ page }) => {
    await mockApp(page, { '/': '<h1>Home</h1>' });
    await new BasePage(page).navigate();
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.locator('h1')).toHaveText('Home');
  });

  test('BP-03 navigate(path) opens the given relative path', async ({ page }) => {
    await mockApp(page, { '/admin/opd': '<h1>OPD</h1>' });
    await new BasePage(page).navigate('/admin/opd');
    expect(new URL(page.url()).pathname).toBe('/admin/opd');
  });

  test('BP-04 waitForReady() resolves once DOM content is loaded', async ({ page }) => {
    await mockApp(page, { '/': '<h1>Ready</h1>' });
    await page.goto('/');
    await expect(new BasePage(page).waitForReady()).resolves.toBeUndefined();
  });

  test('BP-05 getText() returns trimmed text content', async ({ page }) => {
    await page.setContent(doc('<p id="a">   Hello World \n </p>'));
    expect(await new BasePage(page).getText(page.locator('#a'))).toBe('Hello World');
  });

  test('BP-06 getText() returns an empty string for an empty element', async ({ page }) => {
    await page.setContent(doc('<p id="a"></p>'));
    expect(await new BasePage(page).getText(page.locator('#a'))).toBe('');
  });

  test('BP-07 ensureAuthenticated() does nothing when not on the login page', async ({ page }) => {
    await mockApp(page, { '/admin/prescription': '<h1>Care</h1>' });
    await page.goto('/admin/prescription');
    const saved = stubStorageState(page);
    await new BasePage(page).ensureAuthenticated();
    expect(new URL(page.url()).pathname).toBe('/admin/prescription');
    expect(saved).toHaveLength(0);
  });

  test('BP-08 ensureAuthenticated() re-logs in on /login and saves storage state', async ({ page }) => {
    await mockApp(page, { '/login': LOGIN_FORM, '/dashboard': '<h1>Dashboard</h1>' });
    await page.goto('/login');
    const saved = stubStorageState(page);
    await withCreds('qa-user', 'qa-pass', () => new BasePage(page).ensureAuthenticated());
    const url = new URL(page.url());
    expect(url.pathname).toBe('/dashboard');
    expect(url.searchParams.get('user_name')).toBe('qa-user');
    expect(url.searchParams.get('password')).toBe('qa-pass');
    expect(saved).toHaveLength(1);
    expect(saved[0].path).toMatch(/[\\/]\.auth[\\/]user\.json$/);
  });

  test('BP-09 ensureAuthenticated() detects a visible login form on a non-/login URL', async ({ page }) => {
    await mockApp(page, { '/admin/account': LOGIN_FORM, '/dashboard': '<h1>Dashboard</h1>' });
    await page.goto('/admin/account');
    stubStorageState(page);
    await withCreds('u', 'p', () => new BasePage(page).ensureAuthenticated());
    expect(new URL(page.url()).pathname).toBe('/dashboard');
  });

  test('BP-10 ensureAuthenticated() skips login when credentials are missing', async ({ page }) => {
    await mockApp(page, { '/login': LOGIN_FORM });
    await page.goto('/login');
    const saved = stubStorageState(page);
    await withCreds(undefined, undefined, () => new BasePage(page).ensureAuthenticated());
    expect(new URL(page.url()).pathname).toBe('/login');
    await expect(page.locator('input[name="user_name"]')).toHaveValue('');
    expect(saved).toHaveLength(0);
  });

  test('BP-11 ensureAuthenticated() swallows storageState errors', async ({ page }) => {
    await mockApp(page, { '/login': LOGIN_FORM, '/dashboard': '<h1>Dashboard</h1>' });
    await page.goto('/login');
    page.context().storageState = async () => { throw new Error('disk full'); };
    await withCreds('u', 'p', () => new BasePage(page).ensureAuthenticated());
    expect(new URL(page.url()).pathname).toBe('/dashboard');
  });
});
