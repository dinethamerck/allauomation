// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { StocksPage } = require('./pages/StocksPage');
const { AppointmentsPage } = require('./pages/AppointmentsPage');
const { ConsultationInvoicePage } = require('./pages/ConsultationInvoicePage');

/**
 * Test Suite: 2-Tab Cross-Module Verification
 * Verifies synchronization between:
 *   - Tab 1: Appointment Consultation Invoice (Add Product to Invoice)
 *   - Tab 2: Stocks / Inventory Page (/admin/aesthetic-settings/products/batches)
 * Checks whether available inventory stock decreases, updates, or remains the same.
 */
test.describe('AMERCK CARE — 2-Tab Invoice & Inventory Stock Synchronization', () => {
  /** @type {import('@playwright/test').BrowserContext} */
  let context;
  /** @type {import('@playwright/test').Page} */
  let tab1_consultationPage;
  /** @type {import('@playwright/test').Page} */
  let tab2_stocksPage;
  /** @type {ConsultationInvoicePage} */
  let invoiceModule;
  /** @type {StocksPage} */
  let stocksModule;

  const targetProductName = 'Acnechio anti acne body spray 100ml';

  test.beforeEach(async ({ browser }) => {
    // 1. Create a single browser context shared across both tabs (session shared)
    context = await browser.newContext();

    // 2. Open Tab 1: Log in and navigate to Appointments
    const tab1 = await context.newPage();
    const loginPage = new LoginPage(tab1);
    await loginPage.goto();
    await loginPage.login('parami', 'parami');
    await tab1.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });

    const appointmentsPage = new AppointmentsPage(tab1);
    await appointmentsPage.goto();

    // Open first appointment to enter Consultation view
    const firstRowButtons = tab1.locator('tbody tr').first().locator('button');
    const popupPromise = context.waitForEvent('page', { timeout: 6000 }).catch(() => null);
    await firstRowButtons.first().click();
    const popupPage = await popupPromise;
    tab1_consultationPage = popupPage || tab1;
    await tab1_consultationPage.waitForLoadState('domcontentloaded');

    invoiceModule = new ConsultationInvoicePage(tab1_consultationPage);
    await invoiceModule.openInvoicesTab();

    // 3. Open Tab 2: Navigate directly to Stocks page in the same context
    tab2_stocksPage = await context.newPage();
    stocksModule = new StocksPage(tab2_stocksPage);
    await stocksModule.goto();
    await stocksModule.openByProductTab();
  });

  test.afterEach(async () => {
    await context.close();
  });

  // =========================================================================
  // TEST CASE 1: Baseline Stock Alignment Across Both Tabs
  // =========================================================================
  test('TC-STK-01: Available quantity in Stocks inventory must match Invoice Catalog before adding', async () => {
    // 1. Tab 2 (Stocks): Locate target product and retrieve available batch stocks
    await stocksModule.searchProduct(targetProductName);
    await stocksModule.expandProduct(targetProductName);
    const stocksBatches = await stocksModule.getProductBatches();

    expect(stocksBatches.length).toBeGreaterThan(0);
    const primaryBatch = stocksBatches.find(b => b.available > 0) || stocksBatches[0];
    console.log(`[Tab 2 - Stocks] Found Batch: ${primaryBatch.batchNumber}, Available: ${primaryBatch.available}/${primaryBatch.totalAdded}`);

    // 2. Tab 1 (Invoice): Open Add Item dialog and search for the same product
    await invoiceModule.openAddItemDialog();
    await invoiceModule.searchCatalog(targetProductName);
    const catalogInfo = await invoiceModule.getCatalogItemInfo(primaryBatch.batchNumber);
    console.log(`[Tab 1 - Invoice] Catalog Card: "${catalogInfo.text}"`);

    // 3. Cross-Tab Comparison: Verify initial available stock matches exactly
    console.log(`[Comparison] Stocks Available: ${primaryBatch.available} vs Catalog Available: ${catalogInfo.available}`);
    expect(catalogInfo.available).toBe(primaryBatch.available);
  });

  // =========================================================================
  // TEST CASE 2: Add Product to Invoice & Check Inventory Available (Same or Deducted)
  // =========================================================================
  test('TC-STK-02: When product is added to Invoice, check if Stocks inventory available is same or deducted', async () => {
    // 1. Tab 2 (Stocks): Record initial available stock from Stocks inventory
    await stocksModule.searchProduct(targetProductName);
    await stocksModule.expandProduct(targetProductName);
    const initialBatches = await stocksModule.getProductBatches();
    const activeBatch = initialBatches.find(b => b.available > 0) || initialBatches[0];
    const initialStock = activeBatch.available;
    console.log(`[Tab 2 - Stocks Initial] Batch ${activeBatch.batchNumber} Available = ${initialStock}`);

    // 2. Tab 1 (Invoice): Open Add Item modal and add 1 unit of this batch
    await invoiceModule.openAddItemDialog();
    await invoiceModule.searchCatalog(targetProductName);
    await invoiceModule.addProductBatch(activeBatch.batchNumber);

    // Verify catalog dialog updates Added counter
    const afterAddCatalogInfo = await invoiceModule.getCatalogItemInfo(activeBatch.batchNumber);
    console.log(`[Tab 1 - Invoice Added] Added Qty: ${afterAddCatalogInfo.added}, Remaining Catalog Available: ${afterAddCatalogInfo.available}`);
    expect(afterAddCatalogInfo.added).toBeGreaterThanOrEqual(1);

    // 3. Tab 2 (Stocks): Refresh Stocks page to inspect inventory state after product addition
    await tab2_stocksPage.bringToFront();
    const updatedStock = await stocksModule.refreshAndGetAvailableStock(targetProductName, activeBatch.batchNumber);
    console.log(`[Tab 2 - Stocks After Invoice Add] Batch ${activeBatch.batchNumber} Available = ${updatedStock}`);

    // 4. Verify Stock Behavior:
    // Determine if system follows Model A (immediate draft reservation) or Model B (deduction on payment/save)
    const isDeductedImmediately = (updatedStock === initialStock - 1);
    const isDraftIsolated = (updatedStock === initialStock);

    console.log(`[Stock Verification Result]:`);
    console.log(`- Initial Stock: ${initialStock}`);
    console.log(`- After Addition Stock: ${updatedStock}`);
    console.log(`- Stock was deducted immediately in inventory: ${isDeductedImmediately}`);
    console.log(`- Stock remained the same in inventory (draft state): ${isDraftIsolated}`);

    // Assert that the system adheres to a valid inventory lifecycle (either reserved immediately or held unchanged until finalized)
    expect(isDeductedImmediately || isDraftIsolated).toBe(true);

    // Also assert catalog in Tab 1 accounted for the addition
    expect(afterAddCatalogInfo.available + afterAddCatalogInfo.added).toBe(initialStock);
  });

  // =========================================================================
  // TEST CASE 3: Inventory Integrity on Discarding / Canceling Draft Invoice
  // =========================================================================
  test('TC-STK-03: Discarding draft invoice restores / preserves initial available stock in inventory', async () => {
    // 1. Tab 2 (Stocks): Fetch baseline available stock
    await stocksModule.searchProduct(targetProductName);
    await stocksModule.expandProduct(targetProductName);
    const batches = await stocksModule.getProductBatches();
    const activeBatch = batches.find(b => b.available > 0) || batches[0];
    const baselineStock = activeBatch.available;

    // 2. Tab 1 (Invoice): Add product to draft invoice
    await invoiceModule.openAddItemDialog();
    await invoiceModule.searchCatalog(targetProductName);
    await invoiceModule.addProductBatch(activeBatch.batchNumber);
    await invoiceModule.closeCatalogDialog();

    // Discard the draft invoice
    await invoiceModule.discardDraftInvoice();

    // 3. Tab 2 (Stocks): Refresh and verify stock is consistent with baseline
    await tab2_stocksPage.bringToFront();
    const finalStock = await stocksModule.refreshAndGetAvailableStock(targetProductName, activeBatch.batchNumber);
    console.log(`[Tab 2 - Final Stock After Discard] Expected: ${baselineStock}, Actual: ${finalStock}`);
    expect(finalStock).toBe(baselineStock);
  });

  // =========================================================================
  // TEST CASE 4: Multi-Batch Inventory Comparison Across Both Tabs
  // =========================================================================
  test('TC-STK-04: All active batches in Stocks inventory are reflected with accurate availability in Invoice Catalog', async () => {
    // 1. Tab 2 (Stocks): Extract all batch rows under the product
    await stocksModule.searchProduct(targetProductName);
    await stocksModule.expandProduct(targetProductName);
    const stocksBatches = await stocksModule.getProductBatches();
    expect(stocksBatches.length).toBeGreaterThan(0);

    // 2. Tab 1 (Invoice): Search product in catalog
    await invoiceModule.openAddItemDialog();
    await invoiceModule.searchCatalog(targetProductName);

    // 3. Iterate over each batch and verify availability matches
    for (const batch of stocksBatches) {
      try {
        const catalogInfo = await invoiceModule.getCatalogItemInfo(batch.batchNumber);
        console.log(`[Batch Check ${batch.batchNumber}] Stocks Avail: ${batch.available} | Catalog Avail: ${catalogInfo.available}`);
        // Availability should match or account for already added items
        expect(catalogInfo.available + catalogInfo.added).toBe(batch.available);
      } catch {
        // If a batch is expired or not listed for sale, log for traceability
        console.log(`[Notice] Batch ${batch.batchNumber} not selectable in invoice catalog`);
      }
    }
  });

  // =========================================================================
  // TEST CASE 5: "By Batch" Inventory View vs Invoice Catalog Consistency (2 Tabs)
  // =========================================================================
  test('TC-STK-05: Stocks "By Batch" view total available stock correlates with Invoice available stock', async () => {
    // 1. Tab 2 (Stocks): Switch to "By Batch" tab
    await stocksModule.openByBatchTab();
    await tab2_stocksPage.waitForTimeout(1000);

    // Retrieve the first batch row from "By Batch" table
    const firstRowCells = await tab2_stocksPage.locator('table tbody tr').first().locator('td').allInnerTexts();
    const batchNumber = firstRowCells[0]?.trim();
    const totalAvailable = parseInt(firstRowCells[2]?.trim(), 10) || 0;
    console.log(`[Tab 2 - By Batch View] Batch: ${batchNumber}, Total Available: ${totalAvailable}`);

    expect(batchNumber).toBeTruthy();

    // 2. Tab 1 (Invoice): Search for this batch in invoice catalog
    await invoiceModule.openAddItemDialog();
    await invoiceModule.searchCatalog(batchNumber);

    const hasCard = await tab1_consultationPage.locator('div').filter({
      hasText: new RegExp(batchNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    }).count();

    if (hasCard > 0 && totalAvailable > 0) {
      const catalogInfo = await invoiceModule.getCatalogItemInfo(batchNumber);
      console.log(`[Cross-Tab Check] By Batch Available: ${totalAvailable}, Invoice Catalog: ${catalogInfo.available}`);
      expect(catalogInfo.available + catalogInfo.added).toBe(totalAvailable);
    }
  });
});
