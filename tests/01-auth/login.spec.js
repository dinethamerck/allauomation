const { test, expect } = require('../../src/fixtures');
const { LoginPage } = require('../../src/pages/LoginPage');
const { ApiClient } = require('../../src/api/ApiClient');
const { env } = require('../../src/config/env');

test.describe('Login & access control @smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('AUTH-01 admin can sign in and reach Configuration', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWait(env.credentials('admin'));
    await page.goto('/admin/settings/configuration');
    await expect(page.getByText('SMS Settings')).toBeVisible();
  });

  test('AUTH-02 doctor can sign in and sees Refraction Room, Optical Shop and Cashier', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWait(env.credentials('doctor'));
    for (const href of ['/admin/optical-consultations', '/admin/optical-lab', '/admin/optical-cashier']) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeAttached();
    }
  });

  test('AUTH-03 @negative wrong password is rejected and no token is stored', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login({ username: env.credentials('admin').username, password: 'Wrong-Password-123' });
    await page.waitForTimeout(3_000);
    await expect(page).toHaveURL(/\/login/);
    expect(await login.token()).toBeFalsy();
  });

  test('AUTH-04 @negative unknown user is rejected by the API', async () => {
    const { token } = await ApiClient.login({ username: `no_such_user_${Date.now()}`, password: 'x' });
    expect(token).toBeFalsy();
  });

  test('AUTH-05 @negative empty credentials do not submit', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn.click();
    await page.waitForTimeout(2_000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-06 @negative unauthenticated visit to SMS log redirects to login', async ({ page }) => {
    await page.goto('/admin/settings/sms-log');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });
});

test.describe('API authorisation @negative', () => {
  test('AUTH-07 SMS log API rejects requests without a token', async ({ playwright }) => {
    const anon = await playwright.request.newContext({ baseURL: env.apiUrl });
    const res = await anon.get('/sms/logs?page=1&status=all');
    expect([401, 403]).toContain(res.status());
    await anon.dispose();
  });

  test('AUTH-08 configuration API rejects updates without a token', async ({ playwright }) => {
    const anon = await playwright.request.newContext({ baseURL: env.apiUrl });
    const res = await anon.post('/settings/configuration', { data: { optical_reminder_sms_enabled: false } });
    expect([401, 403]).toContain(res.status());
    await anon.dispose();
  });
});
