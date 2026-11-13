// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { StocksPage } = require('./pages/StocksPage');

/**
 * EMR-209 Automated Test Suite:
 * Batch Transaction History – running "Balance" column after "Change".
 * Path: Product -> Stocks -> By Product -> select product -> batch "History".
 *
 * Rules (see EMR_209_TEST_CASES.md §1.2):
 *  R1 A "Balance" column sits immediately after "Change".
 *  R2 Each row shows the stock balance AFTER that transaction.
 *  R3 Balance(row) = Balance(previous, older row) + Change(row); first row = its own change.
 *  R4 Newest row's balance = the batch's current Available stock.
 *  R5 Balance updates on Stock Added / Removed / Adjusted.
 *
 * Read-only except TC-020 (+1 then -1 manual adjustment, net zero). Skip it with EMR209_READONLY=1.
 */

const WRITE_BATCH = { product: 'Acnechio anti acne body spray 100ml', batch: 'B-1789710766674-126' }; // high stock, many rows
const CHAIN_BATCHES = [
  { product: 'Allegra 180 mg', batch: 'IMP-483285-193' },
  WRITE_BATCH,
];

test.describe('EMR-209: Batch History running Balance', () => {
  /** @type {StocksPage} */ let stocks;
  /** @type {Record<string,string>|null} */ let headers = null;
  /** @type {string|null} */ let apiBase = null;

  test.beforeEach(async ({ page }) => {
    page.on('request', (req) => {
      const h = req.headers();
      if (!headers && h.authorization && req.url().includes('/aesthetic/')) {
        headers = { authorization: h.authorization };
        apiBase = new URL(req.url()).origin;
      }
    });
    const login = new LoginPage(page);
    await login.goto();
    await login.login(process.env.QA_USERNAME || 'parami', process.env.QA_PASSWORD || 'parami');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 25000 });
    stocks = new StocksPage(page);
    await stocks.goto();
    await stocks.openByProductTab();
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const historyDialog = (page) => page.locator('[role="dialog"]').filter({ hasText: 'Batch Transaction History' });

  /** Expands a product and pages through its batch table until the batch row is visible. */
  async function findBatchRow(page, product, batch) {
    const term = product.split(' ')[0];
    if ((await stocks.productSearchInput.inputValue()) !== term) {
      // Typing re-fetches the product list (debounced); expanding before it settles gets collapsed by the re-render
      const searched = page.waitForResponse((r) => /\/aesthetic\/products\?/.test(r.url()) && r.url().includes(encodeURIComponent(term)), { timeout: 15000 }).catch(() => null);
      await stocks.productSearchInput.fill(term);
      await searched;
    }
    await expect(page.getByText(product, { exact: true }).first()).toBeVisible({ timeout: 15000 });
    // The expanded product's batch table (5 per page) with its own Prev/Next + "Page X of Y"
    const table = page.locator('div.mt-2').filter({ has: page.locator('table') }).filter({ has: page.getByRole('button', { name: /History/ }) }).first();
    // Clicking the product row TOGGLES it – only click when it is collapsed; retry if a re-render collapses it
    for (let attempt = 0; attempt < 3; attempt++) {
      if (await table.getByRole('button', { name: /History/ }).first().isVisible().catch(() => false)) break;
      await page.getByText(product, { exact: true }).first().click();
      if (await table.getByRole('button', { name: /History/ }).first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) break;
    }
    await expect(table.getByRole('button', { name: /History/ }).first()).toBeVisible({ timeout: 15000 });
    const pageLabel = table.getByText(/Page \d+ of \d+/);
    for (let i = 0; i < 15; i++) {
      const row = table.locator('tr', { hasText: batch }).first();
      if (await row.count()) return row;
      const next = table.getByRole('button', { name: /Next/ });
      if (!(await next.count()) || !(await next.isEnabled())) break;
      const before = (await pageLabel.count()) ? await pageLabel.innerText() : '';
      await next.click();
      if (before) await expect(pageLabel).not.toHaveText(before, { timeout: 10000 });
      await expect(table.getByRole('button', { name: /History/ }).first()).toBeVisible({ timeout: 10000 });
    }
    const row = table.locator('tr', { hasText: batch }).first();
    await expect(row, `batch ${batch} row`).toBeVisible();
    return row;
  }

  /** Opens History for a batch; returns { headers, rows, api } where rows are cell texts. */
  async function openHistory(page, product, batch) {
    const row = await findBatchRow(page, product, batch);
    const availText = (await row.locator('td').nth(2).innerText()).trim(); // "83 / 100"
    const respP = page.waitForResponse((r) => /\/aesthetic\/batches\/\d+\/transactions/.test(r.url()), { timeout: 15000 });
    await row.getByRole('button', { name: /History/ }).click();
    const resp = await respP;
    const api = (await resp.json())?.payload || [];
    const dlg = historyDialog(page);
    await expect(dlg).toBeVisible();
    await expect(dlg.getByText('Loading history...')).toHaveCount(0, { timeout: 15000 });
    const headerCells = (await dlg.locator('thead th').allInnerTexts()).map((s) => s.trim());
    const rows = await dlg.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((c) => c.innerText.trim())));
    return { headerCells, rows, api, available: Number(availText.split('/')[0].trim()), batchId: Number(resp.url().match(/batches\/(\d+)/)[1]) };
  }

  const num = (s) => (s === '-' || s === '' ? 0 : Number(String(s).replace(/[+,]/g, '')));

  async function apiGet(page, p) {
    const r = await page.request.get(`${apiBase}${p}`, { headers: headers || {} });
    expect(r.status(), p).toBe(200);
    return (await r.json())?.payload;
  }

  // ===========================================================================
  // Part 1: Column & display
  // ===========================================================================
  test('TC-001: "Balance" column is immediately after "Change" (R1)', async ({ page }) => {
    const { headerCells } = await openHistory(page, CHAIN_BATCHES[0].product, CHAIN_BATCHES[0].batch);
    const iChange = headerCells.indexOf('Change');
    expect(iChange, `headers: ${headerCells.join(' | ')}`).toBeGreaterThan(-1);
    expect(headerCells[iChange + 1]).toBe('Balance');
  });

  test('TC-002: every row shows a numeric balance (R2)', async ({ page }) => {
    const { headerCells, rows } = await openHistory(page, CHAIN_BATCHES[0].product, CHAIN_BATCHES[0].batch);
    const iBal = headerCells.indexOf('Balance');
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r[iBal], `row: ${r.join(' | ')}`).toMatch(/^-?\d[\d,]*$/);
  });

  test('TC-003: empty history shows "No transactions found." across all columns', async ({ page }) => {
    // Allermine 4mg has batches with no transactions (verified 2026-11-05)
    const row = await findBatchRow(page, 'Allermine 4mg', 'B-1790592857773-006');
    await row.getByRole('button', { name: /History/ }).click();
    const dlg = historyDialog(page);
    await expect(dlg.getByText('No transactions found.')).toBeVisible({ timeout: 15000 });
    const colCount = await dlg.locator('thead th').count();
    const span = await dlg.locator('tbody td').first().getAttribute('colspan');
    expect(Number(span), 'empty-state cell must span every column incl. Balance').toBe(colCount);
  });

  // ===========================================================================
  // Part 2: Running balance correctness
  // ===========================================================================
  for (const b of CHAIN_BATCHES) {
    test(`TC-004: running balance chain is consistent – ${b.product} / ${b.batch} (R3)`, async ({ page }) => {
      const { headerCells, rows } = await openHistory(page, b.product, b.batch);
      const iCh = headerCells.indexOf('Change');
      const iBal = headerCells.indexOf('Balance');
      // Rows are newest first: balance[i] must equal balance[i+1] + change[i]
      const breaks = [];
      for (let i = 0; i < rows.length - 1; i++) {
        const expected = num(rows[i + 1][iBal]) + num(rows[i][iCh]);
        if (num(rows[i][iBal]) !== expected) breaks.push(`row ${i + 1} (${rows[i][0]} ${rows[i][2]} ${rows[i][iCh]}): shows ${rows[i][iBal]}, expected ${expected}`);
      }
      const oldest = rows[rows.length - 1];
      if (num(oldest[iBal]) !== num(oldest[iCh])) breaks.push(`oldest row: balance ${oldest[iBal]} should equal its change ${oldest[iCh]} (starts from 0)`);
      expect(breaks).toEqual([]);
    });
  }

  test('TC-005: newest balance equals the batch Available stock (R4)', async ({ page }) => {
    for (const b of CHAIN_BATCHES) {
      await test.step(b.batch, async () => {
        await page.goto('/admin/aesthetic-settings/products/batches', { waitUntil: 'domcontentloaded' });
        await stocks.openByProductTab();
        const { headerCells, rows, available } = await openHistory(page, b.product, b.batch);
        const top = num(rows[0][headerCells.indexOf('Balance')]);
        expect(top, `${b.batch}: top balance vs Available column`).toBe(available);
      });
      await page.keyboard.press('Escape');
    }
  });

  test('TC-006: UI balance matches API balanceAfter for every row', async ({ page }) => {
    const { headerCells, rows, api } = await openHistory(page, WRITE_BATCH.product, WRITE_BATCH.batch);
    const iBal = headerCells.indexOf('Balance');
    expect(rows.length).toBe(api.length);
    const diffs = rows.map((r, i) => ({ i, ui: num(r[iBal]), api: Number(api[i].balanceAfter) })).filter((d) => d.ui !== d.api);
    expect(diffs).toEqual([]);
  });

  test('TC-007: "Purchase" rows (change 0) keep the balance unchanged', async ({ page }) => {
    const { headerCells, rows } = await openHistory(page, WRITE_BATCH.product, WRITE_BATCH.batch);
    const iType = headerCells.indexOf('Type');
    const iCh = headerCells.indexOf('Change');
    const iBal = headerCells.indexOf('Balance');
    const purchases = rows.map((r, i) => ({ r, i })).filter(({ r }) => /purchase/i.test(r[iType]));
    test.skip(purchases.length === 0, 'No purchase rows on this batch');
    for (const { r, i } of purchases) {
      expect(r[iCh]).toBe('-');
      if (i + 1 < rows.length) expect(num(r[iBal]), `purchase row ${i + 1}`).toBe(num(rows[i + 1][iBal]));
    }
  });

  test('TC-008: system sweep – balanceAfter recomputes from changes for every batch (API)', async ({ page }) => {
    test.setTimeout(240000);
    await expect.poll(() => !!headers, { timeout: 10000 }).toBe(true);
    const prod = await apiGet(page, '/aesthetic/products?page=1&limit=15');
    const products = prod?.products || [];
    const problems = [];
    let checked = 0;
    for (const p of products) {
      const batches = (await apiGet(page, `/aesthetic/products/${p.id}/batches?limit=100`))?.batches || [];
      for (const b of batches) {
        const tx = (await apiGet(page, `/aesthetic/batches/${b.id}/transactions`)) || [];
        if (!tx.length) continue;
        checked++;
        if (tx.some((t) => t.balanceAfter === undefined || t.balanceAfter === null)) { problems.push(`${b.batchNumber} (id ${b.id}): missing balanceAfter`); continue; }
        const asc = [...tx].sort((x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime() || x.id - y.id);
        let run = 0;
        for (const t of asc) {
          run += Number(t.change || 0);
          if (run !== Number(t.balanceAfter)) { problems.push(`${b.batchNumber} (id ${b.id}) tx ${t.id}: balanceAfter ${t.balanceAfter}, expected ${run}`); break; }
          if (run < 0) { problems.push(`${b.batchNumber} (id ${b.id}) tx ${t.id}: negative balance ${run}`); break; }
        }
        if (run !== Number(b.quantityAvailable)) problems.push(`${b.batchNumber} (id ${b.id}): last balance ${run} != available ${b.quantityAvailable}`);
      }
    }
    expect(checked, 'batches with history checked').toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });

  // ===========================================================================
  // Part 3: Break points / known issues
  // ===========================================================================
  test('TC-009: no adjustment is dated before the batch was received (BP-1)', async ({ page }) => {
    test.info().annotations.push({ type: 'defect', description: 'DF-1: Acnechio B-1789710766674-126 received 2026-09-18 has Manual Deduct -10 dated 2026-08-12; balance by business date goes to -10' });
    test.fail(true, 'Known defect EMR-209/DF-1: adjustment date has no lower bound');
    const { api } = await openHistory(page, WRITE_BATCH.product, WRITE_BATCH.batch);
    const first = [...api].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    const receivedOn = new Date(first.createdAt).toISOString().slice(0, 10);
    const early = api.filter((t) => t.transactionDate && t.transactionDate.slice(0, 10) < receivedOn)
      .map((t) => `${t.type} ${t.change} dated ${t.transactionDate.slice(0, 10)} (batch received ${receivedOn})`);
    expect(early).toEqual([]);
  });

  test('TC-010: Adjust dialog date cannot be before the batch added date (BP-1)', async ({ page }) => {
    test.fail(true, 'Known defect EMR-209/DF-1: date input has max=today but no min');
    const row = await findBatchRow(page, WRITE_BATCH.product, WRITE_BATCH.batch);
    await row.getByRole('button', { name: /Adjust/ }).click();
    const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Manual Stock Adjustment' });
    await expect(dlg).toBeVisible();
    const date = dlg.locator('input[type="date"]');
    expect(await date.getAttribute('max'), 'max = today').toBeTruthy();
    expect(await date.getAttribute('min'), 'min must be the batch added date').toBeTruthy();
  });

  test('TC-011: initial import row has a meaningful type, not "Unknown" (BP-2)', async ({ page }) => {
    test.info().annotations.push({ type: 'defect', description: 'DF-2: CSV import rows have type null and show "Unknown"' });
    test.fail(true, 'Known defect EMR-209/DF-2: import transactions have no type');
    const { headerCells, rows } = await openHistory(page, CHAIN_BATCHES[0].product, CHAIN_BATCHES[0].batch);
    const types = rows.map((r) => r[headerCells.indexOf('Type')]);
    expect(types).not.toContain('Unknown');
  });

  test('TC-012: duplicate refund rows are visible in the balance (cross-check EMR-208 DF-3)', async ({ page }) => {
    test.info().annotations.push({ type: 'defect', description: 'EMR-208 DF-3: Allegra IMP-483285-193 shows two identical +4 auto-cancel refunds (balance 8 → 12 → 16)' });
    test.fail(true, 'Known defect EMR-208/DF-3: duplicate refund rows inflate the balance');
    const { api } = await openHistory(page, CHAIN_BATCHES[0].product, CHAIN_BATCHES[0].batch);
    const sig = api.filter((t) => t.type === 'invoice_refund').map((t) => `${t.change}|${t.metadata?.invoiceRef}|${t.createdAt}`);
    const dupes = sig.filter((s, i) => sig.indexOf(s) !== i);
    expect(dupes).toEqual([]);
  });

  // ===========================================================================
  // Part 4: Live update (WRITES: +1 then -1, net zero)
  // ===========================================================================
  test('TC-020: balance updates after Stock Added and Stock Removed (R5)', async ({ page }) => {
    test.skip(process.env.EMR209_READONLY === '1', 'Read-only mode');
    test.setTimeout(120000);

    async function adjust(action, qty, reason) {
      const row = await findBatchRow(page, WRITE_BATCH.product, WRITE_BATCH.batch);
      await row.getByRole('button', { name: /Adjust/ }).click();
      const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Manual Stock Adjustment' });
      await expect(dlg).toBeVisible();
      await dlg.locator(`#${action}`).click();
      await dlg.locator('input[type="number"]').fill(String(qty));
      await dlg.locator('textarea').fill(reason);
      const respP = page.waitForResponse((r) => /\/adjust$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', { timeout: 15000 });
      await dlg.getByRole('button', { name: /Submit Adjustment/ }).click();
      expect((await respP).status()).toBeLessThan(400);
      await expect(dlg).toBeHidden({ timeout: 10000 });
    }

    async function topRow() {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await stocks.openByProductTab();
      const h = await openHistory(page, WRITE_BATCH.product, WRITE_BATCH.batch);
      const iCh = h.headerCells.indexOf('Change');
      const iBal = h.headerCells.indexOf('Balance');
      const res = { type: h.rows[0][h.headerCells.indexOf('Type')], change: h.rows[0][iCh], balance: num(h.rows[0][iBal]), prevBalance: num(h.rows[1]?.[iBal] ?? 0), available: h.available, count: h.rows.length };
      await page.keyboard.press('Escape');
      return res;
    }

    const before = await topRow();

    await adjust('add', 1, 'EMR-209 QA automated test (+1, reverted next)');
    const afterAdd = await topRow();
    expect(afterAdd.count).toBe(before.count + 1);
    expect(afterAdd.type).toMatch(/manual add/i);
    expect(afterAdd.change).toBe('+1');
    expect(afterAdd.balance).toBe(before.balance + 1);
    expect(afterAdd.prevBalance).toBe(before.balance);
    expect(afterAdd.available).toBe(afterAdd.balance);

    await adjust('deduct', 1, 'EMR-209 QA automated test (revert of +1)');
    const afterDeduct = await topRow();
    expect(afterDeduct.type).toMatch(/manual deduct/i);
    expect(afterDeduct.change).toBe('-1');
    expect(afterDeduct.balance).toBe(before.balance);
    expect(afterDeduct.available).toBe(before.balance);
  });
});
