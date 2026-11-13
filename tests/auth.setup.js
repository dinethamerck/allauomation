const { test: setup, expect } = require('@playwright/test');
const { LoginPage } = require('../src/pages/LoginPage');
const { env, ROLES, authFile } = require('../src/config/env');
const { ApiClient } = require('../src/api/ApiClient');
const { restorePending } = require('../src/api/configBackup');

setup('restore SMS configuration left by an aborted run', async () => {
  const api = await ApiClient.create('admin');
  const restored = await restorePending(api);
  if (restored) setup.info().annotations.push({ type: 'restored', description: JSON.stringify(restored) });
  await api.dispose();
});

for (const role of ROLES) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWait(env.credentials(role));
    expect(await login.token(), 'JWT stored in localStorage').toBeTruthy();
    await page.context().storageState({ path: authFile(role) });
  });
}
