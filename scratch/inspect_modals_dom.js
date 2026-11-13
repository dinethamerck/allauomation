const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  console.log('Inspecting Role modal buttons...');
  await page.goto('https://qa_care.amerck.com/admin/settings/roles', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Add Role")').click();
  await page.waitForTimeout(1000);

  const roleModalDetails = await page.evaluate(() => {
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
  console.log('Role modal details:', JSON.stringify(roleModalDetails, null, 2));

  console.log('\nInspecting Consent Form Template modal buttons...');
  await page.goto('https://qa_care.amerck.com/admin/settings/consent-form-templates', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("Add Template")').click();
  await page.waitForTimeout(1000);

  const tmplModalDetails = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return 'No dialog';
    const buttons = Array.from(dialog.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim(),
      type: b.type,
      className: b.className,
      disabled: b.disabled
    }));
    const inputs = Array.from(dialog.querySelectorAll('input, textarea')).map(i => ({
      name: i.name,
      tagName: i.tagName,
      placeholder: i.placeholder,
      required: i.required
    }));
    return { buttons, inputs };
  });
  console.log('Consent modal details:', JSON.stringify(tmplModalDetails, null, 2));

  await browser.close();
})();
