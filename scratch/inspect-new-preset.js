const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await context.newPage();

  console.log('Navigating to /admin/drugs/presets...');
  await page.goto('https://qa_pg.amerck.care/admin/drugs/presets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const newPresetBtn = page.getByRole('button', { name: 'New Preset' });
  if (await newPresetBtn.isVisible()) {
    console.log('Clicking New Preset...');
    await newPresetBtn.click();
    await page.waitForTimeout(2000);
    console.log('URL after clicking New Preset:', page.url());
    await page.screenshot({ path: 'scratch/new-preset-ui.png' });

    // Check table headers and taper button in presets
    const text = await page.locator('body').innerText();
    console.log('Preset UI text containing taper/medication:', text.split('\n').filter(t => /taper|dosage|duration|frequency|medication|preset/i.test(t)));
  }

  await browser.close();
})();
