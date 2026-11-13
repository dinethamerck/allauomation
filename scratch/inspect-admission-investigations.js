// scratch/inspect-admission-investigations.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: '.auth/user.json',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to /admin/admission-investigations...');
  await page.goto('https://qa_care.amerck.com/admin/admission-investigations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'scratch/admission-investigations.png', fullPage: true });
  console.log('Saved scratch/admission-investigations.png');

  const textData = await page.evaluate(() => {
    return {
      title: document.title,
      buttons: Array.from(document.querySelectorAll('button, a')).map(el => el.innerText.trim()).filter(t => t.length > 0 && t.length < 50),
      headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, th')).map(el => el.innerText.trim()),
      tableText: Array.from(document.querySelectorAll('tr')).map(el => el.innerText.replace(/\n+/g, ' | ').trim()).slice(0, 20)
    };
  });

  console.log('Headings:', textData.headings);
  console.log('Buttons:', textData.buttons);
  console.log('Table rows:', textData.tableText);

  await browser.close();
})();
