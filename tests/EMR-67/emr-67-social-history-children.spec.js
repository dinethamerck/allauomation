// tests/EMR-67/emr-67-social-history-children.spec.js
// EMR-67: Social History - "No. of Children" inputs must accept only non-negative whole numbers.
// Test case specification: tests/EMR-67/EMR-67_TEST_CASES.md
//
// Aligned with the implemented system behaviour on QA (https://qa_pg.amerck.care, 2026-11-03):
//  - only digit keys are accepted; ".", ",", "-", "e", "+" are blocked; leading zeros are dropped
//  - pasted values keep only the whole-number part; negatives are clamped to 0; no error is shown
// Clinically questionable outcomes (e.g. "1.5" -> 15) pass but carry a 'clinical-risk' annotation.
// Known defects (no backend validation, first-edit data loss) are marked test.fail().
const { test, expect } = require('@playwright/test');
const { SocialHistoryPage } = require('../../pages/SocialHistoryPage');

const FIELDS = SocialHistoryPage.FIELDS;
const WHOLE_OR_EMPTY = /^\d*$/;
const label = (f) => `${f.group}/${f.gender}`;

/**
 * Records a clinical-risk note on the test (shown in the HTML report) without failing it.
 * Used where the system behaves as designed but the outcome is clinically questionable.
 */
function clinicalRisk(description) {
  test.info().annotations.push({ type: 'clinical-risk', description });
}

// All tests share one draft admission. playwright.config.js runs one worker (sequential), and the
// draft's form data is restored after every test, so a failure never leaks into the next test.
// QA pages take ~10s to load, so allow 2 minutes per test.
test.describe.configure({ mode: 'default', timeout: 120 * 1000 });

const CHILDREN_KEYS = [
  'dependentChildrenMale', 'dependentChildrenFemale', 'dependentChildrenCount',
  'independentChildrenMale', 'independentChildrenFemale', 'independentChildrenCount',
];

/**
 * Baseline = the draft's form data with every children field empty.
 * Written before the first test and restored after every test, so each test starts clean.
 */
let snapshot = null;

test.describe('EMR-67 Social History - No. of Children whole-number validation', () => {
  /** @type {SocialHistoryPage} */
  let sh;

  test.beforeEach(async ({ page }, testInfo) => {
    sh = new SocialHistoryPage(page);
    // OBS-01 behaves like a fast user: it types as soon as the form is visible, before the saved data loads.
    const fastUser = testInfo.title.includes('OBS-01');
    await sh.goto({ waitForData: !fastUser });
    if (!snapshot) {
      const current = await sh.apiGetForm();
      snapshot = { ...current, data: { ...current.data, ...Object.fromEntries(CHILDREN_KEYS.map((k) => [k, ''])) } };
    }
    const now = (await sh.apiGetForm()).data;
    if (CHILDREN_KEYS.some((k) => (now[k] ?? '') !== '')) {
      expect((await sh.apiPutForm(snapshot.data, snapshot)).ok(), 'reset draft to clean baseline').toBe(true);
      await sh.reloadAndReopen();
    }
    // Warm up autosave with a throwaway edit (not for OBS-01, which must type before data loads).
    if (!fastUser) await sh.primeAutosave();
  });

  test.afterEach(async ({ page }) => {
    // Close the page first so a pending (debounced) autosave cannot overwrite the restore.
    await page.waitForTimeout(1500);
    await page.close();
    if (snapshot && sh?.api.auth) {
      const res = await sh.apiPutForm(snapshot.data, snapshot);
      expect(res.ok(), 'restore draft form data').toBe(true);
    }
  });

  // ===========================================================================
  // A. Rendering & field configuration
  // ===========================================================================
  test.describe('A. Rendering', () => {
    test('EMR67-TC-01 all four children count fields are displayed under "No. of Children"', async ({ page }) => {
      await expect(sh.childrenHeading).toBeVisible();
      await expect(page.getByText('Dependent Children', { exact: true })).toBeVisible();
      await expect(page.getByText('Independent Children', { exact: true })).toBeVisible();
      for (const f of FIELDS) {
        await expect(sh.childrenInput(f.group, f.gender), label(f)).toBeVisible();
        await expect(sh.childrenInput(f.group, f.gender), label(f)).toBeEditable();
      }
    });

    test('EMR67-TC-02 every children field is a numeric input with minimum 0', async () => {
      for (const f of FIELDS) {
        const input = sh.childrenInput(f.group, f.gender);
        await expect(input, label(f)).toHaveAttribute('type', 'number');
        await expect(input, label(f)).toHaveAttribute('min', '0');
      }
    });
  });

  // ===========================================================================
  // B. Valid input (positive cases)
  // ===========================================================================
  test.describe('B. Valid whole numbers', () => {
    test('EMR67-TC-03 accepts 0 (boundary minimum) in every field', async () => {
      for (const f of FIELDS) {
        await sh.typeChildren(f.group, f.gender, '0');
        expect(await sh.getChildren(f.group, f.gender), label(f)).toBe('0');
        expect((await sh.getValidity(f.group, f.gender)).valid, label(f)).toBe(true);
      }
    });

    for (const value of ['1', '2', '3', '12']) {
      test(`EMR67-TC-04 accepts whole number ${value} in every field`, async () => {
        for (const f of FIELDS) {
          await sh.typeChildren(f.group, f.gender, value);
          expect(await sh.getChildren(f.group, f.gender), label(f)).toBe(value);
          expect((await sh.getValidity(f.group, f.gender)).valid, label(f)).toBe(true);
        }
      });
    }

    test('EMR67-TC-05 ArrowUp/ArrowDown step by 1 and never go below 0', async () => {
      const input = sh.childrenInput('Dependent', 'Male');
      await sh.typeChildren('Dependent', 'Male', '0');
      await input.press('ArrowDown');
      expect(await input.inputValue()).toBe('0');
      await input.press('ArrowUp');
      await input.press('ArrowUp');
      expect(await input.inputValue()).toBe('2');
      await input.press('ArrowDown');
      expect(await input.inputValue()).toBe('1');
    });
  });

  // ===========================================================================
  // C. Decimal input - system blocks the decimal separator (core of EMR-67)
  //    System rule: only digit keys are accepted; ".", "," are swallowed.
  // ===========================================================================
  test.describe('C. Decimal values are blocked in the UI', () => {
    for (const f of FIELDS) {
      test(`EMR67-TC-06 typing "1.5" - the "." is blocked, field holds digits only (${label(f)})`, async () => {
        await sh.typeChildren(f.group, f.gender, '1.5');
        const v = await sh.getChildren(f.group, f.gender);
        expect(v, 'no decimal separator in the field').not.toMatch(/[.,]/);
        expect(v).toBe('15');
        clinicalRisk('"1.5" typed becomes 15 children with no warning');
      });
    }

    test('EMR67-TC-07 typing "0.5" / ".5" - the "." is blocked, only digits remain', async () => {
      await sh.typeChildren('Dependent', 'Female', '0.5');
      expect(await sh.getChildren('Dependent', 'Female')).toBe('5');
      await sh.typeChildren('Dependent', 'Female', '.5');
      expect(await sh.getChildren('Dependent', 'Female')).toBe('5');
      clinicalRisk('"0.5" typed becomes 5 children with no warning');
    });

    test('EMR67-TC-08 pasting a decimal keeps only the whole-number part', async () => {
      for (const [pasted, expected] of [['2.75', '2'], ['0.5', '0'], ['2.0', '2'], ['1.5', '1']]) {
        await sh.typeChildren('Independent', 'Male', '');
        await sh.pasteChildren('Independent', 'Male', pasted);
        expect(await sh.getChildren('Independent', 'Male'), `pasted "${pasted}"`).toBe(expected);
      }
    });

    test('EMR67-TC-09 typing "2.0" - the "." is blocked and the whole number 20 is saved', async () => {
      const saved = await sh.enterAndCaptureSave([['Independent', 'Female', '2.0']]);
      expect(saved, 'autosave sent').not.toBeNull();
      expect(String(saved.independentChildrenFemale)).toBe('20');
      clinicalRisk('"2.0" typed is saved as 20 children with no warning');
    });

    test('EMR67-TC-10 comma decimal "1,5" - the "," is blocked, field holds digits only', async () => {
      await sh.typeChildren('Dependent', 'Male', '1,5');
      expect(await sh.getChildren('Dependent', 'Male')).toBe('15');
      clinicalRisk('"1,5" (comma-decimal keyboards) becomes 15 children with no warning');
    });

    test('EMR67-TC-10b no validation message is shown when a separator is blocked', async () => {
      await sh.typeChildren('Dependent', 'Male', '1.5');
      const errors = (await sh.validationErrors.allInnerTexts()).filter((t) => t.trim());
      expect(errors, 'system design: silent blocking, no inline error').toEqual([]);
    });
  });

  // ===========================================================================
  // D. Negative & non-numeric input (AC-3: minimum 0)
  // ===========================================================================
  test.describe('D. Negative and non-numeric input', () => {
    test('EMR67-TC-11 typing "-1" - the "-" is blocked in every field', async () => {
      for (const f of FIELDS) {
        await sh.typeChildren(f.group, f.gender, '-1');
        expect(await sh.getChildren(f.group, f.gender), label(f)).toBe('1');
      }
    });

    test('EMR67-TC-12 pasting a negative value is clamped to 0', async () => {
      await sh.pasteChildren('Independent', 'Male', '-3');
      expect(await sh.getChildren('Independent', 'Male')).toBe('0');
    });

    test('EMR67-TC-13 scientific notation is blocked (typed "1e2" -> 12, pasted "1e2" -> 1)', async () => {
      await sh.typeChildren('Dependent', 'Male', '1e2');
      expect(await sh.getChildren('Dependent', 'Male')).toBe('12');
      await sh.typeChildren('Dependent', 'Male', '');
      await sh.pasteChildren('Dependent', 'Male', '1e2');
      expect(await sh.getChildren('Dependent', 'Male')).toBe('1');
    });

    test('EMR67-TC-14 letters and symbols are ignored ("abc+#" -> empty, "+2" -> 2)', async () => {
      await sh.typeChildren('Dependent', 'Female', 'abc+#');
      expect(await sh.getChildren('Dependent', 'Female')).toBe('');
      await sh.typeChildren('Dependent', 'Female', '+2');
      expect(await sh.getChildren('Dependent', 'Female')).toBe('2');
    });

    test('EMR67-TC-14b leading zeros are normalised ("007" -> 7)', async () => {
      await sh.typeChildren('Independent', 'Female', '007');
      expect(await sh.getChildren('Independent', 'Female')).toBe('7');
    });
  });

  // ===========================================================================
  // E. Save & persistence (AC-4: invalid values cannot be saved)
  // ===========================================================================
  test.describe('E. Save and persistence', () => {
    test('EMR67-TC-15 valid whole numbers are saved exactly and persist after reload', async () => {
      const values = { 'Dependent/Male': '2', 'Dependent/Female': '1', 'Independent/Male': '0', 'Independent/Female': '3' };
      const saved = await sh.enterAndCaptureSave(FIELDS.map((f) => [f.group, f.gender, values[label(f)]]));
      expect(saved).not.toBeNull();
      for (const f of FIELDS) expect(String(saved[f.key]), f.key).toBe(values[label(f)]);
      const server = (await sh.apiGetForm()).data;
      for (const f of FIELDS) expect(String(server[f.key] ?? ''), `server ${f.key}`).toBe(values[label(f)]);

      await sh.reloadAndReopen();
      for (const f of FIELDS) expect(await sh.getChildren(f.group, f.gender), label(f)).toBe(values[label(f)]);
    });

    test('EMR67-TC-16 totals equal Male + Female for each group', async () => {
      const saved = await sh.enterAndCaptureSave([
        ['Dependent', 'Male', '2'], ['Dependent', 'Female', '3'],
        ['Independent', 'Male', '1'], ['Independent', 'Female', '0'],
      ]);
      expect(saved).not.toBeNull();
      expect(String(saved.dependentChildrenCount)).toBe('5');
      expect(String(saved.independentChildrenCount)).toBe('1');
    });

    test('EMR67-TC-17 a decimal is never saved from the UI (payload and after reload)', async () => {
      const saved = await sh.enterAndCaptureSave([['Dependent', 'Male', '1.5'], ['Dependent', 'Female', '2.7']]);
      expect(saved, 'autosave sent').not.toBeNull();
      expect(String(saved.dependentChildrenMale)).toBe('15');
      expect(String(saved.dependentChildrenFemale)).toBe('27');
      await sh.reloadAndReopen();
      expect(await sh.getChildren('Dependent', 'Male'), 'after reload').toBe('15');
      expect(await sh.getChildren('Dependent', 'Female'), 'after reload').toBe('27');
    });

    test('EMR67-TC-18 the saved total always equals the saved breakdown', async () => {
      const saved = await sh.enterAndCaptureSave([['Dependent', 'Male', '1.5'], ['Dependent', 'Female', '2.7']]);
      expect(saved, 'autosave sent').not.toBeNull();
      const sum = Number(saved.dependentChildrenMale || 0) + Number(saved.dependentChildrenFemale || 0);
      expect(Number(saved.dependentChildrenCount)).toBe(sum);
    });

    test('EMR67-TC-19 a count can be cleared (field is optional) and stays cleared after reload', async () => {
      const first = await sh.enterAndCaptureSave([['Independent', 'Male', '2']]);
      expect(String(first?.independentChildrenMale)).toBe('2');
      await sh.typeChildren('Independent', 'Male', '');
      await sh.page.keyboard.press('Tab');
      await sh.page.waitForTimeout(3000);
      await sh.reloadAndReopen();
      expect(await sh.getChildren('Independent', 'Male')).toBe('');
    });
  });

  // ===========================================================================
  // F. Admission Summary (what the doctor signs off)
  // ===========================================================================
  test.describe('F. Admission Summary', () => {
    test('EMR67-TC-20 summary shows the entered whole numbers', async () => {
      await sh.typeChildren('Dependent', 'Male', '2');
      await sh.typeChildren('Dependent', 'Female', '1');
      await sh.openSummary();
      expect(await sh.getSummaryChildrenText('Dependent')).toBe('3 (Male: 2, Female: 1)');
    });

    test('EMR67-TC-21 summary shows exactly what is in the field', async () => {
      await sh.typeChildren('Dependent', 'Male', '2');
      await sh.typeChildren('Dependent', 'Female', '1.5');
      const entered = await sh.getChildren('Dependent', 'Female');
      await sh.openSummary();
      expect(await sh.getSummaryChildrenText('Dependent')).toBe(`${2 + Number(entered)} (Male: 2, Female: ${entered})`);
    });
  });

  // ===========================================================================
  // G. Backend validation (AC-5) - KNOWN DEFECT on QA: the API accepts anything (200).
  //    Marked test.fail(): passes while the defect exists; Playwright flags it as
  //    "unexpectedly passed" once the backend validates - then remove test.fail().
  // ===========================================================================
  test.describe('G. Backend validation', () => {
    const invalid = [
      ['decimal string "1.5"', '1.5'],
      ['decimal number 2.5', 2.5],
      ['negative "-1"', '-1'],
      ['non-numeric "abc"', 'abc'],
    ];

    for (const f of FIELDS) {
      test(`EMR67-TC-22 API rejects a decimal for ${f.key}`, async () => {
        test.fail(true, 'KNOWN DEFECT EMR-67-b: backend has no validation (AC-5 not met)');
        const res = await sh.apiPutForm({ ...snapshot.data, [f.key]: '1.5' }, snapshot);
        expect(res.status(), `PUT ${f.key}="1.5" should be rejected (4xx)`).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
      });
    }

    for (const [name, value] of invalid) {
      test(`EMR67-TC-23 API rejects ${name} and does not store it`, async () => {
        test.fail(true, 'KNOWN DEFECT EMR-67-b: backend has no validation (AC-5 not met)');
        const res = await sh.apiPutForm({ ...snapshot.data, dependentChildrenMale: value }, snapshot);
        expect(res.status(), 'should be rejected (4xx)').toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
        const stored = (await sh.apiGetForm()).data.dependentChildrenMale;
        expect(String(stored ?? '')).toMatch(WHOLE_OR_EMPTY);
      });
    }

    test('EMR67-TC-24 API accepts a valid whole number', async () => {
      const res = await sh.apiPutForm({ ...snapshot.data, dependentChildrenMale: '3', dependentChildrenCount: '3' }, snapshot);
      expect(res.status()).toBe(200);
      expect(String((await sh.apiGetForm()).data.dependentChildrenMale)).toBe('3');
    });
  });

  // ===========================================================================
  // H. Regression - rest of Social History unaffected
  // ===========================================================================
  test.describe('H. Regression', () => {
    test('EMR67-TC-25 Occupation still accepts free text and saves', async () => {
      const mark = sh.markSave();
      await sh.typeOccupation('Paddy farmer');
      await sh.typeChildren('Dependent', 'Male', '1');
      const saved = await sh.waitForSave(mark);
      expect(saved).not.toBeNull();
      expect(saved.occupation).toBe('Paddy farmer');
      expect(String(saved.dependentChildrenMale)).toBe('1');
    });

    test('EMR67-TC-26 Continue moves to Step 9 (Drug History) with valid counts', async ({ page }) => {
      await sh.typeChildren('Dependent', 'Male', '1');
      await sh.continueButton.click();
      await expect(page).toHaveURL(/step=8/);
      await expect(sh.childrenHeading).toBeHidden();
    });
  });

  // ===========================================================================
  // I. Additional finding (outside EMR-67 scope - raise as a separate ticket)
  // ===========================================================================
  test.describe('I. Additional findings', () => {
    test('EMR67-OBS-01 a value typed while the form is still loading is saved', async () => {
      test.fail(true, 'KNOWN DEFECT: input typed before saved data finishes loading is shown but never saved (data loss)');
      // Repro: open draft -> Social History -> type a count immediately (form looks empty, data still
      // loading) -> value stays on screen, but no save is sent -> Continue -> value is not on the server.
      await sh.typeChildren('Dependent', 'Female', '3');
      await sh.page.waitForTimeout(3000);
      expect(await sh.getChildren('Dependent', 'Female'), 'value is shown on screen').toBe('3');
      await sh.continueButton.click();
      await sh.page.waitForTimeout(5000);
      expect(String((await sh.apiGetForm()).data.dependentChildrenFemale ?? ''), 'value saved on server').toBe('3');
    });
  });
});
