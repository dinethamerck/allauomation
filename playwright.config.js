// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file securely
dotenv.config({ path: path.resolve(__dirname, '.env') });

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['./utils/evidence-reporter.js', {
      evidenceDir: 'QA-Automation-Evidence',
      appName: 'Amerck QA Care EMR & Prescription Automation',
      environment: 'QA',
      maskSensitiveData: true,
      generateZip: true
    }]
  ],
  timeout: 45000,
  use: {
    baseURL: (process.env.QA_CARE_BASE_URL || 'https://qa_pg.amerck.care').replace(/\/+$/, ''),
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    headless: process.env.HEADLESS !== 'false',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
