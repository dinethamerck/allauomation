const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  console.log('Inspecting Bed modal details...');
  await page.goto('https://qa_care.amerck.com/admin/settings/ward-management', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Add Bed")').click();
  await page.waitForTimeout(1000);

  const bedModalDetails = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return 'No dialog';
    const buttons = Array.from(dialog.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim(),
      type: b.type,
      className: b.className,
      disabled: b.disabled
    }));
    const inputs = Array.from(dialog.querySelectorAll('input')).map(i => ({
      name: i.name,
      type: i.type,
      placeholder: i.placeholder,
      required: i.required
    }));
    return { buttons, inputs };
  });
  console.log('Bed modal details:', JSON.stringify(bedModalDetails, null, 2));

  await browser.close();
})();
