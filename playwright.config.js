// @ts-check
const { defineConfig, devices } = require('@playwright/test');
// override: the VS Code Playwright extension keeps its test process alive between runs; without this,
// values loaded earlier stay in process.env and later .env edits are ignored (dotenv never overwrites by default)
require('dotenv').config({ override: true });

/**
 * Specs that run on desktop Chromium only (API checks that create QA data + desktop-only screens).
 * Other projects ignore them completely, so they are not listed as "skipped".
 * WebKit on Windows also fails the TLS handshake to the QA host ("SSL connect error").
 */
const CHROMIUM_ONLY_SPECS = [/emr-224\.spec\.js/, /emr-236\.spec\.js/, /emr-237(-tc033)?\.spec\.js/];

/**
 * Playwright Test Configuration for AMERCK CARE QA Portal
 * Target URL: https://qa_care.amerck.com
 */
module.exports = defineConfig({
  testDir: './tests',
  /* Maximum time one test can run for */
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Reporter to use */
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  use: {
    /* Base URL to use in actions like `await page.goto('/login')` */
    baseURL: process.env.BASE_URL || 'https://qa_care.amerck.com',

    /* Collect trace and screenshot on failure */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: CHROMIUM_ONLY_SPECS,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: CHROMIUM_ONLY_SPECS,
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: CHROMIUM_ONLY_SPECS,
    },
  ],
});
