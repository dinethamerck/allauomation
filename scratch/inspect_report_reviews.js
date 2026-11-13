const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  page.on('request', req => {
    if (req.url().includes('api') || req.url().includes('telemed') || req.url().includes('report')) {
      console.log('REQUEST:', req.method(), req.url());
    }
  });

  page.on('response', async res => {
    if (res.url().includes('telemed') || res.url().includes('report')) {
      console.log('RESPONSE:', res.status(), res.url());
      try {
        const text = await res.text();
        console.log('DATA:', text.substring(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://qa_care.amerck.com/admin/telemedicine-reports', { waitUntil: 'networkidle' });
  
  // Click Upload Report
  const uploadBtn = page.locator('button:has-text("Upload Report")');
  console.log('Upload button visible?', await uploadBtn.isVisible());
  await uploadBtn.click();
  await page.waitForTimeout(1000);

  const dialog = page.locator('div[role="dialog"]');
  console.log('Dialog visible?', await dialog.isVisible());
  if (await dialog.isVisible()) {
    console.log('Dialog inner text:');
    console.log(await dialog.innerText());
    
    // Check inputs inside dialog
    const inputs = await dialog.locator('input, button, select, textarea').evaluateAll(els =>
      els.map(el => ({ tag: el.tagName, type: el.type, name: el.name, placeholder: el.placeholder, text: el.innerText }))
    );
    console.log('Dialog elements:', JSON.stringify(inputs, null, 2));

    // Try typing a patient ID (from prescription page, e.g., 'PA-...') or search query
    const input = dialog.locator('input').first();
    await input.fill('test');
    const searchBtn = dialog.locator('button:has-text("Search")');
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await page.waitForTimeout(2000);
      console.log('After search inner text:');
      console.log(await dialog.innerText());
    }
  }

  // Check table content
  const rows = await page.locator('table tbody tr').allInnerTexts();
  console.log('Table row count:', rows.length);
  console.log('Table rows:', rows);

  await browser.close();
})();
