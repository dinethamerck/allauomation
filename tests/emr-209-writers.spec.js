// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { AppointmentsPage } = require('./pages/AppointmentsPage');
const { ConsultationInvoicePage } = require('./pages/ConsultationInvoicePage');
const { StocksPage } = require('./pages/StocksPage');

/**
 * EMR-209 Writers & Readers Suite
 * ------------------------------------------------------------------
 * The 11 actions that WRITE a stock transaction each produce a correct running balance,
 * and the 8 places that READ stock all agree with the latest balance.
 *
 * SAFETY: every write runs on a DEDICATED test product created by this suite
 * ("QA209X<timestamp>", price LKR 1). Real products are never touched. At the end the
 * suite empties the test batches and tries to delete the products.
 * Invoices: one draft is deleted; one LKR-1 invoice is paid and then refunded
 * (leaves a Refunded LKR-1 invoice on the first appointment, by design).
 *
 * Writers: W1 product create · W2 add batch · W3 CSV import · W4 manual add/deduct ·
 *          W5 remove remaining · W6 draft add/raise qty · W7 lower qty/remove line ·
 *          W8 complete (paid → Purchase) · W9 refund · W10 delete invoice · W11 auto-cancel (read-only)
 * Readers: R1 History · R2 By Product Available · R3 Total Stock · R4 By Batch Available ·
 *          R5 Manage Batches · R6 Add Items catalog · R7 EMR-208 highlight · R8 invoice line max qty
 */

const TS = Date.now();
const TAG = `QA209X${TS}`;
const PRODUCT = `${TAG} Balance Test`;
const CSV_PRODUCT = `${TAG} CSV Import`;
const NEXT_YEAR = `${new Date().getFullYear() + 1}-12-31`;
const LATER = `${new Date().getFullYear() + 2}-12-31`;

test.describe.serial('EMR-209: writers & readers keep the running balance correct', () => {
  test.skip(process.env.EMR209_READONLY === '1', 'Writes test data – skipped in read-only mode');

  /** @type {import('@playwright/test').BrowserContext} */ let context;
  /** @type {import('@playwright/test').Page} */ let page;
  /** @type {Record<string,string>} */ let headers = {};
  let apiBase = '';
  const state = { productId: 0, csvProductId: 0, b1: null, b2: null, csvBatch: null, invoiceIds: [] };

  // ---------------------------------------------------------------- helpers
  const api = {
    get: async (p) => {
      const r = await page.request.get(apiBase + p, { headers });
      expect(r.status(), `GET ${p}`).toBe(200);
      return (await r.json())?.payload;
    },
    post: async (p, data) => page.request.post(apiBase + p, { headers, data }),
    del: async (p) => page.request.delete(apiBase + p, { headers }),
  };
  const tx = async (batchId) => (await api.get(`/aesthetic/batches/${batchId}/transactions`)) || [];
  const batches = async (productId) => (await api.get(`/aesthetic/products/${productId}/batches?limit=100`))?.batches || [];
  const top = async (batchId) => (await tx(batchId))[0];
  const findProduct = async (name) => ((await api.get(`/aesthetic/products?page=1&limit=10&query=${encodeURIComponent(name)}`))?.products || []).find((p) => p.name === name);

  /** Running-balance invariant for one batch: ascending recompute == balanceAfter, last == available. */
  async function expectChain(batchId) {
    const rows = await tx(batchId);
    const asc = [...rows].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id);
    let run = 0;
    for (const t of asc) {
      run += Number(t.change || 0);
      expect(Number(t.balanceAfter), `tx ${t.id} (${t.type} ${t.change})`).toBe(run);
    }
    const b = (await batches(state.productId)).concat(state.csvProductId ? await batches(state.csvProductId) : []).find((x) => x.id === batchId);
    if (b) expect(run, 'last balance = Available').toBe(Number(b.quantityAvailable));
    return run;
  }

  async function adjust(batchId, action, quantity, reason, extra = {}) {
    return api.post(`/aesthetic/batches/${batchId}/adjust`, { action, quantity, reason, ...extra });
  }

  // ------------------------------------------------------------------ setup
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);
    context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();
    page.on('request', (req) => {
      const h = req.headers();
      if (!headers.authorization && h.authorization && req.url().includes('/aesthetic/')) {
        headers = { authorization: h.authorization };
        apiBase = new URL(req.url()).origin;
      }
    });
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(process.env.QA_USERNAME || 'parami', process.env.QA_PASSWORD || 'parami');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 40000 });
    await page.goto('/admin/aesthetic-settings/products/batches', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => !!headers.authorization, { timeout: 15000 }).toBe(true);
  });

  test.afterAll(async () => {
    // Cleanup: delete leftover drafts, empty every test batch, then try to delete the test products.
    for (const id of state.invoiceIds) await api.del(`/aesthetic/invoices/${id}`).catch(() => null);
    for (const pid of [state.productId, state.csvProductId].filter(Boolean)) {
      for (const b of await batches(pid).catch(() => [])) {
        if (Number(b.quantityAvailable) > 0) await adjust(b.id, 'deduct', Number(b.quantityAvailable), `EMR-209 QA cleanup (${TAG})`).catch(() => null);
      }
      const r = await api.del(`/aesthetic/products/${pid}`).catch(() => null);
      console.log(`cleanup product ${pid}: delete status ${r?.status()}`);
    }
    await context?.close();
  });

  // ================================================================ WRITERS
  test('W1: create product with starting quantity 10 → first row +10, balance 10', async () => {
    const r = await api.post('/aesthetic/products', { name: PRODUCT, sku: `${TAG}-A`, price: 1, cost: 1, quantity: 10, expiryDate: NEXT_YEAR, available: true, unit: 'pcs' });
    expect(r.status(), await r.text()).toBeLessThan(400);
    const p = await findProduct(PRODUCT);
    expect(p, 'created product is listed').toBeTruthy();
    state.productId = p.id;
    const bs = await batches(p.id);
    expect(bs.length, 'product create with quantity auto-creates one batch').toBe(1);
    state.b1 = bs[0];
    const rows = await tx(state.b1.id);
    expect(rows.length).toBe(1);
    expect(Number(rows[0].change)).toBe(10);
    expect(Number(rows[0].balanceAfter)).toBe(10);
    test.info().annotations.push({ type: 'observed', description: `W1 transaction type = ${rows[0].type}` });
    expect(rows[0].type, 'first row has a type (not "Unknown")').not.toBeNull();
  });

  test('W2: add batch qty 8 → "Grn +8", balance 8', async () => {
    const r = await api.post(`/aesthetic/products/${state.productId}/batches`, { quantity: 8, unitPrice: 1, expiryDate: LATER, notes: `EMR-209 QA ${TAG}` });
    expect(r.status(), await r.text()).toBeLessThan(400);
    const bs = await batches(state.productId);
    state.b2 = bs.find((b) => b.id !== state.b1.id);
    expect(state.b2, 'second batch exists').toBeTruthy();
    const t = await top(state.b2.id);
    expect(t.type).toBe('grn');
    expect(Number(t.change)).toBe(8);
    expect(Number(t.balanceAfter)).toBe(8);
  });

  test('W3: CSV import qty 12 → first row +12, balance 12, typed "import"', async () => {
    const r = await api.post('/aesthetic/import-products-csv', { products: [{ available: true, name: CSV_PRODUCT, sku: `${TAG}-CSV`, price: 1, cost: 1, quantity: 12, expiryDate: NEXT_YEAR, unit: 'pcs' }] });
    expect(r.status(), await r.text()).toBeLessThan(400);
    const p = await findProduct(CSV_PRODUCT);
    expect(p, 'imported product is listed').toBeTruthy();
    state.csvProductId = p.id;
    const bs = await batches(p.id);
    expect(bs.length).toBe(1);
    state.csvBatch = bs[0];
    const t = await top(state.csvBatch.id);
    expect(Number(t.change)).toBe(12);
    expect(Number(t.balanceAfter)).toBe(12);
  });

  test('W3b: CSV import row has a type (not shown as "Unknown")', async () => {
    test.info().annotations.push({ type: 'defect', description: 'DF-2 reproduced live: /aesthetic/import-products-csv writes the stock row with type null (product create writes "import")' });
    test.fail(true, 'Known defect EMR-209/DF-2: CSV import writes type null');
    const t = await top(state.csvBatch.id);
    expect(t.type).not.toBeNull();
  });

  test('W4: manual Add +3 then Deduct −2 → balances 13, 11', async () => {
    expect((await adjust(state.b1.id, 'add', 3, `EMR-209 QA add ${TAG}`)).status()).toBeLessThan(400);
    let t = await top(state.b1.id);
    expect([t.type, Number(t.change), Number(t.balanceAfter)]).toEqual(['manual_add', 3, 13]);
    expect((await adjust(state.b1.id, 'deduct', 2, `EMR-209 QA deduct ${TAG}`)).status()).toBeLessThan(400);
    t = await top(state.b1.id);
    expect([t.type, Number(t.change), Number(t.balanceAfter)]).toEqual(['manual_deduct', -2, 11]);
    await expectChain(state.b1.id);
  });

  test('W4b: over-deduct (Available + 1) is rejected and writes no row', async () => {
    const before = await tx(state.b1.id);
    const avail = Number(before[0].balanceAfter);
    const r = await adjust(state.b1.id, 'deduct', avail + 1, `EMR-209 QA over-deduct ${TAG}`);
    expect(r.status(), 'server must reject a deduct larger than stock').toBeGreaterThanOrEqual(400);
    const after = await tx(state.b1.id);
    expect(after.length).toBe(before.length);
    expect(Number(after[0].balanceAfter)).toBe(avail);
  });

  test('W4c: adjustment dated before the batch was received is rejected (DF-1)', async () => {
    test.fail(true, 'Known defect EMR-209/DF-1: no lower bound on adjustment date');
    const before = await tx(state.b2.id);
    const r = await adjust(state.b2.id, 'add', 1, `EMR-209 QA backdate ${TAG}`, { date: '2020-01-01', transactionDate: '2020-01-01' });
    const after = await tx(state.b2.id);
    const written = after.length > before.length ? after[0] : null;
    if (written) await adjust(state.b2.id, 'deduct', 1, `EMR-209 QA revert backdate ${TAG}`); // keep stock unchanged
    test.info().annotations.push({ type: 'observed', description: `status ${r.status()}, stored transactionDate ${written?.transactionDate ?? 'n/a'}` });
    // Defect = accepted AND stored with the 2020 date (before the batch existed)
    const acceptedBackdated = r.status() < 400 && !!written && String(written.transactionDate).startsWith('2020-01-01');
    expect(acceptedBackdated, 'backdated adjustment must be rejected').toBe(false);
  });

  // --------------------------------------------------- invoice writers (UI)
  /** @type {import('@playwright/test').Page} */ let inv;
  /** @type {ConsultationInvoicePage} */ let invPage;
  let currentInvoiceId = null;

  async function openNewDraft() {
    if (!inv) {
      const appts = new AppointmentsPage(page);
      await appts.goto();
      const popupP = context.waitForEvent('page', { timeout: 6000 }).catch(() => null);
      await page.locator('tbody tr').first().locator('button').first().click();
      inv = (await popupP) || page;
      inv.on('response', (res) => {
        const u = new URL(res.url());
        if (u.pathname.endsWith('/aesthetic/search') && u.searchParams.get('invoice_id')) currentInvoiceId = Number(u.searchParams.get('invoice_id'));
      });
      await inv.waitForLoadState('domcontentloaded');
      invPage = new ConsultationInvoicePage(inv);
      await invPage.openInvoicesTab();
    }
    currentInvoiceId = null;
    try {
      await invPage.createNewInvoice();
    } catch {
      // Flaky on QA after a delete/refund: reload the consultation page and try once more
      await inv.reload({ waitUntil: 'domcontentloaded' });
      await invPage.openInvoicesTab();
      await invPage.createNewInvoice();
    }
  }

  const addDialog = () => inv.locator('[role="dialog"]').filter({ hasText: 'Add Items to Invoice' });
  const catalogCard = (batchNumber) => addDialog().locator('div.rounded-xl').filter({ hasText: `Batch: ${batchNumber}` }).first();

  /**
   * Search the Add Items catalog safely.
   * Typing before the dialog is ready can leave the text in the box WITHOUT a search being sent,
   * so the full catalog stays listed ("39 items found") and the test batch is not shown.
   * So: wait for the initial list first, wait for OUR search response, and re-type once if needed.
   */
  async function searchCatalog(term, expectBatch) {
    const box = addDialog().locator('input[placeholder*="Search treatments or products"]');
    await expect(box).toBeVisible({ timeout: 10000 });
    await expect(addDialog().getByText(/\d+ items? found/)).toBeVisible({ timeout: 20000 }); // initial list loaded
    await expect(addDialog().getByText('Searching catalog...')).toHaveCount(0, { timeout: 15000 });
    for (let attempt = 0; attempt < 2; attempt++) {
      const resp = inv.waitForResponse((r) => {
        const u = new URL(r.url());
        return u.pathname.endsWith('/aesthetic/search') && u.searchParams.get('query') === term;
      }, { timeout: 15000 }).catch(() => null);
      if (attempt > 0) await box.fill('');
      await box.fill(term);
      await resp;
      if (!expectBatch) return;
      if (await catalogCard(expectBatch).waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)) return;
    }
    await expect(catalogCard(expectBatch), `catalog card for ${expectBatch} after searching "${term}"`).toBeVisible({ timeout: 5000 });
  }

  async function addTestBatch(batchNumber) {
    await invPage.openAddItemDialog();
    await expect.poll(() => currentInvoiceId, { timeout: 15000 }).not.toBeNull();
    if (!state.invoiceIds.includes(currentInvoiceId)) state.invoiceIds.push(currentInvoiceId);
    await searchCatalog(TAG, batchNumber);
    const card = catalogCard(batchNumber);
    await expect(card).toBeVisible({ timeout: 15000 });
    const saved = inv.waitForResponse((r) => /\/aesthetic\/invoices\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'PUT', { timeout: 20000 });
    await card.getByRole('button', { name: 'Add', exact: true }).click();
    await saved;
    return card;
  }

  async function closeAddDialog() {
    if (await addDialog().isVisible().catch(() => false)) await inv.keyboard.press('Escape');
    await expect(addDialog()).toBeHidden({ timeout: 5000 });
  }

  /** Line-item quantity input for the test product on the invoice form. */
  // NOTE: the line has two inputs – UNIT PRICE first, QUANTITY second. Target the one after the "Quantity" label.
  const lineQty = () => inv.locator('div.border.rounded-lg', { hasText: PRODUCT })
    .locator('xpath=.//*[translate(normalize-space(text()),"quantity","QUANTITY")="QUANTITY"]/following::input[1]').first();

  async function setLineQty(n) {
    const saved = inv.waitForResponse((r) => /\/aesthetic\/invoices\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'PUT', { timeout: 20000 });
    await lineQty().fill(String(n));
    await lineQty().blur();
    await saved;
    await inv.waitForTimeout(1500); // autosave + ledger write
  }

  async function waitForTop(batchId, predicate, label) {
    await expect.poll(async () => predicate(await top(batchId)), { timeout: 20000, message: label }).toBe(true);
    return top(batchId);
  }

  test('W6: draft invoice – add 1 then raise qty to 3 → deduct rows, balance 11→10→8', async () => {
    test.setTimeout(180000);
    await openNewDraft();
    const start = Number((await top(state.b1.id)).balanceAfter); // 11
    await addTestBatch(state.b1.batchNumber);
    let t = await waitForTop(state.b1.id, (x) => x.type === 'invoice_deduct' && Number(x.balanceAfter) === start - 1, 'deduct −1 after Add');
    expect(Number(t.change)).toBe(-1);
    await closeAddDialog();
    await setLineQty(3);
    t = await waitForTop(state.b1.id, (x) => Number(x.balanceAfter) === start - 3, 'balance after qty 3');
    expect(t.type).toBe('invoice_deduct');
    await expectChain(state.b1.id);
  });

  test('R8: invoice line qty cannot exceed the batch balance', async () => {
    const balance = Number((await top(state.b1.id)).balanceAfter); // stock left after this draft holds 3
    await lineQty().fill(String(balance + 3 + 50));
    await lineQty().blur();
    await inv.waitForTimeout(2500);
    const shown = Number(await lineQty().inputValue());
    expect(shown, 'line qty clamped to what the batch can supply').toBeLessThanOrEqual(balance + 3);
    await setLineQty(3); // restore
  });

  test('W7: lower qty 3→2 then remove the line → refunds, balance back to start', async () => {
    const holding = Number((await top(state.b1.id)).balanceAfter); // 8
    await setLineQty(2);
    let t = await waitForTop(state.b1.id, (x) => Number(x.balanceAfter) === holding + 1, 'refund +1 after qty 2');
    expect(t.type).toBe('invoice_refund');
    const saved = inv.waitForResponse((r) => /\/aesthetic\/invoices\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'PUT', { timeout: 20000 });
    await inv.locator('div.border.rounded-lg', { hasText: PRODUCT }).locator('button:has(svg.lucide-trash), button:has(svg.lucide-trash-2), button:has(svg.lucide-x)').first().click();
    await saved;
    t = await waitForTop(state.b1.id, (x) => Number(x.balanceAfter) === holding + 3, 'refund after removing line');
    expect(t.type).toBe('invoice_refund');
    await expectChain(state.b1.id);
  });

  test('W8: pay in full (complete) → "Purchase" row, change 0, balance unchanged', async () => {
    test.setTimeout(120000);
    await addTestBatch(state.b1.batchNumber);
    await closeAddDialog();
    const afterAdd = await waitForTop(state.b1.id, (x) => x.type === 'invoice_deduct', 'deduct before payment');
    const bal = Number(afterAdd.balanceAfter);
    await inv.getByRole('button', { name: /Record Payment/ }).click();
    const payDlg = inv.locator('[role="dialog"]').filter({ has: inv.getByRole('button', { name: 'Save payment' }) });
    await expect(payDlg).toBeVisible();
    await payDlg.getByRole('button', { name: 'Save payment' }).click();
    await expect(inv.getByText('Fully Paid').first()).toBeVisible({ timeout: 20000 });
    const t = await waitForTop(state.b1.id, (x) => Number(x.change) === 0, 'purchase row after full payment');
    expect(t.type).toBe('invoice_deduct'); // shown as "Purchase"
    expect(Number(t.balanceAfter), 'purchase does not change balance').toBe(bal);
  });

  test('W9: refund the paid invoice → exactly one "Invoice Refund +1", balance restored', async () => {
    const beforeRows = await tx(state.b1.id);
    const bal = Number(beforeRows[0].balanceAfter);
    const lastId = Math.max(...beforeRows.map((x) => x.id));
    await inv.getByRole('button', { name: /Initiate Refund/ }).click();
    await inv.getByRole('button', { name: 'Confirm Refund' }).click();
    await expect(inv.getByText('Refunded').first()).toBeVisible({ timeout: 20000 });
    await waitForTop(state.b1.id, (x) => x.id > lastId && x.type === 'invoice_refund', 'refund row');
    await inv.waitForTimeout(3000); // catch late duplicate writes
    const refundedId = currentInvoiceId;
    // Only rows written AFTER Confirm Refund (earlier W7 refunds are on the same invoice)
    const rows = (await tx(state.b1.id)).filter((x) => x.id > lastId);
    expect(rows.map((x) => `${x.type} ${x.change}`), 'exactly one refund row for this refund').toEqual(['invoice_refund 1']);
    expect(Number(rows[0].change)).toBe(1);
    expect(Number((await top(state.b1.id)).balanceAfter)).toBe(bal + 1);
    state.invoiceIds = state.invoiceIds.filter((id) => id !== refundedId); // keep refunded invoice (finance record)
    await expectChain(state.b1.id);
  });

  test('W10: delete a draft (Discard → Delete) → exactly one refund, balance restored', async () => {
    test.setTimeout(150000);
    await openNewDraft();
    const start = Number((await top(state.b1.id)).balanceAfter);
    await addTestBatch(state.b1.batchNumber);
    await closeAddDialog();
    await waitForTop(state.b1.id, (x) => Number(x.balanceAfter) === start - 1, 'deduct on draft');
    const draftId = currentInvoiceId;
    await inv.getByRole('button', { name: /Discard/ }).click();
    const del = inv.waitForResponse((r) => r.request().method() === 'DELETE' && /\/aesthetic\/invoices\/\d+$/.test(new URL(r.url()).pathname), { timeout: 15000 });
    await inv.getByRole('button', { name: 'Delete' }).click();
    expect((await del).status()).toBeLessThan(400);
    state.invoiceIds = state.invoiceIds.filter((id) => id !== draftId);
    await waitForTop(state.b1.id, (x) => Number(x.balanceAfter) === start, 'refund after delete');
    await inv.waitForTimeout(3000);
    const refunds = (await tx(state.b1.id)).filter((x) => x.type === 'invoice_refund' && x.metadata?.invoiceId === draftId);
    expect(refunds.length, 'one refund for the deleted draft').toBe(1);
    await expectChain(state.b1.id);
  });

  test('W11: auto-cancel job never refunds more than the draft deducted (read-only, system data)', async () => {
    test.fail(true, 'Known defect EMR-208/DF-3: auto-cancel refunds written twice');
    test.setTimeout(240000);
    const products = (await api.get('/aesthetic/products?page=1&limit=20'))?.products || [];
    const bad = [];
    for (const p of products) {
      for (const b of await batches(p.id)) {
        const rows = await tx(b.id);
        const per = {};
        for (const r of rows) {
          const ref = r.metadata?.invoiceRef; if (!ref) continue;
          per[ref] = per[ref] || { sold: 0, refunded: 0, auto: false };
          if (r.type === 'invoice_deduct') per[ref].sold += -Number(r.change || 0);
          if (r.type === 'invoice_refund') per[ref].refunded += Number(r.change || 0);
          if (/auto-cancelled/i.test(r.notes || '')) per[ref].auto = true;
        }
        Object.entries(per).filter(([, v]) => v.auto && v.refunded > v.sold).forEach(([k, v]) => bad.push(`${b.batchNumber} ${k}: sold ${v.sold}, refunded ${v.refunded}`));
      }
    }
    expect(bad).toEqual([]);
  });

  // ================================================================ READERS
  test('R1–R6: History, By Product, Total Stock, By Batch, Manage Batches and Add Items agree', async () => {
    test.setTimeout(180000);
    const b1 = Number((await top(state.b1.id)).balanceAfter);
    const b2 = Number((await top(state.b2.id)).balanceAfter);
    const expectedTotal = b1 + b2;
    const stocks = new StocksPage(page);

    // R2 + R3 + R1: By Product row, batch Available, History top balance
    await stocks.goto();
    await stocks.openByProductTab();
    await stocks.productSearchInput.fill(TAG);
    const header = page.locator('div.cursor-pointer', { hasText: PRODUCT }).first();
    await expect(header).toBeVisible({ timeout: 15000 });
    await expect(header, 'R3 Total Stock').toContainText(`Total Stock: ${expectedTotal}`);
    await header.click();
    for (const [b, bal] of [[state.b1, b1], [state.b2, b2]]) {
      const row = page.locator('tr', { hasText: b.batchNumber }).first();
      await expect(row).toBeVisible({ timeout: 15000 });
      expect(Number((await row.locator('td').nth(2).innerText()).split('/')[0].trim()), `R2 ${b.batchNumber}`).toBe(bal);
      await row.getByRole('button', { name: /History/ }).click();
      const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Batch Transaction History' });
      await expect(dlg.locator('tbody tr').first()).toBeVisible({ timeout: 15000 });
      await expect(dlg.getByText('Loading history...')).toHaveCount(0, { timeout: 15000 }); // placeholder row is also a <tr>
      const heads = (await dlg.locator('thead th').allInnerTexts()).map((s) => s.trim());
      const first = await dlg.locator('tbody tr').first().locator('td').allInnerTexts();
      expect(Number(first[heads.indexOf('Balance')]), `R1 ${b.batchNumber}`).toBe(bal);
      await page.keyboard.press('Escape');
    }

    // R4: By Batch
    await stocks.openByBatchTab();
    await stocks.batchSearchInput.fill(state.b1.batchNumber);
    const bRow = page.locator('tbody tr', { hasText: state.b1.batchNumber }).first();
    await expect(bRow).toBeVisible({ timeout: 15000 });
    const bHeads = (await page.locator('thead th').allInnerTexts()).map((s) => s.trim().toLowerCase());
    const bCells = await bRow.locator('td').allInnerTexts();
    expect(Number(bCells[bHeads.findIndex((h) => h.includes('available'))].split('/')[0].trim()), 'R4 By Batch').toBe(b1);

    // R5: Manage Batches (same field via the batches API the dialog uses)
    const mb = await batches(state.productId);
    expect(Number(mb.find((x) => x.id === state.b1.id).quantityAvailable), 'R5 Manage Batches').toBe(b1);

    // R6: Add Items catalog
    const res = await page.request.get(`${apiBase}/aesthetic/search?query=${encodeURIComponent(TAG)}&page=1&limit=10`, { headers });
    const pl = (await res.json())?.payload;
    const items = Array.isArray(pl) ? pl : pl?.items || [];
    expect(Number(items.find((i) => i.batch_id === state.b1.id)?.batch_quantity), 'R6 catalog b1').toBe(b1);
    expect(Number(items.find((i) => i.batch_id === state.b2.id)?.batch_quantity), 'R6 catalog b2').toBe(b2);
  });

  test('R6b: Add Items search is not overwritten by a slower initial list response', async () => {
    // Regression guard: the initial (empty) catalog response is delayed 3 s so it lands AFTER the
    // search response. Verified on QA 2026-11-05: the app keeps the search results (handled correctly).
    test.setTimeout(120000);
    await openNewDraft();
    // Make the initial (empty-query) catalog request slow so it always lands AFTER the search
    await inv.route('**/aesthetic/search?**', async (route) => {
      const q = new URL(route.request().url()).searchParams.get('query') || '';
      if (q === '') await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });
    try {
      // The dialog debounces 400 ms before sending the initial (empty) request. Type only AFTER that
      // request has been SENT but before its (delayed) response arrives – the real-user race window.
      const initialSent = inv.waitForRequest((r) => {
        const u = new URL(r.url());
        return u.pathname.endsWith('/aesthetic/search') && (u.searchParams.get('query') || '') === '';
      }, { timeout: 15000 });
      await invPage.btnAddItem.click();
      await initialSent;
      await expect.poll(() => currentInvoiceId, { timeout: 15000 }).not.toBeNull();
      if (!state.invoiceIds.includes(currentInvoiceId)) state.invoiceIds.push(currentInvoiceId);
      await addDialog().locator('input[placeholder*="Search treatments or products"]').fill(TAG);
      await inv.waitForTimeout(5000); // both responses have arrived by now
      await expect(addDialog().locator('input[placeholder*="Search treatments or products"]')).toHaveValue(TAG);
      // Every listed product card must match the search term
      const names = await addDialog().locator('div.rounded-xl h6').allInnerTexts();
      expect(names.length, 'search should list the test product batches').toBeGreaterThan(0);
      expect(names.filter((n) => !n.includes(TAG)), 'cards that do NOT match the search').toEqual([]);
    } finally {
      await inv.unroute('**/aesthetic/search?**');
      await closeAddDialog().catch(() => inv.keyboard.press('Escape'));
    }
  });

  test('W5: remove remaining stock → one row −Available, balance 0, batch hidden in Add Items', async () => {
    test.setTimeout(150000);
    // Before: b1 (first entered, earlier expiry) should be the highlighted batch
    await openNewDraft();
    await invPage.openAddItemDialog();
    await expect.poll(() => currentInvoiceId, { timeout: 15000 }).not.toBeNull();
    if (!state.invoiceIds.includes(currentInvoiceId)) state.invoiceIds.push(currentInvoiceId); // empty draft → deleted in afterAll
    await searchCatalog(TAG, state.b1.batchNumber);
    const card1 = catalogCard(state.b1.batchNumber);
    await expect(card1).toBeVisible({ timeout: 15000 });
    await expect(card1, 'R7: first-entered batch highlighted').toHaveClass(/bg-(amber|yellow)-/);
    await closeAddDialog();

    // W5: remove remaining (same call as Manage Batches → Remove)
    const avail = Number((await top(state.b1.id)).balanceAfter);
    expect((await adjust(state.b1.id, 'deduct', avail, `Removed manually: EMR-209 QA ${TAG}`)).status()).toBeLessThan(400);
    const t = await top(state.b1.id);
    expect([t.type, Number(t.change), Number(t.balanceAfter)]).toEqual(['manual_deduct', -avail, 0]);
    await expectChain(state.b1.id);

    // b1 (0 stock) is hidden, b2 still listed
    await invPage.openAddItemDialog();
    await searchCatalog(TAG, state.b2.batchNumber);
    const card2 = catalogCard(state.b2.batchNumber);
    await expect(card2).toBeVisible({ timeout: 15000 });
    await expect(addDialog().locator('div.rounded-xl').filter({ hasText: `Batch: ${state.b1.batchNumber}` }), 'b1 (0 stock) hidden').toHaveCount(0);
  });

  test('R7: after the first batch is emptied, the highlight moves to the next batch', async () => {
    test.info().annotations.push({ type: 'defect', description: 'EMR-208 DF-2 reproduced live: the only remaining batch of the test product is not highlighted' });
    test.fail(true, 'Known defect EMR-208/DF-2: product with one listed batch gets no highlight');
    const card2 = addDialog().locator('div.rounded-xl').filter({ hasText: `Batch: ${state.b2.batchNumber}` }).first();
    await expect(card2).toBeVisible({ timeout: 15000 });
    await expect(card2, 'highlight moved to next batch').toHaveClass(/bg-(amber|yellow)-/, { timeout: 5000 });
  });
});
