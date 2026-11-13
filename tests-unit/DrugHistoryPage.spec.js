// tests-unit/DrugHistoryPage.spec.js
const { test, expect } = require('@playwright/test');
const { DrugHistoryPage } = require('../pages/DrugHistoryPage');
const { doc } = require('./helpers/mockApp');

/**
 * Fixture: wizard with a "Drug History" step containing a PrescriptionPad row and
 * a condition-label modal. Selected conditions become badges after "Done".
 */
const DRUG_HISTORY_HTML = (initialBadges = []) => `
  <button id="tab">8. Drug History</button>
  <section id="step8" class="hidden">
    <table><tbody><tr>
      <td>
        <input placeholder="Generic name"><input placeholder="e.g. 500mg"><input placeholder="e.g. BID">
        <input value="PO"><input placeholder="e.g. 5 days">
        <div id="badges"><button id="add">+ Add More</button></div>
      </td>
    </tr></tbody></table>
  </section>

  <div role="dialog" id="modal" class="hidden">
    <h2>Select Past Medical History Labels</h2>
    <button class="opt" aria-pressed="false">Diabetes</button>
    <button class="opt" aria-pressed="false">Hypertension</button>
    <button class="opt" aria-pressed="false">Asthma</button>
    <button id="done">Done</button>
    <button id="close">Close</button>
  </div>

  <script>
    const modal = document.getElementById('modal');
    const badges = document.getElementById('badges');
    function addBadge(label) {
      const d = document.createElement('div');
      d.className = 'badge';
      d.innerHTML = '<span></span><button aria-label="remove">✕</button>';
      d.querySelector('span').textContent = label;
      d.querySelector('button').onclick = () => d.remove();
      badges.insertBefore(d, document.getElementById('add'));
    }
    ${JSON.stringify(initialBadges)}.forEach(addBadge);
    document.getElementById('tab').onclick = () => document.getElementById('step8').classList.remove('hidden');
    document.getElementById('add').onclick = () => modal.classList.remove('hidden');
    document.querySelectorAll('.opt').forEach(b => b.onclick = () =>
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'));
    function reset() { document.querySelectorAll('.opt').forEach(b => b.setAttribute('aria-pressed', 'false')); modal.classList.add('hidden'); }
    document.getElementById('done').onclick = () => {
      document.querySelectorAll('.opt[aria-pressed="true"]').forEach(b => addBadge(b.textContent));
      reset();
    };
    document.getElementById('close').onclick = reset;
  </script>`;

async function setup(page, badges) {
  await page.setContent(doc(DRUG_HISTORY_HTML(badges)));
  const dh = new DrugHistoryPage(page);
  await dh.goto();
  return dh;
}

test.describe('DrugHistoryPage', () => {
  test('DH-01 goto() opens the Drug History step', async ({ page }) => {
    const dh = await setup(page);
    await expect(page.locator('#step8')).toBeVisible();
    for (const el of [dh.drugNameInput, dh.dosageInput, dh.frequencyInput, dh.routeInput, dh.durationInput]) {
      await expect(el).toBeVisible();
    }
  });

  test('DH-02 clickAddLabel() opens the condition modal', async ({ page }) => {
    const dh = await setup(page);
    await dh.clickAddLabel();
    await expect(dh.conditionModal).toBeVisible();
    await expect(dh.modalTitle).toBeVisible();
  });

  test('DH-03 isConditionModalVisible() reflects the modal state', async ({ page }) => {
    const dh = await setup(page);
    expect(await dh.isConditionModalVisible()).toBe(false);
    await dh.clickAddLabel();
    expect(await dh.isConditionModalVisible()).toBe(true);
  });

  test('DH-04 getModalConditionOptions() lists every option button in the modal', async ({ page }) => {
    const dh = await setup(page);
    await dh.clickAddLabel();
    expect(await dh.getModalConditionOptions()).toEqual(['Diabetes', 'Hypertension', 'Asthma', 'Done', 'Close']);
  });

  test('DH-05 selectConditionInModal() toggles only the exact option', async ({ page }) => {
    const dh = await setup(page);
    await dh.clickAddLabel();
    await dh.selectConditionInModal('Hypertension');
    await expect(page.getByRole('button', { name: 'Hypertension' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Diabetes' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('DH-06 clickDone() closes the modal and renders selected labels as badges', async ({ page }) => {
    const dh = await setup(page);
    await dh.clickAddLabel();
    await dh.selectConditionInModal('Diabetes');
    await dh.selectConditionInModal('Asthma');
    await dh.clickDone();
    expect(await dh.isConditionModalVisible()).toBe(false);
    await expect(page.locator('.badge')).toHaveText(['Diabetes✕', 'Asthma✕']);
  });

  test('DH-07 closeModal() closes the modal without adding badges', async ({ page }) => {
    const dh = await setup(page);
    await dh.clickAddLabel();
    await dh.selectConditionInModal('Diabetes');
    await dh.closeModal();
    expect(await dh.isConditionModalVisible()).toBe(false);
    await expect(page.locator('.badge')).toHaveCount(0);
  });

  test('DH-08 getActiveBadges() returns badge texts and excludes "+ Add More"', async ({ page }) => {
    const dh = await setup(page, ['Diabetes', 'Hypertension']);
    const badges = await dh.getActiveBadges();
    expect(badges.some((b) => b.includes('Diabetes'))).toBe(true);
    expect(badges.some((b) => b.includes('Hypertension'))).toBe(true);
    expect(badges.some((b) => b.includes('+ Add More'))).toBe(false);
  });

  test('DH-09 getActiveBadges() returns an empty list when no badges exist', async ({ page }) => {
    const dh = await setup(page);
    expect(await dh.getActiveBadges()).toEqual([]);
  });

  test('DH-10 removeBadge() removes only the named badge', async ({ page }) => {
    const dh = await setup(page, ['Diabetes', 'Hypertension']);
    await dh.removeBadge('Diabetes');
    await expect(page.locator('.badge')).toHaveCount(1);
    await expect(page.locator('.badge')).toContainText('Hypertension');
  });
});
