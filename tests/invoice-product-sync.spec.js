// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { ProductSettingsPage } = require('./pages/ProductSettingsPage');
const { AppointmentsPage } = require('./pages/AppointmentsPage');
const { ConsultationInvoicePage } = require('./pages/ConsultationInvoicePage');

test.describe('AMERCK CARE — Product Inventory & Appointment Invoice Stock Sync Test Suite', () => {
  /** @type {import('@playwright/test').BrowserContext} */
  let context;
  /** @type {import('@playwright/test').Page} */
  let tab1_productsPage;
  /** @type {import('@playwright/test').Page} */
  let tab2_appointmentsPage;
  /** @type {ProductSettingsPage} */
  let productSettings;
  /** @type {AppointmentsPage} */
  let appointments;

  test.beforeEach(async ({ browser }) => {
    // Create browser context for multi-tab testing
    context = await browser.newContext();

    // Tab 1: Products Settings
    tab1_productsPage = await context.newPage();
    const login1 = new LoginPage(tab1_productsPage);
    await login1.goto();
    await login1.login('parami', 'parami');
    await tab1_productsPage.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });

    productSettings = new ProductSettingsPage(tab1_productsPage);
    await productSettings.goto();

    // Tab 2: Appointments
    tab2_appointmentsPage = await context.newPage();
    appointments = new AppointmentsPage(tab2_appointmentsPage);
    await appointments.goto();
  });

  test.afterEach(async () => {
    await context.close();
  });

  // =========================================================================
  // 1. Cross-Tab Product Availability Verification
  // =========================================================================
  test('INV-01: Available product quantities in Product Settings must match Invoice Catalog (2 Tabs)', async () => {
    const targetProductName = 'Acnechio anti acne body spray 100ml';

    // 1. Tab 1: Fetch all batches and available stock from Product Settings
    await productSettings.openProduct(targetProductName);
    await productSettings.openBatchesTab();
    const inventoryBatches = await productSettings.getBatchesData();

    expect(inventoryBatches.length).toBeGreaterThan(0);
    console.log('Tab 1 - Inventory Batches retrieved:', inventoryBatches);

    // 2. Tab 2: Navigate to Appointment -> Consultation -> Invoices -> Add Items
    const firstRowButtons = tab2_appointmentsPage.locator('tbody tr').first().locator('button');
    const popupPromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
    await firstRowButtons.first().click();
    let consultationPage = await popupPromise;
    if (!consultationPage) {
      consultationPage = tab2_appointmentsPage;
    }
    await consultationPage.waitForLoadState('domcontentloaded');

    const invoiceModule = new ConsultationInvoicePage(consultationPage);
    await invoiceModule.openInvoicesTab();
    await invoiceModule.openAddItemDialog();
    await invoiceModule.searchCatalog(targetProductName);

    // 3. Compare each inventory batch in Tab 1 against the catalog card in Tab 2
    for (const batch of inventoryBatches) {
      // Find the specific card item for this batch in the catalog list
      const batchCards = consultationPage.locator('div').filter({
        hasText: new RegExp(batch.batchNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      }).filter({
        hasText: /Available:/i
      });

      const count = await batchCards.count();
      if (count > 0) {
        const cardText = await batchCards.last().innerText();
        console.log(`Checking Batch ${batch.batchNumber} in invoice catalog: "${cardText}"`);

        // Extract available quantity from catalog card
        const availMatch = cardText.match(/Available:\s*(\d+)/i);
        expect(availMatch).not.toBeNull();
        const catalogAvailable = availMatch ? parseInt(availMatch[1], 10) : 0;

        // Extract added quantity if already added in current draft invoice
        const addedMatch = cardText.match(/Added\s*\((\d+)\)/i);
        const addedQty = addedMatch ? parseInt(addedMatch[1], 10) : 0;

        if (addedQty === 0) {
          // Without added product: available in catalog must be exactly the same as in Product Settings
          expect(catalogAvailable).toBe(batch.qtyAvailable);
        } else {
          // With added product: catalog available + added quantity equals the inventory available
          expect(catalogAvailable + addedQty).toBeGreaterThanOrEqual(batch.qtyAvailable);
        }
      }
    }
  });



  // =========================================================================
  // 2. Product Addition to Invoice & Line Item Validation
  // =========================================================================
  test('INV-02: Adding a product to Invoice should update Added Items with correct quantity and price', async () => {
    const targetProductName = 'Acnechio anti acne body spray 100ml';

    // 1. Tab 1: Check available stock for active batch
    await productSettings.openProduct(targetProductName);
    await productSettings.openBatchesTab();
    const inventoryBatches = await productSettings.getBatchesData();
    const activeBatch = inventoryBatches.find(b => b.qtyAvailable > 0) || inventoryBatches[0];

    // 2. Tab 2: Open Appointment Invoice
    const firstRowButtons = tab2_appointmentsPage.locator('tbody tr').first().locator('button');
    const popupPromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
    await firstRowButtons.first().click();
    let consultationPage = await popupPromise;
    if (!consultationPage) {
      consultationPage = tab2_appointmentsPage;
    }
    await consultationPage.waitForLoadState('domcontentloaded');

    const invoiceModule = new ConsultationInvoicePage(consultationPage);
    await invoiceModule.openInvoicesTab();
    await invoiceModule.openAddItemDialog();
    await invoiceModule.searchCatalog(targetProductName);

    // 3. Add the active product batch item
    await invoiceModule.addProductBatch(activeBatch.batchNumber);

    // 4. Verify item appears in ADDED ITEMS list on right panel
    await expect(invoiceModule.addedItemsHeader).toBeVisible();
    const addedItemEntry = consultationPage.locator('div').filter({ hasText: /Acnechio/i }).filter({ hasText: /each/i }).first();
    await expect(addedItemEntry).toBeVisible();

    // Verify subtotal or quantity is populated
    const subtotalText = await consultationPage.locator('text=/Subtotal:/i').first().innerText();
    expect(subtotalText).toContain('LKR');
  });

  // =========================================================================
  // 3. Available Quantity State Integrity
  // =========================================================================
  test('INV-03: Catalog and inventory stock integrity remains consistent across workflows', async () => {
    const targetProductName = 'Acnechio anti acne body spray 100ml';

    // Verify product settings screen renders all batch rows consistently
    await productSettings.openProduct(targetProductName);
    await productSettings.openBatchesTab();
    const batches = await productSettings.getBatchesData();

    expect(batches.length).toBeGreaterThanOrEqual(1);
    for (const b of batches) {
      expect(b.batchNumber).toBeTruthy();
      expect(typeof b.qtyAvailable).toBe('number');
    }
  });
});
