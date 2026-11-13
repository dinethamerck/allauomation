const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  const routes = [
    { name: 'Settings Hub', url: 'https://qa_care.amerck.com/admin/settings' },
    { name: 'Organizations', url: 'https://qa_care.amerck.com/admin/settings/organizations' },
    { name: 'Users', url: 'https://qa_care.amerck.com/admin/settings/users' },
    { name: 'User Roles', url: 'https://qa_care.amerck.com/admin/settings/roles' },
    { name: 'Bed Management', url: 'https://qa_care.amerck.com/admin/settings/ward-management' },
    { name: 'Consent Form Templates', url: 'https://qa_care.amerck.com/admin/settings/consent-form-templates' }
  ];

  for (const r of routes) {
    console.log(`\n========================================`);
    console.log(`Navigating to ${r.name}: ${r.url}`);
    try {
      await page.goto(r.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      const pageInfo = await page.evaluate(() => {
        const title = document.title;
        const h1 = Array.from(document.querySelectorAll('h1, h2')).map(h => h.innerText.trim()).filter(Boolean);
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
        const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
          type: i.type,
          name: i.name,
          placeholder: i.placeholder,
          value: i.value
        }));
        const tables = Array.from(document.querySelectorAll('table')).map(t => {
          const headers = Array.from(t.querySelectorAll('th')).map(th => th.innerText.trim());
          const rowCount = t.querySelectorAll('tbody tr').length;
          return { headers, rowCount };
        });
        const textSample = document.body.innerText.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 30);
        return { title, h1, buttons, inputs, tables, textSample };
      });

      console.log(`Title: ${pageInfo.title}`);
      console.log(`Headings: ${JSON.stringify(pageInfo.h1)}`);
      console.log(`Action Buttons: ${JSON.stringify(pageInfo.buttons)}`);
      console.log(`Inputs: ${JSON.stringify(pageInfo.inputs)}`);
      console.log(`Tables: ${JSON.stringify(pageInfo.tables)}`);
      console.log(`Text Sample: ${pageInfo.textSample.slice(0, 15).join(' | ')}`);
    } catch (err) {
      console.error(`Error loading ${r.name}:`, err.message);
    }
  }

  // Also check Profile dropdown and Practice combobox
  console.log(`\n========================================`);
  console.log(`Testing Profile Dropdown and Practice Combobox on /admin/settings`);
  await page.goto('https://qa_care.amerck.com/admin/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Click profile JR
  const jrButton = page.locator('button:has-text("JR")');
  if (await jrButton.isVisible()) {
    console.log('Clicking JR profile button...');
    await jrButton.click();
    await page.waitForTimeout(1000);
    const menuItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[role="menuitem"], [role="menu"] *')).map(el => el.innerText.trim()).filter(Boolean);
    });
    console.log('Profile Menu Items:', JSON.stringify(menuItems));
  }

  // Click Practice combobox
  const practiceBtn = page.locator('button:has-text("Janitha Rasadun\'s Practice")');
  if (await practiceBtn.isVisible()) {
    console.log('Clicking Practice combobox...');
    await practiceBtn.click();
    await page.waitForTimeout(1000);
    const popoverItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[role="listbox"], [role="option"], [cmdk-item]')).map(el => el.innerText.trim()).filter(Boolean);
    });
    console.log('Practice combobox items:', JSON.stringify(popoverItems));
  }

  await browser.close();
})();
