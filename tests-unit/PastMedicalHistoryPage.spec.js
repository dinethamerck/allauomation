// tests-unit/PastMedicalHistoryPage.spec.js
const { test, expect } = require('@playwright/test');
const { PastMedicalHistoryPage } = require('../pages/PastMedicalHistoryPage');
const { mockApp } = require('./helpers/mockApp');

const PILLS = (labels) => labels.map((l) => `<span class="pill">${l}</span>`).join('');

/** Step 3 panel. `covidFirst` swaps the CKD/COVID order; `hideCovid` hides the COVID card. */
const PMH_PANEL = ({ covidFirst = false, hideCovid = false } = {}) => {
  const ckd = `<div class="card" id="ckd"><div>Chronic Kidney Disease (CKD)</div><div>${PILLS(['I', 'II', 'III', 'IV', 'V'])}</div></div>`;
  const covid = `
    <div class="card ${hideCovid ? 'hidden' : ''}" id="covid"><div>COVID 19</div>
      <input placeholder="When">
      <div>Vaccinated?
        <label><input type="radio" name="vacc" value="Yes">Yes</label>
        <label><input type="radio" name="vacc" value="No">No</label>
      </div>
      <div id="summary" class="hidden"><p>VACCINATION DETAILS</p><ul id="summary-list"></ul><button id="edit">Edit</button></div>
    </div>`;
  return `
    <section id="pmh" class="hidden">
      <h2>Past Medical History</h2>
      <div class="card" id="diabetes"><div>Diabetes</div><div>${PILLS(['I', 'II'])}<button id="other" data-state="closed" aria-expanded="false">Other</button></div></div>
      ${covidFirst ? covid + ckd : ckd + covid}
    </section>
    <div role="dialog" id="vacc-modal" class="hidden">
      <h3>COVID-19 Vaccination Details</h3>
      <div id="dose-rows"></div>
      <button id="add-dose">Add</button><button id="cancel">Cancel</button><button id="ok">OK</button>
    </div>`;
};

const SCRIPT = `
  <script>
    window.__vaccines = [];
    document.querySelectorAll('.pill').forEach(p => p.onclick = () => p.classList.toggle('bg-blue-500'));
    const other = document.getElementById('other');
    other.onclick = () => {
      const open = other.dataset.state !== 'open';
      other.dataset.state = open ? 'open' : 'closed';
      other.setAttribute('aria-expanded', String(open));
    };
    const modal = document.getElementById('vacc-modal');
    const rows = document.getElementById('dose-rows');
    function addDoseRow(dose = '', name = '') {
      const r = document.createElement('div');
      r.innerHTML = '<input placeholder="e.g. 1st Dose"><input placeholder="e.g. Pfizer">';
      r.children[0].value = dose; r.children[1].value = name;
      rows.appendChild(r);
    }
    function openModal() {
      rows.innerHTML = '';
      (window.__vaccines.length ? window.__vaccines : [{ dose: '', name: '' }]).forEach(v => addDoseRow(v.dose, v.name));
      modal.classList.remove('hidden');
    }
    document.querySelector('input[value=Yes]').onchange = openModal;
    document.querySelector('input[value=No]').onchange = () => {
      window.__vaccines = [];
      document.getElementById('summary').classList.add('hidden');
    };
    document.getElementById('edit').onclick = openModal;
    document.getElementById('add-dose').onclick = () => addDoseRow();
    document.getElementById('cancel').onclick = () => modal.classList.add('hidden');
    document.getElementById('ok').onclick = () => {
      window.__vaccines = [...rows.children].map(r => ({ dose: r.children[0].value, name: r.children[1].value }));
      document.getElementById('summary-list').innerHTML = window.__vaccines.map(v => '<li>' + v.dose + ' - ' + v.name + '</li>').join('');
      document.getElementById('summary').classList.remove('hidden');
      modal.classList.add('hidden');
    };
  </script>`;

const ADMISSIONS_HTML = (opts) => `
  <h1>Admissions</h1>
  <a id="draft" href="#">Draft</a>
  <div id="wizard" class="hidden">
    <nav><button>1. Presenting Complaint</button><button id="pmh-tab">3. Past Medical History</button><button>8. Drug History</button></nav>
    ${PMH_PANEL(opts)}
  </div>
  <script>
    document.getElementById('draft').onclick = () => document.getElementById('wizard').classList.remove('hidden');
    document.getElementById('pmh-tab').onclick = () => document.getElementById('pmh').classList.remove('hidden');
  </script>
  ${SCRIPT}`;

/** Fixture where no draft exists, so goto() must use the Admit Patient search flow. */
const ADMISSIONS_NO_DRAFT_HTML = `
  <h1>Admissions</h1>
  <button id="admit">Admit Patient</button><div id="drafts"></div>
  <div role="dialog" id="admit-dialog" class="hidden"><input name="query"><button id="search">Search</button><div id="results"></div></div>
  <div id="wizard" class="hidden">
    <nav><button id="pmh-tab">3. Past Medical History</button></nav>
    ${PMH_PANEL()}
  </div>
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
    document.getElementById('pmh-tab').onclick = () => document.getElementById('pmh').classList.remove('hidden');
  </script>
  ${SCRIPT}`;

/**
 * Loads Step 3 directly (bypasses goto() to keep tests fast; goto() has its own tests).
 */
async function open(page, opts) {
  await mockApp(page, { '/admin/admissions': ADMISSIONS_HTML(opts) });
  await page.goto('/admin/admissions');
  await page.click('#draft');
  await page.click('#pmh-tab');
  return new PastMedicalHistoryPage(page);
}

test.describe('PastMedicalHistoryPage', () => {
  test.describe('navigation', () => {
    test('PMH-01 goto() opens an existing draft and lands on Step 3', async ({ page }) => {
      await mockApp(page, { '/admin/admissions': ADMISSIONS_HTML() });
      const pmh = new PastMedicalHistoryPage(page);
      await pmh.goto();
      await expect(page.locator('#pmh')).toBeVisible();
      await expect(pmh.diabetesOptionType1).toBeVisible();
    });

    test('PMH-02 goto() admits the test patient when no draft exists', async ({ page }) => {
      await mockApp(page, { '/admin/admissions': ADMISSIONS_NO_DRAFT_HTML });
      const pmh = new PastMedicalHistoryPage(page);
      await pmh.goto();
      expect(await page.evaluate(() => window.__searched)).toBe('0764981884');
      await expect(page.locator('#pmh')).toBeVisible();
    });
  });

  test.describe('diabetes', () => {
    test('PMH-03 selectDiabetesOption("I") / ("Type I") selects Type I', async ({ page }) => {
      const pmh = await open(page);
      await pmh.selectDiabetesOption('Type I');
      expect(await pmh.isDiabetesOptionSelected('I')).toBe(true);
      expect(await pmh.isDiabetesOptionSelected('Type I')).toBe(true);
      expect(await pmh.isDiabetesOptionSelected('II')).toBe(false);
    });

    test('PMH-04 selectDiabetesOption("II") selects Type II', async ({ page }) => {
      const pmh = await open(page);
      await pmh.selectDiabetesOption('II');
      expect(await pmh.isDiabetesOptionSelected('Type II')).toBe(true);
    });

    test('PMH-05 selectDiabetesOption() is idempotent (does not toggle off)', async ({ page }) => {
      const pmh = await open(page);
      await pmh.selectDiabetesOption('I');
      await pmh.selectDiabetesOption('I');
      expect(await pmh.isDiabetesOptionSelected('I')).toBe(true);
    });

    test('PMH-06 selectDiabetesOption("Other") opens the Other option', async ({ page }) => {
      const pmh = await open(page);
      expect(await pmh.isDiabetesOptionSelected('Other')).toBe(false);
      await pmh.selectDiabetesOption('Other');
      expect(await pmh.isDiabetesOptionSelected('Other')).toBe(true);
      await pmh.selectDiabetesOption('Other');
      expect(await pmh.isDiabetesOptionSelected('Other')).toBe(true);
    });

    test('PMH-07 selectDiabetesOption() ignores unknown types', async ({ page }) => {
      const pmh = await open(page);
      await pmh.selectDiabetesOption('Type III');
      expect(await pmh.isDiabetesOptionSelected('I')).toBe(false);
      expect(await pmh.isDiabetesOptionSelected('II')).toBe(false);
      expect(await pmh.isDiabetesOptionSelected('Other')).toBe(false);
    });
  });

  test.describe('chronic kidney disease', () => {
    for (const [type, alias] of [['I', 'Type I'], ['II', 'Type II'], ['III', 'Type III'], ['IV', 'Type IV'], ['V', 'Type V']]) {
      test(`PMH-08 selectCkdOption("${alias}") selects stage ${type} only`, async ({ page }) => {
        const pmh = await open(page);
        await pmh.selectCkdOption(alias);
        expect(await pmh.isCkdOptionSelected(type)).toBe(true);
        expect(await pmh.isCkdOptionSelected(alias)).toBe(true);
        const others = ['I', 'II', 'III', 'IV', 'V'].filter((t) => t !== type);
        for (const o of others) expect(await pmh.isCkdOptionSelected(o)).toBe(false);
      });
    }

    test('PMH-09 CKD pills are independent of Diabetes pills', async ({ page }) => {
      const pmh = await open(page);
      await pmh.selectCkdOption('I');
      expect(await pmh.isDiabetesOptionSelected('I')).toBe(false);
    });

    test('PMH-10 selectCkdOption() ignores unknown types', async ({ page }) => {
      const pmh = await open(page);
      await pmh.selectCkdOption('VI');
      for (const t of ['I', 'II', 'III', 'IV', 'V']) expect(await pmh.isCkdOptionSelected(t)).toBe(false);
    });

    test('PMH-11 isCkdSectionPlacedBeforeCovid() is true when CKD is above COVID', async ({ page }) => {
      const pmh = await open(page);
      expect(await pmh.isCkdSectionPlacedBeforeCovid()).toBe(true);
    });

    test('PMH-12 isCkdSectionPlacedBeforeCovid() is false when COVID is above CKD', async ({ page }) => {
      const pmh = await open(page, { covidFirst: true });
      expect(await pmh.isCkdSectionPlacedBeforeCovid()).toBe(false);
    });

    test('PMH-13 isCkdSectionPlacedBeforeCovid() is false when a card is not rendered', async ({ page }) => {
      const pmh = await open(page, { hideCovid: true });
      expect(await pmh.isCkdSectionPlacedBeforeCovid()).toBe(false);
    });
  });

  test.describe('COVID-19 and vaccination', () => {
    test('PMH-14 setCovidWhen() / getCovidWhenValue() round-trip', async ({ page }) => {
      const pmh = await open(page);
      await pmh.setCovidWhen('March 2021');
      expect(await pmh.getCovidWhenValue()).toBe('March 2021');
    });

    test('PMH-15 getCovidWhenValue() is empty by default', async ({ page }) => {
      const pmh = await open(page);
      expect(await pmh.getCovidWhenValue()).toBe('');
    });

    test('PMH-16 setCovidVaccinationStatus("Yes") opens the vaccination modal', async ({ page }) => {
      const pmh = await open(page);
      expect(await pmh.isVaccinationModalVisible()).toBe(false);
      await pmh.setCovidVaccinationStatus('Yes');
      expect(await pmh.isVaccinationModalVisible()).toBe(true);
      await expect(page.locator('input[value="Yes"]')).toBeChecked();
    });

    test('PMH-17 setCovidVaccinationStatus("No") selects No without opening the modal', async ({ page }) => {
      const pmh = await open(page);
      await pmh.setCovidVaccinationStatus('No');
      await expect(page.locator('input[value="No"]')).toBeChecked();
      expect(await pmh.isVaccinationModalVisible()).toBe(false);
    });

    test('PMH-18 fillVaccineRow() + confirmVaccinationModal() saves the dose', async ({ page }) => {
      const pmh = await open(page);
      await pmh.setCovidVaccinationStatus('Yes');
      await pmh.fillVaccineRow(0, '1st Dose', 'Pfizer');
      await pmh.confirmVaccinationModal();
      expect(await pmh.isVaccinationModalVisible()).toBe(false);
      await expect(page.getByText('VACCINATION DETAILS', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => window.__vaccines)).toEqual([{ dose: '1st Dose', name: 'Pfizer' }]);
    });

    test('PMH-19 clickAddDoseRow() adds another dose row', async ({ page }) => {
      const pmh = await open(page);
      await pmh.setCovidVaccinationStatus('Yes');
      await expect(pmh.doseInputs).toHaveCount(1);
      await pmh.clickAddDoseRow();
      await expect(pmh.doseInputs).toHaveCount(2);
      await pmh.fillVaccineRow(0, '1st Dose', 'Pfizer');
      await pmh.fillVaccineRow(1, '2nd Dose', 'Moderna');
      await pmh.confirmVaccinationModal();
      expect(await page.evaluate(() => window.__vaccines)).toEqual([
        { dose: '1st Dose', name: 'Pfizer' },
        { dose: '2nd Dose', name: 'Moderna' },
      ]);
    });

    test('PMH-20 cancelVaccinationModal() closes without saving', async ({ page }) => {
      const pmh = await open(page);
      await pmh.setCovidVaccinationStatus('Yes');
      await pmh.fillVaccineRow(0, '1st Dose', 'Sinopharm');
      await pmh.cancelVaccinationModal();
      expect(await pmh.isVaccinationModalVisible()).toBe(false);
      expect(await page.evaluate(() => window.__vaccines)).toEqual([]);
      await expect(page.getByText('VACCINATION DETAILS', { exact: true })).toBeHidden();
    });

    test('PMH-21 clickEditVaccinations() reopens the modal with saved doses', async ({ page }) => {
      const pmh = await open(page);
      await pmh.setCovidVaccinationStatus('Yes');
      await pmh.fillVaccineRow(0, '1st Dose', 'AstraZeneca');
      await pmh.confirmVaccinationModal();
      await pmh.clickEditVaccinations();
      expect(await pmh.isVaccinationModalVisible()).toBe(true);
      await expect(pmh.vaccineNameInputs.nth(0)).toHaveValue('AstraZeneca');
    });

    test('PMH-22 setCovidVaccinationStatus("Yes") uses Edit when Yes is already saved', async ({ page }) => {
      const pmh = await open(page);
      await pmh.setCovidVaccinationStatus('Yes');
      await pmh.fillVaccineRow(0, '1st Dose', 'Pfizer');
      await pmh.confirmVaccinationModal();
      await pmh.setCovidVaccinationStatus('Yes');
      expect(await pmh.isVaccinationModalVisible()).toBe(true);
      // Edit path keeps saved doses; the No→Yes path would have cleared them.
      await expect(pmh.vaccineNameInputs.nth(0)).toHaveValue('Pfizer');
    });

    // KNOWN ISSUE: 'text=VACCINATION DETAILS' is a case-insensitive substring match, so it also
    // matches the modal title "COVID-19 Vaccination Details" whenever the modal is in the DOM and
    // fails Playwright's strict mode. Remove test.fail() once the locator is made exact.
    test('PMH-23 vaccinationDetailsText resolves to a single element (known issue)', async ({ page }) => {
      test.fail();
      const pmh = await open(page);
      await pmh.setCovidVaccinationStatus('Yes');
      await pmh.fillVaccineRow(0, '1st Dose', 'Pfizer');
      await pmh.confirmVaccinationModal();
      await expect(pmh.vaccinationDetailsText).toBeVisible();
    });
  });
});
