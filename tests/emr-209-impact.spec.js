// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { AppointmentsPage } = require('./pages/AppointmentsPage');
const { ConsultationInvoicePage } = require('./pages/ConsultationInvoicePage');
const { StocksPage } = require('./pages/StocksPage');

/**
 * EMR-209 Impact Suite: areas affected by the running "Balance" (balanceAfter) change.
 * See EMR_209_IMPACT_TEST_CASES.md.
 *
 * Every screen that WRITES a stock transaction must produce a correct balance, and every
 * screen that READS stock must agree with the latest balance.
 *
 *  - Read-only system sweep (IMP-01..06): first 20 products by default, all with EMR209_FULL=1.
 *  - UI readers (IMP-07, IMP-08).
 *  - IMP-20 writes: draft invoice +1 unit, then deletes the draft (net zero). Skip with EMR209_READONLY=1.
 */

const PRODUCT_LIMIT = process.env.EMR209_FULL === '1' ? 1000 : 20;

async function login(page) {
  /** @type {{headers: Record<string,string>|null, apiBase: string|null}} */
  const auth = { headers: null, apiBase: null };
  page.on('request', (req) => {
    const h = req.headers();
    if (!auth.headers && h.authorization && req.url().includes('/aesthetic/')) {
      auth.headers = { authorization: h.authorization };
      auth.apiBase = new URL(req.url()).origin;
    }
  });
  const lp = new LoginPage(page);
  await lp.goto();
  await lp.login(process.env.QA_USERNAME || 'parami', process.env.QA_PASSWORD || 'parami');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 40000 });
  return auth;
}

function apiClient(page, auth) {
  return async (p) => {
    const r = await page.request.get(`${auth.apiBase}${p}`, { headers: auth.headers || {} });
    expect(r.status(), p).toBe(200);
    return (await r.json())?.payload;
  };
}

// =============================================================================
// Part 1: System-wide read-only consistency (all readers agree with the balance)
// =============================================================================
test.describe('EMR-209 impact: read-only consistency', () => {
  const data = { products: [], batches: [], catalog: new Map(), types: {} };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(900000);
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const auth = await login(page);
    await page.goto('/admin/aesthetic-appointments', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => !!auth.headers, { timeout: 15000 }).toBe(true);
    const get = apiClient(page, auth);

    for (let pg = 1; pg <= 40 && data.products.length < PRODUCT_LIMIT; pg++) {
      const list = (await get(`/aesthetic/products?page=${pg}&limit=50`))?.products || [];
      data.products.push(...list);
      if (list.length < 50) break;
    }
    data.products = data.products.slice(0, PRODUCT_LIMIT);
    for (let pg = 1; pg <= 40; pg++) {
      const p = await get(`/aesthetic/search?query=&page=${pg}&limit=10`);
      const items = Array.isArray(p) ? p : p?.items || [];
      items.filter((i) => i.type === 'product').forEach((i) => data.catalog.set(i.batch_id, Number(i.batch_quantity)));
      if (!p?.hasMore) break;
    }
    for (const p of data.products) {
      const batches = (await get(`/aesthetic/products/${p.id}/batches?limit=100`))?.batches || [];
      for (const b of batches) {
        const tx = (await get(`/aesthetic/batches/${b.id}/transactions`)) || [];
        tx.forEach((t) => { data.types[String(t.type)] = (data.types[String(t.type)] || 0) + 1; });
        data.batches.push({ product: p, batch: b, tx });
      }
    }
    await ctx.close();
  });

  test('IMP-01: latest balance = batch Available for every batch (Stocks / Manage Batches)', async () => {
    const bad = data.batches.filter(({ batch, tx }) => tx.length && Number(tx[0].balanceAfter) !== Number(batch.quantityAvailable))
      .map(({ product, batch, tx }) => `${product.name} / ${batch.batchNumber}: balance ${tx[0].balanceAfter} vs available ${batch.quantityAvailable}`);
    expect(data.batches.length).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });

  test('IMP-02: product Total Stock = sum of its batches (By Product header)', async () => {
    const bad = data.products.map((p) => {
      const sum = data.batches.filter((x) => x.product.id === p.id).reduce((s, x) => s + Number(x.batch.quantityAvailable || 0), 0);
      return Number(p.availableQuantity || 0) !== sum ? `${p.name}: Total Stock ${p.availableQuantity} vs batches ${sum}` : null;
    }).filter(Boolean);
    expect(bad).toEqual([]);
  });

  test('IMP-03: Add Items catalog "Available" = latest balance (EMR-208 screen)', async () => {
    const bad = data.batches.filter(({ batch, tx }) => tx.length && data.catalog.has(batch.id) && data.catalog.get(batch.id) !== Number(tx[0].balanceAfter))
      .map(({ product, batch, tx }) => `${product.name} / ${batch.batchNumber}: catalog ${data.catalog.get(batch.id)} vs balance ${tx[0].balanceAfter}`);
    expect(bad).toEqual([]);
  });

  test('IMP-04: running balance recomputes correctly for every transaction type', async () => {
    const bad = [];
    for (const { product, batch, tx } of data.batches) {
      const asc = [...tx].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id);
      let run = 0;
      for (const t of asc) {
        run += Number(t.change || 0);
        if (t.balanceAfter === undefined || t.balanceAfter === null) { bad.push(`${batch.batchNumber} tx ${t.id} (${t.type}): no balanceAfter`); break; }
        if (run !== Number(t.balanceAfter)) { bad.push(`${product.name} / ${batch.batchNumber} tx ${t.id} (${t.type}): ${t.balanceAfter} vs expected ${run}`); break; }
      }
    }
    expect(bad).toEqual([]);
  });

  test('IMP-05: no negative balance anywhere, and no stock without history', async () => {
    const negative = data.batches.flatMap(({ batch, tx }) => tx.filter((t) => Number(t.balanceAfter) < 0).map((t) => `${batch.batchNumber} tx ${t.id}: ${t.balanceAfter}`));
    const orphan = data.batches.filter(({ batch, tx }) => !tx.length && Number(batch.quantityAvailable) > 0).map(({ product, batch }) => `${product.name} / ${batch.batchNumber}: available ${batch.quantityAvailable}, no history`);
    expect([...negative, ...orphan]).toEqual([]);
  });

  test('IMP-06: every transaction has a type (no "Unknown" rows)', async () => {
    test.info().annotations.push({ type: 'defect', description: `DF-2: rows with type null (CSV import, legacy). Types seen: ${JSON.stringify(data.types)}` });
    test.fail(true, 'Known defect EMR-209/DF-2: legacy import rows have type null');
    expect(data.types['null'] || 0, 'rows with type null').toBe(0);
  });
});

// =============================================================================
// Part 2: UI readers
// =============================================================================
test.describe('EMR-209 impact: UI readers', () => {
  test('IMP-07: By Product – Total Stock equals the sum of batch Available values', async ({ page }) => {
    await login(page);
    const stocks = new StocksPage(page);
    await stocks.goto();
    await stocks.openByProductTab();
    const product = 'Acnechio anti acne body spray 100ml';
    const searched = page.waitForResponse((r) => /\/aesthetic\/products\?/.test(r.url()) && r.url().includes('Acnechio'), { timeout: 15000 }).catch(() => null);
    await stocks.productSearchInput.fill('Acnechio');
    await searched;
    const header = page.locator('div.cursor-pointer', { hasText: product }).first();
    const total = Number(((await header.innerText()).match(/Total Stock:\s*(\d+)/) || [])[1]);

    const table = page.locator('div.mt-2').filter({ has: page.locator('table') }).first();
    for (let i = 0; i < 3 && !(await table.locator('tbody tr').first().isVisible().catch(() => false)); i++) {
      await header.click();
      await table.locator('tbody tr').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    }
    let sum = 0;
    const pageLabel = table.getByText(/Page \d+ of \d+/);
    for (let i = 0; i < 20; i++) {
      const avail = await table.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => tr.querySelectorAll('td')[2]?.innerText || '0'));
      sum += avail.reduce((s, a) => s + Number(a.split('/')[0].trim() || 0), 0);
      const next = table.getByRole('button', { name: /Next/ });
      if (!(await next.count()) || !(await next.isEnabled())) break;
      const before = await pageLabel.innerText();
      await next.click();
      await expect(pageLabel).not.toHaveText(before, { timeout: 10000 });
    }
    expect(sum, `Total Stock ${total} vs sum of batch Available ${sum}`).toBe(total);
  });

  test('IMP-08: By Batch tab – Available matches the batch history balance', async ({ page }) => {
    const auth = await login(page);
    const stocks = new StocksPage(page);
    await stocks.goto();
    await stocks.openByBatchTab();
    await expect.poll(() => !!auth.headers, { timeout: 15000 }).toBe(true);
    const batch = 'B-1789710766674-126';
    const searched = page.waitForResponse((r) => /\/aesthetic\/batches\?/.test(r.url()), { timeout: 15000 }).catch(() => null);
    await stocks.batchSearchInput.fill(batch);
    await searched;
    const row = page.locator('tbody tr', { hasText: batch }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    const cells = await row.locator('td').allInnerTexts();
    const heads = (await page.locator('thead th').allInnerTexts()).map((s) => s.trim().toLowerCase());
    const iAvail = heads.findIndex((h) => h.includes('available'));
    expect(iAvail, `By Batch headers: ${heads.join(' | ')}`).toBeGreaterThan(-1);
    const shown = Number(cells[iAvail].split('/')[0].trim());
    const get = apiClient(page, auth);
    const tx = (await get('/aesthetic/batches/2147/transactions')) || [];
    expect(shown).toBe(Number(tx[0].balanceAfter));
  });
});

// =============================================================================
// Part 3: Writers – invoice flow updates the balance (net zero)
// =============================================================================
test.describe('EMR-209 impact: invoice writes', () => {
  test('IMP-20: draft invoice add 1 → "Invoice Deduct −1"; delete draft → one "Invoice Refund +1"', async ({ browser }) => {
    test.skip(process.env.EMR209_READONLY === '1', 'Read-only mode');
    test.setTimeout(240000);
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const first = await context.newPage();
    const auth = await login(first);
    /** @type {any[]} */ const searchItems = [];
    let invoiceId = null;
    context.on('page', (p) => p.on('response', async (res) => {
      const u = new URL(res.url());
      if (u.pathname.endsWith('/aesthetic/search')) {
        invoiceId = u.searchParams.get('invoice_id') || invoiceId;
        try { const b = await res.json(); const pl = b?.payload; (Array.isArray(pl) ? pl : pl?.items || []).forEach((i) => searchItems.push(i)); } catch {}
      }
    }));

    const appts = new AppointmentsPage(first);
    await appts.goto();
    const popupP = context.waitForEvent('page', { timeout: 6000 }).catch(() => null);
    await first.locator('tbody tr').first().locator('button').first().click();
    const page = (await popupP) || first;
    if (page === first) first.on('response', async (res) => {
      const u = new URL(res.url());
      if (u.pathname.endsWith('/aesthetic/search')) {
        invoiceId = u.searchParams.get('invoice_id') || invoiceId;
        try { const b = await res.json(); const pl = b?.payload; (Array.isArray(pl) ? pl : pl?.items || []).forEach((i) => searchItems.push(i)); } catch {}
      }
    });
    await page.waitForLoadState('domcontentloaded');
    const get = apiClient(first, auth);

    const inv = new ConsultationInvoicePage(page);
    await inv.openInvoicesTab();
    await inv.createNewInvoice();
    try {
      await inv.openAddItemDialog();
      await expect.poll(() => searchItems.length, { timeout: 15000 }).toBeGreaterThan(0);
      const item = searchItems.find((i) => i.type === 'product' && Number(i.batch_quantity) >= 5);
      expect(item, 'a product batch with 5+ units').toBeTruthy();
      const before = (await get(`/aesthetic/batches/${item.batch_id}/transactions`)) || [];
      const startBalance = Number(before[0]?.balanceAfter ?? item.batch_quantity);

      const dialog = page.locator('[role="dialog"]').filter({ hasText: 'Add Items to Invoice' });
      const card = dialog.locator('div.rounded-xl').filter({ has: page.locator('h6', { hasText: item.name }) }).first();
      const saved = page.waitForResponse((r) => /\/aesthetic\/invoices\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'PUT', { timeout: 20000 });
      await card.getByRole('button', { name: 'Add', exact: true }).click();
      await saved;

      await expect.poll(async () => ((await get(`/aesthetic/batches/${item.batch_id}/transactions`)) || []).length, { timeout: 20000 }).toBeGreaterThan(before.length);
      const afterAdd = (await get(`/aesthetic/batches/${item.batch_id}/transactions`)) || [];
      const deduct = afterAdd[0];
      expect(deduct.type).toBe('invoice_deduct');
      expect(Number(deduct.change)).toBe(-1);
      expect(Number(deduct.balanceAfter)).toBe(startBalance - 1);

      // Catalog (EMR-208 screen) reflects the new balance on the next search
      const res = await first.request.get(`${auth.apiBase}/aesthetic/search?query=${encodeURIComponent(item.name.split(' (Batch')[0])}&page=1&limit=10`, { headers: auth.headers || {} });
      const pl = (await res.json())?.payload;
      const again = (Array.isArray(pl) ? pl : pl?.items || []).find((i) => i.batch_id === item.batch_id);
      expect(Number(again?.batch_quantity), 'catalog Available after deduct').toBe(startBalance - 1);
    } finally {
      // Delete the draft (UI confirm button is "Delete") and verify the refund
      if (invoiceId) await first.request.delete(`${auth.apiBase}/aesthetic/invoices/${invoiceId}`, { headers: auth.headers || {} });
    }

    const item = searchItems.find((i) => i.type === 'product' && Number(i.batch_quantity) >= 5);
    await expect.poll(async () => ((await get(`/aesthetic/batches/${item.batch_id}/transactions`)) || [])[0]?.type, { timeout: 20000 }).toBe('invoice_refund');
    const afterDelete = (await get(`/aesthetic/batches/${item.batch_id}/transactions`)) || [];
    const refunds = afterDelete.filter((t) => t.type === 'invoice_refund' && t.metadata?.invoiceId === Number(invoiceId));
    expect(refunds.length, 'exactly one refund row for the deleted draft').toBe(1);
    expect(Number(refunds[0].change)).toBe(1);
    expect(Number(afterDelete[0].balanceAfter), 'balance restored').toBe(Number(item.batch_quantity));
    await context.close();
  });
});
