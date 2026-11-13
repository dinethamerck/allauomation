// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration for QA Aesthetic - Import Products Test Suite
 * Target: https://qa_care.amerck.com
 *
 * NOTE: Playwright browsers are already installed at:
 * %LOCALAPPDATA%\\ms-playwright (chromium-1234, firefox-1538, webkit-2336)
 * No need to run 'playwright install' again.
 *
 * DISK USAGE NOTES:
 * - Video and trace recording are disabled to prevent ENOSPC errors.
 * - Only screenshots on failure are saved (low disk impact).
 * - Run `npx playwright test --clean` or manually delete test-results/ to free space.
 */
module.exports = defineConfig({
  testDir: './tests',
  /* Output dir - cleared automatically before each full run */
  outputDir: 'test-results',
  /* Run tests in parallel to drastically reduce total execution time */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* No retries — avoids doubling disk writes from artifact re-saves */
  retries: 0,
  /* Run 6 parallel workers for fast test execution */
  workers: process.env.CI ? 2 : 6,
  /* Reporters: use only 'list' to avoid large HTML report files on full disk */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  /* Global timeout per test */
  timeout: 60000,
  /* Shared settings for all projects */
  use: {
    baseURL: 'https://ninewells.lk/demo/',
    /* Trace disabled — traces are large zip files that fill disk quickly */
    trace: 'off',
    /* Screenshot only on failure — minimal disk usage */
    screenshot: 'only-on-failure',
    /* Video disabled — videos are the #1 cause of ENOSPC in Playwright */
    video: 'off',
    /* Viewport */
    viewport: { width: 1280, height: 720 },
    /* Action / navigation timeouts */
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
