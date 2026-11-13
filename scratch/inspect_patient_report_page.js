const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  page.on('response', async res => {
    if (res.url().includes('api') || res.url().includes('telemed') || res.url().includes('report')) {
      console.log('RESPONSE:', res.status(), res.url());
      try {
        const text = await res.text();
        console.log('DATA:', text.substring(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://qa_care.amerck.com/admin/telemedicine-reports/patients/332977', { waitUntil: 'networkidle' });

  console.log('Page Title:', await page.title());
  console.log('Page Content:');
  const mainText = await page.locator('main, body').first().innerText();
  console.log(mainText.substring(0, 1000));

  const buttons = await page.locator('button, a, input, select, textarea').evaluateAll(els =>
    els.map(el => ({ tag: el.tagName, type: el.type, name: el.name, placeholder: el.placeholder, text: el.innerText.trim() })).filter(x => x.text || x.name || x.placeholder)
  );
  console.log('Interactive elements on patient report review page:');
  console.log(JSON.stringify(buttons, null, 2));

  await browser.close();
})();
