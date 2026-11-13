const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();
  await page.goto('https://qa_care.amerck.com/admin/admissions', { waitUntil: 'networkidle' });

  const admitBtn = page.getByRole('button', { name: 'Admit Patient' });
  await admitBtn.click();
  await page.waitForTimeout(1000);

  const dialog = page.locator('[role="dialog"]').first();
  const queryInput = dialog.locator('input[name="query"]');
  await queryInput.fill('0764981884');
  await dialog.getByRole('button', { name: 'Search' }).click();
  await page.waitForTimeout(2000);

  const patientCard = dialog.locator('div:has-text("Dilumi Abeysekara")').last();
  console.log('Patient card visible:', await patientCard.isVisible());
  console.log('Clicking patient card...');
  await patientCard.click();
  await page.waitForTimeout(3000);

  console.log('Redirected URL:', page.url());
  await page.screenshot({ path: 'scratch/after-patient-click.png' });
  console.log('Page header / heading:\n', await page.locator('h1, h2, h3, main').first().innerText());

  await browser.close();
})();
