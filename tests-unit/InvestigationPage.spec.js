// tests-unit/InvestigationPage.spec.js
const { test, expect } = require('@playwright/test');
const { InvestigationPage } = require('../pages/InvestigationPage');
const { mockApp } = require('./helpers/mockApp');

const WIZARD = `
  <div id="wizard" class="hidden">
    <nav>
      <button data-step="pc">1. Presenting Complaint</button>
      <button data-step="inv">2. Investigation</button>
      <button data-step="pmh">3. Past Medical History</button>
    </nav>
    <section id="pc" class="step"><h2>Presenting Complaint</h2><input id="complaint"></section>
    <section id="inv" class="step hidden">
      <div id="bg">Blood Group
        <span>A+</span><span>A-</span><span>B+</span><span>B-</span>
        <span>AB+</span><span>AB-</span><span>O+</span><span>O-</span><span>Custom</span>
      </div>
      <div id="date-headers"></div>
      <button id="add-date">+ Add Date Column</button>
      <table>
        <thead><tr><th>Parameters</th></tr></thead>
        <tbody>
          <tr><td>Hemoglobin</td></tr>
          <tr><td>WBC Count</td></tr>
          <tr><td>Platelets</td></tr>
        </tbody>
      </table>
      <div role="dialog" id="calendar" class="hidden"></div>
    </section>
    <section id="pmh" class="step hidden"><h2>Past Medical History</h2></section>
  </div>
  <script>
    window.__activeInput = null;
    const show = (id) => document.querySelectorAll('.step').forEach(s => s.classList.toggle('hidden', s.id !== id));
    document.querySelectorAll('nav button').forEach(b => b.onclick = () => show(b.dataset.step));
    document.querySelectorAll('#bg span').forEach(s => s.onclick = () => {
      document.querySelectorAll('#bg span').forEach(o => o.className = '');
      s.className = 'bg-blue-500 text-white';
    });
    const cal = document.getElementById('calendar');
    for (let d = 1; d <= 28; d++) {
      const b = document.createElement('button');
      b.textContent = d;
      b.onclick = () => { window.__activeInput.value = '2026-11-' + String(d).padStart(2, '0'); cal.classList.add('hidden'); };
      cal.appendChild(b);
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cal.classList.add('hidden'); });
    document.getElementById('add-date').onclick = () => {
      const i = document.createElement('input');
      i.placeholder = 'Select date';
      i.onclick = () => { window.__activeInput = i; cal.classList.remove('hidden'); };
      document.getElementById('date-headers').appendChild(i);
      document.querySelectorAll('tbody tr').forEach(tr => {
        const td = document.createElement('td');
        td.innerHTML = '<input>';
        tr.appendChild(td);
      });
    };
  </script>`;

/** Admissions list with an existing "Draft" admission. */
const ADMISSIONS_WITH_DRAFT = `
  <h1>Admissions</h1>
  <a id="draft" href="#">Draft</a>
  ${WIZARD}
  <script>document.getElementById('draft').onclick = () => document.getElementById('wizard').classList.remove('hidden');</script>`;

/** Admissions list with no draft: must go through "Admit Patient" search to create one. */
const ADMISSIONS_WITHOUT_DRAFT = `
  <h1>Admissions</h1>
  <button id="admit">Admit Patient</button>
  <div id="drafts"></div>
  <div role="dialog" id="admit-dialog" class="hidden">
    <input name="query"><button id="search">Search</button>
    <div id="results"></div>
  </div>
  ${WIZARD}
  <script>
    window.__searched = null;
    const dlg = document.getElementById('admit-dialog');
    document.getElementById('admit').onclick = () => dlg.classList.remove('hidden');
    document.getElementById('search').onclick = () => {
      window.__searched = dlg.querySelector('input').value;
      const card = document.createElement('div');
      card.textContent = 'Dilumi Abeysekara';
      card.onclick = () => {
        dlg.classList.add('hidden');
        const a = document.createElement('a');
        a.textContent = 'Draft';
        a.onclick = () => document.getElementById('wizard').classList.remove('hidden');
        document.getElementById('drafts').appendChild(a);
      };
      document.getElementById('results').appendChild(card);
    };
  </script>`;

async function setup(page, html = ADMISSIONS_WITH_DRAFT) {
  await mockApp(page, { '/admin/admissions': html });
  const ip = new InvestigationPage(page);
  await ip.goto();
  return ip;
}

test.describe('InvestigationPage', () => {
  test('INV-01 goto() opens an existing draft and lands on Step 2', async ({ page }) => {
    const ip = await setup(page);
    expect(new URL(page.url()).pathname).toBe('/admin/admissions');
    await expect(page.locator('#inv')).toBeVisible();
    await expect(ip.addDateColumnButton).toBeVisible();
  });

  test('INV-02 goto() admits the test patient when no draft exists', async ({ page }) => {
    const ip = await setup(page, ADMISSIONS_WITHOUT_DRAFT);
    expect(await page.evaluate(() => window.__searched)).toBe('0764981884');
    await expect(page.locator('#inv')).toBeVisible();
    await expect(ip.parametersHeader).toBeVisible();
  });

  test('INV-03 getBloodGroupBadge() returns the exact badge (A+ is not AB+)', async ({ page }) => {
    const ip = await setup(page);
    await expect(ip.getBloodGroupBadge('A+')).toHaveText('A+');
    await expect(ip.getBloodGroupBadge('AB+')).toHaveText('AB+');
    await expect(ip.getBloodGroupBadge('Custom')).toBeVisible();
  });

  test('INV-04 selectBloodGroup() marks the badge as selected', async ({ page }) => {
    const ip = await setup(page);
    await ip.selectBloodGroup('O+');
    await expect(ip.getBloodGroupBadge('O+')).toHaveClass(/bg-blue-500/);
  });

  test('INV-05 isBloodGroupSelected() follows the current selection', async ({ page }) => {
    const ip = await setup(page);
    expect(await ip.isBloodGroupSelected('B-')).toBe(false);
    await ip.selectBloodGroup('B-');
    expect(await ip.isBloodGroupSelected('B-')).toBe(true);
    await ip.selectBloodGroup('AB-');
    expect(await ip.isBloodGroupSelected('B-')).toBe(false);
    expect(await ip.isBloodGroupSelected('AB-')).toBe(true);
  });

  test('INV-06 isBloodGroupSelected() honours aria-pressed and parent class', async ({ page }) => {
    const ip = await setup(page);
    await page.locator('#bg span', { hasText: /^A-$/ }).evaluate((el) => el.setAttribute('aria-pressed', 'true'));
    expect(await ip.isBloodGroupSelected('A-')).toBe(true);
    await page.locator('#bg span', { hasText: /^O-$/ }).evaluate((el) => {
      const wrap = document.createElement('span');
      wrap.className = 'selected';
      el.replaceWith(wrap);
      wrap.appendChild(el);
    });
    expect(await ip.isBloodGroupSelected('O-')).toBe(true);
  });

  test('INV-07 isBloodGroupSelected() falls back to computed colour styles', async ({ page }) => {
    const ip = await setup(page);
    await page.locator('#bg span', { hasText: /^B\+$/ }).evaluate((el) => { el.style.backgroundColor = 'rgb(37, 99, 235)'; });
    expect(await ip.isBloodGroupSelected('B+')).toBe(true);
    await page.locator('#bg span', { hasText: /^A\+$/ }).evaluate((el) => { el.style.color = 'rgb(255, 255, 255)'; });
    expect(await ip.isBloodGroupSelected('A+')).toBe(true);
    await page.locator('#bg span', { hasText: /^O\+$/ }).evaluate((el) => { el.style.backgroundColor = 'rgb(243, 244, 246)'; });
    expect(await ip.isBloodGroupSelected('O+')).toBe(false);
  });

  test('INV-08 addDateColumn() adds a date column; getDateColumnCount() counts them', async ({ page }) => {
    const ip = await setup(page);
    expect(await ip.getDateColumnCount()).toBe(0);
    await ip.addDateColumn();
    expect(await ip.getDateColumnCount()).toBe(1);
    await ip.addDateColumn();
    expect(await ip.getDateColumnCount()).toBe(2);
  });

  test('INV-09 selectDateForColumn() defaults to column 0, day 2', async ({ page }) => {
    const ip = await setup(page);
    await ip.addDateColumn();
    await ip.selectDateForColumn();
    await expect(ip.dateInputs.nth(0)).toHaveValue('2026-11-02');
  });

  test('INV-10 selectDateForColumn(index, day) sets only the targeted column', async ({ page }) => {
    const ip = await setup(page);
    await ip.addDateColumn();
    await ip.addDateColumn();
    await ip.selectDateForColumn(1, 15);
    await expect(ip.dateInputs.nth(0)).toHaveValue('');
    await expect(ip.dateInputs.nth(1)).toHaveValue('2026-11-15');
  });

  test('INV-11 selectDateForColumn() presses Escape when the day is not available', async ({ page }) => {
    const ip = await setup(page);
    await ip.addDateColumn();
    await ip.selectDateForColumn(0, '31');
    await expect(page.locator('#calendar')).toBeHidden();
    await expect(ip.dateInputs.nth(0)).toHaveValue('');
  });

  test('INV-12 getParameterRow(name) matches case-insensitively', async ({ page }) => {
    const ip = await setup(page);
    await expect(ip.getParameterRow('wbc count')).toContainText('WBC Count');
  });

  test('INV-13 getParameterRow() without a name returns the first row with inputs', async ({ page }) => {
    const ip = await setup(page);
    await ip.addDateColumn();
    await expect(ip.getParameterRow()).toContainText('Hemoglobin');
  });

  test('INV-14 setParameterValue() / getParameterValue() round-trip per column', async ({ page }) => {
    const ip = await setup(page);
    await ip.addDateColumn();
    await ip.addDateColumn();
    await ip.setParameterValue('Hemoglobin', 0, '13.5');
    await ip.setParameterValue('Hemoglobin', 1, '12.9');
    await ip.setParameterValue('Platelets', 1, '250000');
    expect(await ip.getParameterValue('Hemoglobin', 0)).toBe('13.5');
    expect(await ip.getParameterValue('Hemoglobin', 1)).toBe('12.9');
    expect(await ip.getParameterValue('Platelets', 0)).toBe('');
    expect(await ip.getParameterValue('Platelets', 1)).toBe('250000');
  });

  test('INV-15 navigateAway() switches to Step 3', async ({ page }) => {
    const ip = await setup(page);
    await ip.navigateAway();
    await expect(page.locator('#pmh')).toBeVisible();
    await expect(page.locator('#inv')).toBeHidden();
  });

  test('INV-16 returnToInvestigation() returns to Step 2 with values preserved', async ({ page }) => {
    const ip = await setup(page);
    await ip.addDateColumn();
    await ip.setParameterValue('WBC Count', 0, '7200');
    await ip.navigateAway();
    await ip.returnToInvestigation();
    await expect(page.locator('#inv')).toBeVisible();
    expect(await ip.getParameterValue('WBC Count', 0)).toBe('7200');
  });
});
