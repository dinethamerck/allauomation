const { test, expect } = require('../../src/fixtures');
const { ConfigurationPage } = require('../../src/pages/ConfigurationPage');
const { SMS_SETTINGS, NEXT_VISIT_POPUP } = require('../../src/constants');
const { authFile } = require('../../src/config/env');

test.use({ storageState: authFile('admin') });

test.describe('Settings > Configuration (SMS) @config', () => {
  let config;

  test.beforeEach(async ({ page }) => {
    config = new ConfigurationPage(page);
    await config.goto();
  });

  test('CFG-01 @smoke shows every SMS setting and the Next Visit popup toggle', async ({ page }) => {
    await expect(page.getByText('Next Visit Recommendation', { exact: true })).toBeVisible();
    await expect(page.getByText('SMS Settings', { exact: true })).toBeVisible();
    await expect(config.label(NEXT_VISIT_POPUP.label)).toBeVisible();
    for (const setting of Object.values(SMS_SETTINGS)) {
      await expect(config.label(setting.label), setting.label).toBeVisible();
      await expect(config.switchFor(setting.label)).toBeVisible();
      await expect(config.textFor(setting.label)).toBeVisible();
    }
  });

  test('CFG-02 @smoke UI reflects the stored configuration', async ({ adminApi }) => {
    const stored = await adminApi.getConfiguration();
    for (const setting of Object.values(SMS_SETTINGS)) {
      await expect(config.textFor(setting.label), setting.label).toHaveValue(stored[setting.textKey]);
      expect(await config.isOn(setting.label), `${setting.label} toggle`).toBe(stored[setting.enabledKey]);
    }
    expect(await config.isOn(NEXT_VISIT_POPUP.label)).toBe(stored[NEXT_VISIT_POPUP.enabledKey]);
  });

  for (const [name, setting] of Object.entries(SMS_SETTINGS)) {
    test(`CFG-03 toggling "${name}" SMS persists after reload`, async ({ page, smsConfig }) => {
      const initial = smsConfig.original[setting.enabledKey];
      await smsConfig.set({ [setting.enabledKey]: initial }); // registers the key for restore

      const body = await config.setToggle(setting.label, setting.enabledKey, !initial);
      expect(body).toEqual({ [setting.enabledKey]: !initial });

      await config.reload();
      expect(await config.isOn(setting.label)).toBe(!initial);
      expect((await smsConfig.get())[setting.enabledKey]).toBe(!initial);
    });
  }

  test('CFG-04 toggling the Next Visit Recommendation popup persists', async ({ page, smsConfig }) => {
    const initial = smsConfig.original[NEXT_VISIT_POPUP.enabledKey];
    await smsConfig.set({ [NEXT_VISIT_POPUP.enabledKey]: initial });
    await config.setToggle(NEXT_VISIT_POPUP.label, NEXT_VISIT_POPUP.enabledKey, !initial);
    await config.reload();
    expect(await config.isOn(NEXT_VISIT_POPUP.label)).toBe(!initial);
  });

  for (const [name, setting] of Object.entries(SMS_SETTINGS)) {
    test(`CFG-05 editing "${name}" SMS text is saved on blur`, async ({ page, smsConfig }) => {
      await smsConfig.set({ [setting.textKey]: smsConfig.original[setting.textKey] });
      const text = `Automation ${name} text ${Date.now()}`;

      const body = await config.setText(setting.label, setting.textKey, text);
      expect(body).toEqual({ [setting.textKey]: text });

      await config.reload();
      await expect(config.textFor(setting.label)).toHaveValue(text);
      expect((await smsConfig.get())[setting.textKey]).toBe(text);
    });
  }

  test('CFG-06 Unicode (Sinhala / Tamil) reminder text is stored unchanged', async ({ page, smsConfig }) => {
    const { label, textKey } = SMS_SETTINGS.reminder;
    await smsConfig.set({ [textKey]: smsConfig.original[textKey] });
    const text = 'ඔබගේ ඊළඟ ඇස් පරීක්ෂණය - உங்கள் அடுத்த கண் பரிசோதனை';
    await config.setText(label, textKey, text);
    await config.reload();
    await expect(config.textFor(label)).toHaveValue(text);
  });

  test('CFG-07 @negative an enabled SMS should not be saved with empty text', async ({ page, smsConfig }) => {
    const { label, textKey, enabledKey } = SMS_SETTINGS.reminder;
    await smsConfig.set({ [enabledKey]: true, [textKey]: smsConfig.original[textKey] });
    await config.reload();

    await config.textFor(label).fill('');
    await config.textFor(label).blur();
    await page.waitForTimeout(2_000);

    // Expected: validation blocks it, or the stored text is left intact.
    expect((await smsConfig.get())[textKey], 'reminder text must not become empty while the SMS is enabled').not.toBe('');
  });

  test('CFG-08 @negative doctor account cannot change SMS configuration through the API', async ({ doctorApi, smsConfig }) => {
    const { enabledKey } = SMS_SETTINGS.welcome;
    await smsConfig.set({ [enabledKey]: smsConfig.original[enabledKey] });
    const res = await doctorApi.context.post('/settings/configuration', { data: { [enabledKey]: !smsConfig.original[enabledKey] } });
    expect([401, 403], `doctor got HTTP ${res.status()}`).toContain(res.status());
  });
});
