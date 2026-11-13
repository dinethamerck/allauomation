const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  console.log('Testing Role Creation Flow...');
  await page.goto('https://qa_care.amerck.com/admin/settings/roles', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Check empty role submission
  await page.locator('button:has-text("Add Role")').click();
  await page.waitForTimeout(1000);
  const roleModal = page.locator('div[role="dialog"]');
  console.log('Role modal visible:', await roleModal.isVisible());

  await roleModal.locator('button:has-text("Create Role")').click();
  await page.waitForTimeout(1000);
  console.log('Still open after empty submit?', await roleModal.isVisible());

  const testRoleName = 'Test Role ' + Date.now().toString().slice(-4);
  console.log('Filling role name:', testRoleName);
  await roleModal.locator('input').first().fill(testRoleName);

  let roleCreated = false;
  page.on('response', res => {
    if (res.url().includes('Role') && res.request().method() === 'POST') {
      console.log('POST Role response status:', res.status());
      roleCreated = true;
    }
  });

  await roleModal.locator('button:has-text("Create Role")').click();
  await page.waitForTimeout(3000);
  console.log('Role created response triggered?', roleCreated);
  console.log('Modal closed after role creation?', !(await roleModal.isVisible()));

  // Search role
  const searchInput = page.locator('input[placeholder="Search…"]').first();
  await searchInput.fill(testRoleName);
  await page.waitForTimeout(2000);
  const rows = await page.locator('table tbody tr').allInnerTexts();
  console.log('Filtered rows for new role:', rows);

  // Now let's test Consent Form Template Creation
  console.log('\nTesting Consent Template Creation Flow...');
  await page.goto('https://qa_care.amerck.com/admin/settings/consent-form-templates', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await page.locator('button:has-text("Add Template")').click();
  await page.waitForTimeout(1000);
  const tmplModal = page.locator('div[role="dialog"]');
  console.log('Consent modal visible:', await tmplModal.isVisible());

  // Empty submit
  await tmplModal.locator('button:has-text("Create Template")').click();
  await page.waitForTimeout(1000);
  console.log('Consent modal still open after empty submit?', await tmplModal.isVisible());

  const testTmplTitle = 'Auto Consent ' + Date.now().toString().slice(-4);
  const titleInput = tmplModal.locator('input').first();
  const contentInput = tmplModal.locator('textarea').first();
  await titleInput.fill(testTmplTitle);
  await contentInput.fill('I hereby consent for {{patient_name}} at {{hospital_name}}.');

  let tmplCreated = false;
  page.on('response', res => {
    if (res.url().includes('consent-forms/templates') && res.request().method() === 'POST') {
      console.log('POST template response status:', res.status());
      tmplCreated = true;
    }
  });

  await tmplModal.locator('button:has-text("Create Template")').click();
  await page.waitForTimeout(3000);
  console.log('Template created response triggered?', tmplCreated);
  console.log('Template modal closed?', !(await tmplModal.isVisible()));

  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('Template title visible on page?', pageText.includes(testTmplTitle));

  await browser.close();
})();
