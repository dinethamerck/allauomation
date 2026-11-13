// @ts-check
const { test, expect } = require('@playwright/test');

test('Smoke test environment check', async ({ page }) => {
  await page.goto('https://qa_care.amerck.com/login');
  await expect(page).toHaveTitle(/Amerck Care/i);
});
