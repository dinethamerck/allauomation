// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const { env, authFile } = require('./src/config/env');

module.exports = defineConfig({
  testDir: './tests',
  // All specs share one QA organisation (SMS configuration, scheduler, test patient),
  // so they must not run concurrently.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 5 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.baseUrl,
    // Scheduled times are computed in the browser, so run it on the organisation's clock.
    timezoneId: env.orgTimezone,
    locale: 'en-US',
    viewport: { width: 1600, height: 1000 },
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      // No traces/videos for the login step, so typed passwords never land in artifacts.
      use: { trace: 'off', video: 'off', screenshot: 'off' },
    },
    {
      name: 'optical-sms',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1000 }, storageState: authFile('doctor') },
    },
  ],
});
