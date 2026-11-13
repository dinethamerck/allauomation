// scratch/inspect-investigation.js
const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: '.auth/user.json',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to /admin/admissions...');
  await page.goto('https://qa_care.amerck.com/admin/admissions', { waitUntil: 'networkidle' });

  // Open existing draft or create one
  const draftBtn = page.locator('text=Draft').first();
  if (await draftBtn.isVisible()) {
    console.log('Clicking existing Draft...');
    await draftBtn.click();
  } else {
    console.log('No draft found, admitting patient...');
    const admitBtn = page.getByRole('button', { name: 'Admit Patient' }).first();
    await admitBtn.click();
    await page.waitForTimeout(1000);
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.locator('input[name="query"]').fill('0764981884');
    await dialog.getByRole('button', { name: 'Search' }).click();
    await page.waitForTimeout(2000);
    const patientCard = dialog.locator('div:has-text("Dilumi Abeysekara")').last();
    if (await patientCard.isVisible()) {
      await patientCard.click();
      await page.waitForTimeout(1500);
      const newDraft = page.locator('text=Draft').first();
      if (await newDraft.isVisible()) {
        await newDraft.click();
      }
    }
  }

  await page.waitForTimeout(2000);

  // Print all stepper tabs
  const tabButtons = await page.locator('button').evaluateAll(buttons => 
    buttons.map(b => b.innerText.trim()).filter(t => /^\d+\./.test(t))
  );
  console.log('Stepper Tabs:', tabButtons);

  // Click Step 2: Investigation
  const invTab = page.getByRole('button', { name: /2\.\s*Investigation|Investigation/i }).first();
  if (await invTab.isVisible()) {
    console.log('Clicking Step 2: Investigation tab...');
    await invTab.click();
    await page.waitForTimeout(2000);
  } else {
    console.log('Investigation tab NOT found!');
  }

  // Take screenshot of Step 2
  await page.screenshot({ path: 'scratch/investigation-step2.png', fullPage: true });
  console.log('Saved scratch/investigation-step2.png');

  // Inspect Blood Group section
  const bloodGroupTexts = await page.locator('body').evaluate(() => {
    const el = document.querySelector('*');
    return {
      hasBloodGroup: document.body.innerText.includes('Blood Group'),
      tableHeaders: Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim()),
      tableRows: Array.from(document.querySelectorAll('tr')).map(tr => tr.innerText.replace(/\n+/g, ' | ').trim()).slice(0, 40),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(b => b.length > 0 && b.length < 40),
      inputs: Array.from(document.querySelectorAll('input')).map(i => ({ placeholder: i.placeholder, name: i.name, type: i.type, value: i.value }))
    };
  });

  console.log('Blood Group Present:', bloodGroupTexts.hasBloodGroup);
  console.log('Table Headers:', bloodGroupTexts.tableHeaders);
  console.log('Sample Table Rows (First 15):', bloodGroupTexts.tableRows.slice(0, 15));
  console.log('Buttons:', bloodGroupTexts.buttons);
  console.log('Inputs count:', bloodGroupTexts.inputs.length);

  await browser.close();
})();
