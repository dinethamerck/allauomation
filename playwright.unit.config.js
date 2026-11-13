// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Offline unit-test configuration for the Page Object Model layer.
 * Every page object function is exercised against mocked HTML fixtures served
 * through page.route(), so no QA credentials or network access are required.
 *
 * Run: npm run test:unit
 */
module.exports = defineConfig({
  testDir: './tests-unit',
  timeout: 60 * 1000,
  expect: { timeout: 5 * 1000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-unit', open: 'never' }]],
  use: {
    baseURL: 'http://emr.test',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
