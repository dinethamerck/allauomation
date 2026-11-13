// @ts-check
require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const authFile = path.join(__dirname, '.auth', 'user.json');
const hasAuth = fs.existsSync(authFile);

/**
 * Playwright configuration for AMERCK CARE Test Automation
 * Targets: https://qa_care.amerck.com
 * Secure credentials loaded from .env
 */
module.exports = defineConfig({
  globalSetup: require.resolve('./global-setup'),
  testDir: './tests',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: (process.env.BASE_URL || 'https://qa_care.amerck.com').replace(/\/+$/, ''),
    storageState: hasAuth ? authFile : undefined,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
