// scratch/inspect-create-template.js
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

  const createBtn = page.getByRole('button', { name: /Create Template/i });
  console.log('Create Template button visible:', await createBtn.isVisible());
  await createBtn.click();
  await page.waitForTimeout(2000);

  console.log('Current URL after click:', page.url());
  await page.screenshot({ path: 'scratch/create-template-ui.png', fullPage: true });
  console.log('Saved scratch/create-template-ui.png');

  const fields = await page.evaluate(() => {
    return {
      inputs: Array.from(document.querySelectorAll('input, textarea')).map(i => ({
        placeholder: i.placeholder,
        name: i.name,
        type: i.type,
        ariaLabel: i.getAttribute('aria-label')
      })),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(b => b.length > 0 && b.length < 50)
    };
  });
  console.log('Fields:', fields);

  await browser.close();
})();
