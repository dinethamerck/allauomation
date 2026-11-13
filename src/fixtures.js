const base = require('@playwright/test');
const { ApiClient } = require('./api/ApiClient');
const { SmsVerifier } = require('./api/SmsVerifier');
const { OrderJourney } = require('./flows/OrderJourney');
const configBackup = require('./api/configBackup');
const { authFile, env } = require('./config/env');

/**
 * Fixtures
 *  page          - doctor session (project default storageState)
 *  adminPage     - second browser context logged in as admin
 *  doctorApi / adminApi - authenticated API clients
 *  sms           - SmsVerifier backed by the admin API
 *  smsConfig     - set SMS configuration for the test; original values restored afterwards
 *  journey       - OrderJourney on the doctor page
 */
const test = base.test.extend({
  adminPage: async ({ browser, baseURL, timezoneId }, use) => {
    const context = await browser.newContext({ baseURL, timezoneId, storageState: authFile('admin') });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  doctorApi: async ({}, use) => {
    const api = await ApiClient.create('doctor');
    await use(api);
    await api.dispose();
  },

  adminApi: async ({}, use) => {
    const api = await ApiClient.create('admin');
    await use(api);
    await api.dispose();
  },

  sms: async ({ adminApi }, use) => {
    await use(new SmsVerifier(adminApi));
  },

  smsConfig: async ({ adminApi }, use) => {
    // Heal first: if an earlier restore failed, its true originals are still in the backup file.
    // Without this, this test would snapshot the leaked values as its "original".
    await configBackup.restorePending(adminApi);
    const original = await adminApi.getConfiguration();
    const touched = new Set();
    await use({
      original,
      async set(partial) {
        Object.keys(partial).forEach(k => touched.add(k));
        configBackup.remember(original, Object.keys(partial));
        await adminApi.updateConfiguration(partial);
      },
      get: () => adminApi.getConfiguration(),
    });
    if (touched.size) {
      // The backup file wins: it holds the earliest originals, including keys from failed restores.
      const restore = { ...Object.fromEntries([...touched].map(k => [k, original[k]])), ...configBackup.saved() };
      await adminApi.updateConfiguration(restore);
      configBackup.forget(); // only reached when the restore call succeeded
    }
  },

  journey: async ({ page, doctorApi }, use) => {
    await use(new OrderJourney(page, doctorApi, { patient: env.patient }));
  },
});

module.exports = { test, expect: base.expect };
