// scratch/probe-emr67.js — probe children-count validation behaviour on staging
require('dotenv').config();
const { chromium } = require('@playwright/test');
const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const writes = [];
  page.on('request', (r) => {
    if (['POST', 'PUT', 'PATCH'].includes(r.method()) && r.url().includes('amerck') && !r.url().includes('cdn-cgi')) {
      writes.push({ m: r.method(), url: r.url(), body: r.postData(), headers: r.headers() });
    }
  });
  const responses = [];
  page.on('response', async (res) => {
    const r = res.request();
    if (['POST', 'PUT', 'PATCH'].includes(r.method()) && res.url().includes('amerck') && !res.url().includes('cdn-cgi')) {
      responses.push({ status: res.status(), url: res.url(), body: (await res.text().catch(() => '')).slice(0, 600) });
    }
  });

  await page.goto('/admin/admissions', { waitUntil: 'networkidle' });
  await page.locator('text=Draft').first().click();
  await page.waitForTimeout(2500);
  const wizardUrl = page.url();
  console.log('Wizard URL:', wizardUrl);
  const openSH = async () => {
    await page.getByRole('button', { name: /8\.\s*Social History/ }).click();
    await page.locator('text=No. of Children').waitFor();
  };
  await openSH();
  const inputs = page.locator('input[type="number"]');
  const vals = async () => inputs.evaluateAll((els) => els.map((e) => ({ v: e.value, valid: e.validity.valid, step: e.validity.stepMismatch, under: e.validity.rangeUnderflow, bad: e.validity.badInput })));

  for (const v of ['1.5', '-1', '2.0', '1e2', '0.0001', '3', '00', '1,5']) {
    await inputs.nth(0).fill('');
    await inputs.nth(0).pressSequentially(v);
    console.log('typed', JSON.stringify(v), '->', JSON.stringify((await vals())[0]));
  }
  // arrow keys
  await inputs.nth(1).fill('0');
  await inputs.nth(1).press('ArrowDown');
  console.log('ArrowDown from 0 ->', (await vals())[1]);
  await inputs.nth(1).fill('1.5');
  await inputs.nth(1).press('ArrowUp');
  console.log('ArrowUp from 1.5 ->', (await vals())[1]);
  // error messages?
  const err = await page.locator('.text-destructive, [role="alert"], .text-red-500').allInnerTexts();
  console.log('error texts:', err);

  // Save decimals and see
  await inputs.nth(0).fill('1.5');
  await inputs.nth(1).fill('2.7');
  await inputs.nth(2).fill('-3');
  await inputs.nth(3).fill('4');
  writes.length = 0; responses.length = 0;
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.waitForTimeout(3000);
  console.log('After Continue URL:', page.url());
  const activeStep = await page.locator('button').evaluateAll((bs) => bs.filter((b) => /^\d+\./.test(b.innerText.trim())).map((b) => b.innerText.trim() + ' :: ' + b.className.slice(0, 60)));
  console.log(activeStep.filter((s) => /bg-/.test(s)));
  console.log('toasts:', await page.locator('[data-rht-toaster], [data-sonner-toaster], [role="status"]').allInnerTexts());
  console.log('WRITES:', JSON.stringify(writes.map((w) => ({ m: w.m, url: w.url, body: w.body?.slice(0, 1500) })), null, 1));
  console.log('RESPONSES:', JSON.stringify(responses, null, 1));

  await openSH();
  console.log('After return:', await vals());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await openSH();
  console.log('After reload:', await vals());
  await browser.close();
})();
