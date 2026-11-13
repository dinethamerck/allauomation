// tests-unit/MedicationTaperPage.spec.js
const { test, expect } = require('@playwright/test');
const { MedicationTaperPage } = require('../pages/MedicationTaperPage');
const { mockApp } = require('./helpers/mockApp');

/** /admin/account with a Preferences tab and the taper switch (persists via /api/editProfileData). */
const ACCOUNT_HTML = (checked = false) => `
  <h1>Account Management</h1>
  <div class="tabs"><button id="t-profile">Profile</button><button id="t-prefs">Preferences</button></div>
  <section id="prefs" class="hidden">
    <button role="switch" aria-checked="false">Dark mode</button>
    <label>Tapering Prescriptions</label>
    <button role="switch" id="taper" aria-checked="${checked}">Taper</button>
  </section>
  <script>
    document.getElementById('t-prefs').onclick = () => document.getElementById('prefs').classList.remove('hidden');
    const sw = document.getElementById('taper');
    sw.onclick = async () => {
      const next = sw.getAttribute('aria-checked') !== 'true';
      await fetch('/api/editProfileData', { method: 'POST', body: JSON.stringify({ taper: next }) });
      sw.setAttribute('aria-checked', String(next));
    };
  </script>`;

const MED_TABLE = `
  <section id="meds">
    <table><thead><tr><th>Generic/Brand</th><th>Dosage</th><th>Duration</th></tr></thead>
      <tbody id="rows"></tbody></table>
    <button>Add Medication</button><button id="clear">Clear All</button>
    <button>Use Preset</button><button>Save</button>
  </section>`;

/** /admin/prescription (Care View). Patient search reveals the medication table. */
const CARE_HTML = ({ patientSelected = false, confirmClear = true, withClear = true } = {}) => `
  <input placeholder="Search by name, NIC or mobile number" id="search">
  <ul id="options"></ul>
  <h2 id="nopatient" class="${patientSelected ? 'hidden' : ''}">No patient selected</h2>
  <div id="patient" class="${patientSelected ? '' : 'hidden'}">
    <div style="height:1500px">Dilumi Abeysekara</div>
    ${MED_TABLE}
  </div>
  <div role="alertdialog" id="confirm" class="hidden"><p>Clear all medications?</p><button id="yes">Yes, clear</button></div>
  <script>
    window.__searched = null;
    const rows = document.getElementById('rows');
    function addRow(stage) {
      const tr = document.createElement('tr');
      tr.innerHTML = stage === 1
        ? '<td><input placeholder="Generic name"><input placeholder="e.g. 500mg"><input placeholder="e.g. BID">' +
          '<input placeholder="Oral"><input placeholder="5 days">' +
          '<button aria-label="Add taper step for stage 1">+</button></td>'
        : '<td><input aria-label="Stage 2 medicine"><input aria-label="Stage 2 dosage">' +
          '<button aria-label="Remove taper stage 2">x</button></td>';
      if (stage === 1) tr.querySelector('button').onclick = () => addRow(2);
      else tr.querySelector('button').onclick = () => tr.remove();
      rows.appendChild(tr);
    }
    addRow(1);
    const search = document.getElementById('search');
    search.oninput = () => {
      window.__searched = search.value;
      document.getElementById('options').innerHTML = '<li role="option">Dilumi Abeysekara - 0764981884</li>';
      document.querySelector('[role=option]').onclick = () => {
        document.getElementById('nopatient').classList.add('hidden');
        document.getElementById('patient').classList.remove('hidden');
      };
    };
    const clear = document.getElementById('clear');
    if (!${withClear}) clear.remove();
    clear.onclick = () => {
      if (${confirmClear}) document.getElementById('confirm').classList.remove('hidden');
      else rows.innerHTML = '';
    };
    document.getElementById('yes').onclick = () => { rows.innerHTML = ''; document.getElementById('confirm').classList.add('hidden'); };
  </script>`;

const PRESETS_HTML = '<h1>Drug Cabinet</h1><nav><a href="#">Presets</a></nav><button>New Preset</button>';

test.describe('MedicationTaperPage', () => {
  test('MT-01 gotoPreferences() opens the Preferences tab and shows the taper setting', async ({ page }) => {
    await mockApp(page, { '/admin/account': ACCOUNT_HTML() });
    const mt = new MedicationTaperPage(page);
    await mt.gotoPreferences();
    expect(new URL(page.url()).pathname).toBe('/admin/account');
    await expect(mt.taperLabel).toBeVisible();
    await expect(mt.taperSwitch).toHaveAttribute('id', 'taper');
  });

  test('MT-02 setTaperPreference(true) turns the switch on and persists it', async ({ page }) => {
    const api = await mockApp(page, { '/admin/account': ACCOUNT_HTML(false) });
    const mt = new MedicationTaperPage(page);
    await mt.setTaperPreference(true);
    await expect(mt.taperSwitch).toHaveAttribute('aria-checked', 'true');
    expect(api.filter((u) => u.includes('editProfileData'))).toHaveLength(1);
  });

  test('MT-03 setTaperPreference(false) turns the switch off', async ({ page }) => {
    await mockApp(page, { '/admin/account': ACCOUNT_HTML(true) });
    const mt = new MedicationTaperPage(page);
    await mt.setTaperPreference(false);
    await expect(mt.taperSwitch).toHaveAttribute('aria-checked', 'false');
  });

  test('MT-04 setTaperPreference() does not click when already in the target state', async ({ page }) => {
    const api = await mockApp(page, { '/admin/account': ACCOUNT_HTML(true) });
    const mt = new MedicationTaperPage(page);
    await mt.setTaperPreference(true);
    await expect(mt.taperSwitch).toHaveAttribute('aria-checked', 'true');
    expect(api).toHaveLength(0);
  });

  test('MT-05 gotoCareView() searches and selects the test patient when none is selected', async ({ page }) => {
    await mockApp(page, { '/admin/prescription': CARE_HTML({ patientSelected: false }) });
    const mt = new MedicationTaperPage(page);
    await mt.gotoCareView();
    expect(await page.evaluate(() => window.__searched)).toBe('0764981884');
    await expect(mt.noPatientHeading).toBeHidden();
    await expect(mt.medicationHeader).toBeInViewport();
  });

  test('MT-06 gotoCareView() skips the search when a patient is already selected', async ({ page }) => {
    await mockApp(page, { '/admin/prescription': CARE_HTML({ patientSelected: true }) });
    const mt = new MedicationTaperPage(page);
    await mt.gotoCareView();
    expect(await page.evaluate(() => window.__searched)).toBeNull();
    await expect(mt.medicationHeader).toBeVisible();
    await expect(mt.genericNameInput).toBeVisible();
  });

  test('MT-07 resetMedications() clears rows after confirming', async ({ page }) => {
    await mockApp(page, { '/admin/prescription': CARE_HTML({ patientSelected: true, confirmClear: true }) });
    const mt = new MedicationTaperPage(page);
    await mt.gotoCareView();
    await mt.resetMedications();
    await expect(page.locator('#rows tr')).toHaveCount(0);
    await expect(page.locator('#confirm')).toBeHidden();
  });

  test('MT-08 resetMedications() clears rows when no confirm dialog appears', async ({ page }) => {
    await mockApp(page, { '/admin/prescription': CARE_HTML({ patientSelected: true, confirmClear: false }) });
    const mt = new MedicationTaperPage(page);
    await mt.gotoCareView();
    await mt.resetMedications();
    await expect(page.locator('#rows tr')).toHaveCount(0);
  });

  test('MT-09 resetMedications() is a no-op when "Clear All" is absent', async ({ page }) => {
    await mockApp(page, { '/admin/prescription': CARE_HTML({ patientSelected: true, withClear: false }) });
    const mt = new MedicationTaperPage(page);
    await mt.gotoCareView();
    await mt.resetMedications();
    await expect(page.locator('#rows tr')).toHaveCount(1);
  });

  test('MT-10 clickPlusOnStage() adds a Stage 2 taper sub-row', async ({ page }) => {
    await mockApp(page, { '/admin/prescription': CARE_HTML({ patientSelected: true }) });
    const mt = new MedicationTaperPage(page);
    await mt.gotoCareView();
    await expect(mt.taperRemoveButtons).toHaveCount(0);
    await mt.clickPlusOnStage();
    await expect(mt.taperRemoveButtons).toHaveCount(1);
    await expect(mt.subRowGenericInput).toBeVisible();
    await expect(mt.subRowDosageInput).toBeVisible();
  });

  test('MT-11 clickPlusOnStage(1) can add multiple sub-rows', async ({ page }) => {
    await mockApp(page, { '/admin/prescription': CARE_HTML({ patientSelected: true }) });
    const mt = new MedicationTaperPage(page);
    await mt.gotoCareView();
    await mt.clickPlusOnStage(1);
    await mt.clickPlusOnStage(1);
    await expect(mt.subRowIndicators.filter({ hasText: 'x' })).toHaveCount(2);
  });

  test('MT-12 gotoPresets() opens the Drug Cabinet presets page', async ({ page }) => {
    await mockApp(page, { '/admin/drugs/presets': PRESETS_HTML });
    const mt = new MedicationTaperPage(page);
    await mt.gotoPresets();
    expect(new URL(page.url()).pathname).toBe('/admin/drugs/presets');
    await expect(mt.newPresetBtn).toBeVisible();
    await expect(mt.presetsNav).toBeVisible();
  });
});
