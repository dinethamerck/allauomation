// scratch/inspect-template-dropdown.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: '.auth/user.json',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  await page.goto('https://qa_care.amerck.com/admin/admissions', { waitUntil: 'networkidle' });
  const draftBtn = page.locator('text=Draft').first();
  await draftBtn.click();
  await page.waitForTimeout(2000);

  const invTab = page.getByRole('button', { name: /2\.\s*Investigation|Investigation/i }).first();
  await invTab.click();
  await page.waitForTimeout(1500);

  // Find template dropdown/combobox
  const templateTrigger = page.locator('button, [role="combobox"]').filter({ hasText: /FBC/i }).first();
  console.log('Template trigger visible:', await templateTrigger.isVisible());
  if (await templateTrigger.isVisible()) {
    await templateTrigger.click();
    await page.waitForTimeout(1000);

    const options = await page.locator('[role="option"], [role="menuitem"], li, .select-option, div').evaluateAll(items => 
      items.map(el => el.innerText.trim()).filter(t => t.length > 0 && t.length < 50)
    );
    console.log('Dropdown items visible:', Array.from(new Set(options)).slice(0, 30));
  }

  // Also check Custom blood group button click
  const customBgBtn = page.locator('button, div, span').filter({ hasText: /^Custom$/ }).first();
  console.log('Custom button visible:', await customBgBtn.isVisible());
  if (await customBgBtn.isVisible()) {
    await customBgBtn.click();
    await page.waitForTimeout(1000);
    const customInput = page.locator('input[placeholder*="blood" i], input[placeholder*="custom" i], input[type="text"]').last();
    console.log('Custom input visible after click:', await customInput.isVisible());
  }

  await browser.close();
})();
