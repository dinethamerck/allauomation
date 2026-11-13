// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { AppointmentsPage } = require('./pages/AppointmentsPage');
const { ConsultationInvoicePage } = require('./pages/ConsultationInvoicePage');

/**
 * EMR-208 Automated Test Suite:
 * Highlight the first batch entered under a product (Schedule -> Invoice -> Add Items)
 *
 * Rules (see EMR_208_TEST_CASES.md §1.2):
 *  R1 Exactly one batch per product is highlighted light yellow.
 *  R2 The highlighted batch is the FIRST ENTERED eligible batch (oldest addedDate, then lowest id).
 *  R3 Batches with available stock 0 are not shown.
 *  R4 If the first-entered batch has 0 stock, the highlight moves to the next eligible batch in entry order.
 *  R5 Treatments (no batch) are never highlighted.
 *
 * Oracle: the batches API GET /aesthetic/products/:id/batches (addedDate, quantityAvailable, expiryDate).
 * The suite creates ONE draft invoice and deletes it via API in afterAll.
 */

const TODAY = new Date();

/** Light-yellow highlight detection: Tailwind class or computed background. */
function isYellowish(cls, bg) {
  if (/\bbg-(amber|yellow)-/.test(cls)) return true;
  const m = (bg || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
  if (!m) return false;
  const [r, g, b, a] = [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  return a > 0 && r >= 240 && g >= 225 && b <= r - 10;
}

/** Split "Product (Batch: B-1)" into product + batch. */
function splitName(full) {
  const m = (full || '').match(/^(.*?)\s*\(Batch:\s*([^)]+)\)\s*$/);
  return m ? { product: m[1].trim(), batch: m[2].trim() } : { product: (full || '').trim(), batch: null };
}

/** Expected highlighted batch per R2/R4 from the batches API (expired batches are not eligible – system behaviour). */
function expectedFirstEligible(batches) {
  const eligible = batches.filter(
    (b) => Number(b.quantityAvailable) > 0 && (!b.expiryDate || new Date(b.expiryDate) >= new Date(TODAY.toDateString())),
  );
  eligible.sort((a, b) => {
    const da = new Date(a.addedDate || a.createdAt).getTime();
    const db = new Date(b.addedDate || b.createdAt).getTime();
    return da - db || a.id - b.id;
  });
  return eligible[0] || null;
}

test.describe.serial('EMR-208: Highlight first available batch in Add Items', () => {
  /** @type {import('@playwright/test').BrowserContext} */ let context;
  /** @type {import('@playwright/test').Page} */ let page;
  /** @type {ConsultationInvoicePage} */ let invoicePage;
  /** @type {Record<string,string>|null} */ let authHeaders = null;
  /** @type {string|null} */ let apiBase = null;
  /** @type {string|null} */ let invoiceId = null;
  /** search responses keyed by query -> page -> items */
  const searchPages = new Map();
  const batchCache = new Map();

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);
    context = await browser.newContext({ ignoreHTTPSErrors: true });
    const first = await context.newPage();

    const capture = (p) => {
      p.on('request', (req) => {
        const h = req.headers();
        if (!authHeaders && h.authorization && req.url().includes('/aesthetic/')) {
          authHeaders = { authorization: h.authorization };
          apiBase = new URL(req.url()).origin;
        }
      });
      p.on('response', async (res) => {
        const url = new URL(res.url());
        if (!url.pathname.endsWith('/aesthetic/search')) return;
        try {
          const body = await res.json();
          const payload = body?.payload;
          const items = Array.isArray(payload) ? payload : payload?.items || [];
          const q = url.searchParams.get('query') || '';
          const pg = Number(url.searchParams.get('page') || 1);
          invoiceId = url.searchParams.get('invoice_id') || invoiceId;
          if (!searchPages.has(q)) searchPages.set(q, new Map());
          searchPages.get(q).set(pg, items);
        } catch { /* ignore */ }
      });
    };
    capture(first);
    context.on('page', capture);

    const login = new LoginPage(first);
    await login.goto();
    await login.login(process.env.QA_USERNAME || 'parami', process.env.QA_PASSWORD || 'parami');
    await first.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 25000 });

    const appts = new AppointmentsPage(first);
    await appts.goto();
    const popupP = context.waitForEvent('page', { timeout: 6000 }).catch(() => null);
    await first.locator('tbody tr').first().locator('button').first().click();
    page = (await popupP) || first;
    await page.waitForLoadState('domcontentloaded');

    invoicePage = new ConsultationInvoicePage(page);
    await invoicePage.openInvoicesTab();
    await invoicePage.createNewInvoice();
    await openCatalog();
  });

  test.afterAll(async () => {
    // Clean up the draft invoice created by this suite (UI confirm button is "Delete").
    if (invoiceId && apiBase && authHeaders) {
      await page.request.delete(`${apiBase}/aesthetic/invoices/${invoiceId}`, { headers: authHeaders }).catch(() => null);
    }
    await context?.close();
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const dialog = () => page.locator('[role="dialog"]').filter({ hasText: 'Add Items to Invoice' });
  const searchInput = () => dialog().locator('input[placeholder*="Search treatments or products"]');

  async function openCatalog() {
    if (await dialog().isVisible().catch(() => false)) return;
    await invoicePage.btnAddItem.click();
    await expect(searchInput()).toBeVisible({ timeout: 10000 });
    await waitForCatalog('');
  }

  async function waitForCatalog(query) {
    await expect.poll(() => searchPages.get(query)?.has(1) ?? false, { timeout: 15000 }).toBe(true);
    await expect(dialog().getByText('Searching catalog...')).toHaveCount(0, { timeout: 10000 });
    await page.waitForTimeout(300);
  }

  async function search(query) {
    searchPages.delete(query);
    await searchInput().fill(query);
    await waitForCatalog(query);
  }

  /** Reads every catalog card currently rendered. */
  async function readCards() {
    const cards = dialog()
      .locator('div.rounded-xl')
      .filter({ has: page.locator('h6') })
      .filter({ has: page.getByRole('button', { name: 'Add', exact: true }) });
    const n = await cards.count();
    const out = [];
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i);
      const info = await card.evaluate((el) => ({
        cls: el.className,
        bg: getComputedStyle(el).backgroundColor,
        name: el.querySelector('h6')?.textContent?.trim() || '',
        text: el.innerText,
        isProduct: !!el.querySelector('svg.lucide-shopping-bag'),
      }));
      const { product, batch } = splitName(info.name);
      const avail = info.text.match(/Available:\s*(-?\d+)/);
      out.push({
        index: i,
        fullName: info.name,
        product,
        batch,
        isProduct: info.isProduct || !!batch,
        available: avail ? Number(avail[1]) : null,
        highlighted: isYellowish(info.cls, info.bg),
        cls: info.cls,
        bg: info.bg,
        locator: card,
      });
    }
    return out;
  }

  /** All search items for the current query (all loaded pages, in order). */
  function searchItems(query) {
    const pages = searchPages.get(query);
    if (!pages) return [];
    return [...pages.keys()].sort((a, b) => a - b).flatMap((k) => pages.get(k));
  }

  async function getBatches(productId) {
    if (batchCache.has(productId)) return batchCache.get(productId);
    const res = await page.request.get(`${apiBase}/aesthetic/products/${productId}/batches?limit=100`, { headers: authHeaders || {} });
    expect(res.status(), `batches API for product ${productId}`).toBe(200);
    const batches = (await res.json())?.payload?.batches || [];
    batchCache.set(productId, batches);
    return batches;
  }

  /** Groups product cards by product name, joined with item_id from the search API. */
  async function productGroups(query) {
    const cards = await readCards();
    const items = searchItems(query);
    const groups = new Map();
    for (const c of cards.filter((x) => x.isProduct)) {
      const item = items.find((it) => it.type === 'product' && (it.name || '').trim() === c.fullName);
      if (!groups.has(c.product)) groups.set(c.product, { product: c.product, itemId: item?.item_id, cards: [] });
      const g = groups.get(c.product);
      g.itemId = g.itemId || item?.item_id;
      g.cards.push({ ...c, batchId: item?.batch_id });
    }
    return { cards, groups: [...groups.values()] };
  }

  async function backToFullList() {
    await openCatalog();
    if ((await searchInput().inputValue()) !== '') await search('');
  }

  // ===========================================================================
  // Part 1: Core highlight rules
  // ===========================================================================
  test('TC-001: exactly one highlighted batch per product (R1)', async () => {
    test.info().annotations.push({ type: 'defect', description: 'QA: products with a single listed batch (e.g. Allermine 4mg) have NO highlight' });
    test.fail(true, 'Known defect EMR-208/DF-2: single-batch products are not highlighted');
    await backToFullList();
    const { groups } = await productGroups('');
    expect(groups.length, 'catalog should list products').toBeGreaterThan(0);
    const bad = groups
      .map((g) => ({ product: g.product, highlighted: g.cards.filter((c) => c.highlighted).map((c) => c.batch) }))
      .filter((g) => g.highlighted.length !== 1);
    expect(bad, `products without exactly one highlight:\n${JSON.stringify(bad, null, 2)}`).toEqual([]);
  });

  test('TC-002: highlighted batch is the FIRST ENTERED eligible batch (R2)', async () => {
    test.info().annotations.push({ type: 'defect', description: 'QA highlights the first row in list order (earliest expiry), not the first-entered batch – e.g. Acnechio highlights B-1792570045786-866 (added 2026-10-21) instead of IMP-483285-193 (added 2026-08-24)' });
    test.fail(true, 'Known defect EMR-208/DF-1: highlight follows expiry/list order, not entry order');
    await backToFullList();
    const { groups } = await productGroups('');
    const mismatches = [];
    for (const g of groups) {
      if (!g.itemId) continue;
      const expected = expectedFirstEligible(await getBatches(g.itemId));
      const actual = g.cards.find((c) => c.highlighted);
      if (!expected) continue;
      if (!actual || actual.batch !== expected.batchNumber) {
        mismatches.push({ product: g.product, expected: `${expected.batchNumber} (added ${expected.addedDate})`, actual: actual?.batch || 'none' });
      }
    }
    expect(mismatches, `wrong highlighted batch:\n${JSON.stringify(mismatches, null, 2)}`).toEqual([]);
  });

  test('TC-003: batches with 0 available stock are not displayed (R3)', async () => {
    await backToFullList();
    const { cards, groups } = await productGroups('');
    const zeroCards = cards.filter((c) => c.isProduct && c.available !== null && c.available <= 0);
    expect(zeroCards.map((c) => c.fullName), 'no card may show Available: 0').toEqual([]);

    // Cross-check with the API: every zero-stock batch of the listed products is absent from the UI
    for (const g of groups.slice(0, 8)) {
      if (!g.itemId) continue;
      const shown = new Set(g.cards.map((c) => c.batch));
      const zeroBatches = (await getBatches(g.itemId)).filter((b) => Number(b.quantityAvailable) <= 0);
      for (const z of zeroBatches) {
        expect(shown.has(z.batchNumber), `${g.product}: zero-stock batch ${z.batchNumber} must be hidden`).toBe(false);
      }
    }
  });

  test('TC-004: highlight moves to next batch when first-entered batch has 0 stock (R4)', async () => {
    await backToFullList();
    const { groups } = await productGroups('');
    let checked = 0;
    for (const g of groups) {
      if (!g.itemId) continue;
      const batches = await getBatches(g.itemId);
      const byEntry = [...batches].sort((a, b) => new Date(a.addedDate || a.createdAt).getTime() - new Date(b.addedDate || b.createdAt).getTime() || a.id - b.id);
      if (!byEntry.length || Number(byEntry[0].quantityAvailable) > 0) continue; // need: very first batch is out of stock
      const expected = expectedFirstEligible(batches);
      if (!expected) continue;
      const actual = g.cards.find((c) => c.highlighted);
      expect(actual?.batch, `${g.product}: first-entered ${byEntry[0].batchNumber} is 0 stock -> expect ${expected.batchNumber}`).toBe(expected.batchNumber);
      checked++;
    }
    test.skip(checked === 0, 'No product on page 1 has a zero-stock first batch; seed data (see TC-004 in doc)');
  });

  test('TC-005: treatments are never highlighted (R5)', async () => {
    await backToFullList();
    const cards = await readCards();
    const treatments = cards.filter((c) => !c.isProduct);
    test.skip(treatments.length === 0, 'No treatments on page 1');
    expect(treatments.filter((c) => c.highlighted).map((c) => c.fullName)).toEqual([]);
  });

  test('TC-006: highlight is light yellow and clearly different from other batches', async () => {
    await backToFullList();
    const cards = await readCards();
    const hl = cards.filter((c) => c.highlighted);
    const normal = cards.filter((c) => c.isProduct && !c.highlighted);
    expect(hl.length).toBeGreaterThan(0);
    for (const c of hl) {
      expect(c.cls, `${c.fullName} should use a light amber/yellow token`).toMatch(/bg-(amber|yellow)-(50|100)/);
      expect(c.bg).not.toBe(normal[0]?.bg);
    }
    for (const c of normal) expect(isYellowish(c.cls, c.bg), `${c.fullName} must NOT look highlighted`).toBe(false);
  });

  // ===========================================================================
  // Part 2: Search, scroll, add
  // ===========================================================================
  test('TC-007: highlight is the same batch when the product is searched', async () => {
    await backToFullList();
    const before = (await productGroups('')).groups.find((g) => g.cards.length > 1);
    test.skip(!before, 'Need a product with 2+ batches');
    const expectedBatch = before.cards.find((c) => c.highlighted)?.batch;

    const term = before.product.split(/\s+/)[0];
    await search(term);
    const after = (await productGroups(term)).groups.find((g) => g.product === before.product);
    expect(after, `${before.product} should appear when searching "${term}"`).toBeTruthy();
    expect(after.cards.filter((c) => c.highlighted).map((c) => c.batch)).toEqual([expectedBatch]);
  });

  test('TC-008: searching by batch number does not move the highlight to a later batch', async () => {
    await backToFullList();
    const g = (await productGroups('')).groups.find((x) => x.cards.length > 1);
    test.skip(!g, 'Need a product with 2+ batches');
    const nonFirst = g.cards.find((c) => !c.highlighted);
    await search(nonFirst.batch);
    const cards = (await readCards()).filter((c) => c.product === g.product);

    if (cards.length === 0) {
      // System behaviour on QA: catalog search matches PRODUCT NAMES only. Any batch-number
      // query (full, partial, IMP-…) returns 0 items, so a later batch can never be shown alone.
      // Verify that behaviour; when batch search is added, the highlight check below runs instead.
      test.info().annotations.push({ type: 'gap', description: 'Catalog search does not match batch numbers (feature gap, not an EMR-208 defect)' });
      expect(searchItems(nonFirst.batch), 'search API returns no items for a batch number').toEqual([]);
      await expect(dialog().getByText(`No items found matching "${nonFirst.batch}"`)).toBeVisible();
      return;
    }

    // Batch search supported: a filtered-in later batch must NOT be shown as "first batch"
    const wronglyHighlighted = cards.filter((c) => c.highlighted && c.batch === nonFirst.batch);
    expect(wronglyHighlighted.map((c) => c.batch), 'a filtered-in later batch must not become highlighted').toEqual([]);
  });

  test('TC-009: Clear search restores the original highlights', async () => {
    await backToFullList();
    const snap = (cards) => cards.filter((c) => c.highlighted).map((c) => c.fullName).sort();
    const before = snap(await readCards());
    await search('Acnechio');
    const clear = dialog().getByRole('button', { name: /Clear/i });
    if (await clear.isVisible().catch(() => false)) {
      searchPages.delete('');
      await clear.click();
      await waitForCatalog('');
    } else {
      await search('');
    }
    expect(snap(await readCards())).toEqual(before);
  });

  test('TC-010: products loaded by infinite scroll are highlighted too', async () => {
    await backToFullList();
    const list = dialog().locator('div.overflow-y-auto').first();
    const before = searchItems('').length;
    await list.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const loaded = await expect.poll(() => searchPages.get('')?.has(2) ?? false, { timeout: 8000 }).toBe(true).then(() => true).catch(() => false);
    test.skip(!loaded, 'Only one catalog page on this environment');
    await page.waitForTimeout(800);
    expect(searchItems('').length).toBeGreaterThan(before);

    const page2Names = new Set(searchPages.get('').get(2).filter((i) => i.type === 'product').map((i) => splitName(i.name).product));
    const { groups } = await productGroups('');
    const page2Groups = groups.filter((g) => page2Names.has(g.product));
    expect(page2Groups.length).toBeGreaterThan(0);
    for (const g of page2Groups) {
      expect(g.cards.filter((c) => c.highlighted).length, `${g.product} (page 2) highlight count`).toBeLessThanOrEqual(1);
    }
    // A product split across the page boundary must not end up with two highlights
    const multi = groups.filter((g) => g.cards.filter((c) => c.highlighted).length > 1);
    expect(multi.map((g) => g.product)).toEqual([]);
  });

  test('TC-011: adding the highlighted batch keeps one highlight and shows "Added"', async () => {
    await backToFullList();
    const g = (await productGroups('')).groups.find((x) => x.cards.some((c) => c.highlighted && (c.available || 0) > 1));
    test.skip(!g, 'Need a highlighted batch with 2+ units');
    const hl = g.cards.find((c) => c.highlighted);
    await hl.locator.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(hl.locator.getByText(/Added \(1\)/)).toBeVisible({ timeout: 5000 });

    const after = (await productGroups('')).groups.find((x) => x.product === g.product);
    const nowHl = after.cards.filter((c) => c.highlighted);
    expect(nowHl.map((c) => c.batch), 'highlight stays on the same batch while it still has stock').toEqual([hl.batch]);
    expect(nowHl[0].available).toBe((hl.available || 0) - 1);

    // Right column shows the added batch
    await expect(dialog().getByText(new RegExp(`Batch:\\s*${hl.batch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)).last()).toBeVisible();
    // Clean up the cart line
    const trash = dialog().locator('button:has(svg.lucide-trash)').first();
    if (await trash.isVisible().catch(() => false)) await trash.click();
  });

  test('TC-012: expired batches are not shown or highlighted (system behaviour)', async () => {
    await backToFullList();
    const { groups } = await productGroups('');
    for (const g of groups.slice(0, 8)) {
      if (!g.itemId) continue;
      const shown = new Set(g.cards.map((c) => c.batch));
      const expired = (await getBatches(g.itemId)).filter((b) => b.expiryDate && new Date(b.expiryDate) < new Date(TODAY.toDateString()) && Number(b.quantityAvailable) > 0);
      for (const e of expired) {
        expect(shown.has(e.batchNumber), `${g.product}: expired batch ${e.batchNumber} (exp ${e.expiryDate}) must not be listed`).toBe(false);
      }
    }
  });
});

// =============================================================================
// Part 3: System-wide stock integrity (read-only). Highlight and visibility depend on
// quantityAvailable, so a wrong stock figure shows/hides/highlights the wrong batch.
// =============================================================================
test.describe('EMR-208 system: stock ledger integrity (read-only)', () => {
  /** @type {Record<string,string>|null} */ let headers = null;
  /** @type {string|null} */ let apiBase = null;
  /** @type {any[]} */ let report = [];

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(300000);
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
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
    await page.goto('/admin/aesthetic-appointments', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => !!headers, { timeout: 15000 }).toBe(true);

    const get = async (p) => {
      const r = await page.request.get(apiBase + p, { headers: headers || {} });
      return r.status() === 200 ? r.json().catch(() => null) : null;
    };
    // Products from the first catalog pages
    const productIds = new Set();
    for (let pg = 1; pg <= 2; pg++) {
      const p = (await get(`/aesthetic/search?query=&page=${pg}&limit=10`))?.payload;
      const items = Array.isArray(p) ? p : p?.items || [];
      items.filter((i) => i.type === 'product').forEach((i) => productIds.add(i.item_id));
    }
    for (const pid of productIds) {
      const batches = (await get(`/aesthetic/products/${pid}/batches?limit=100`))?.payload?.batches || [];
      for (const b of batches) {
        const t = await get(`/aesthetic/batches/${b.id}/transactions`);
        const tx = Array.isArray(t?.payload) ? t.payload : t?.payload?.transactions || [];
        const perInv = {};
        const dupes = new Map();
        for (const x of tx) {
          const ref = x.metadata?.invoiceRef;
          const sig = `${x.type}|${x.change}|${ref || ''}|${x.createdAt}`;
          dupes.set(sig, (dupes.get(sig) || 0) + 1);
          if (!ref) continue;
          perInv[ref] = perInv[ref] || { sold: 0, refunded: 0 };
          if (x.type === 'invoice_deduct') perInv[ref].sold += -Number(x.change || 0);
          if (x.type === 'invoice_refund') perInv[ref].refunded += Number(x.change || 0);
        }
        report.push({
          product: pid, batch: b.batchNumber, id: b.id,
          received: Number(b.quantity), available: Number(b.quantityAvailable),
          ledgerSum: tx.reduce((s, x) => s + Number(x.change || 0), 0), txCount: tx.length,
          overRefund: Object.entries(perInv).filter(([, v]) => v.refunded > v.sold).map(([k, v]) => `${k}: sold ${v.sold}, refunded ${v.refunded}`),
          duplicateTx: [...dupes.entries()].filter(([s, n]) => n > 1 && s.startsWith('invoice_refund')).map(([s, n]) => `${s} x${n}`),
        });
      }
    }
    await ctx.close();
  });

  test('TC-030: available stock never exceeds received quantity', async () => {
    test.info().annotations.push({ type: 'defect', description: 'DF-3: e.g. Allermine IMP-483285-193 (id 1455) available 16 > received 12' });
    test.fail(true, 'Known defect EMR-208/DF-3: stock inflated by duplicate auto-cancel refunds');
    expect(report.length).toBeGreaterThan(0);
    const bad = report.filter((r) => r.available > r.received).map((r) => `${r.batch} (id ${r.id}): available ${r.available} > received ${r.received}`);
    expect(bad).toEqual([]);
  });

  test('TC-031: an invoice never refunds more units than it deducted', async () => {
    test.info().annotations.push({ type: 'defect', description: 'DF-3: "System auto-cancelled draft Invoice" writes the same refund twice' });
    test.fail(true, 'Known defect EMR-208/DF-3: over-refunds on auto-cancelled drafts');
    const bad = report.filter((r) => r.overRefund.length).map((r) => `${r.batch} (id ${r.id}): ${r.overRefund.join('; ')}`);
    expect(bad).toEqual([]);
  });

  test('TC-032: no duplicate refund transactions (same type/qty/invoice/timestamp)', async () => {
    test.fail(true, 'Known defect EMR-208/DF-3: duplicate refund rows');
    const bad = report.filter((r) => r.duplicateTx.length).map((r) => `${r.batch} (id ${r.id}): ${r.duplicateTx.join('; ')}`);
    expect(bad).toEqual([]);
  });

  test('TC-033: ledger sum equals available stock for every batch', async () => {
    const bad = report.filter((r) => r.txCount > 0 && r.ledgerSum !== r.available).map((r) => `${r.batch} (id ${r.id}): ledger ${r.ledgerSum} vs available ${r.available}`);
    expect(bad).toEqual([]);
  });

  test('TC-034: no negative stock', async () => {
    expect(report.filter((r) => r.available < 0).map((r) => `${r.batch} (id ${r.id}): ${r.available}`)).toEqual([]);
  });
});
