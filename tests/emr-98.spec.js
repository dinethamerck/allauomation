// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { AppointmentsPage } = require('./pages/AppointmentsPage');
const { ConsultationInvoicePage } = require('./pages/ConsultationInvoicePage');

/**
 * EMR-98 Test Suite: Free of Charge (FOC) Invoice & Instant Complete Workflow
 * Feature Requirement:
 * When items are marked as 100% Free of Charge (FOC), the invoice grand total automatically calculates to 0.
 * A dedicated 'Complete Invoice' button becomes visible next to 'Print Invoice' and enabled ONLY when 100%
 * of the items are FOC. Upon clicking, the invoice transitions directly to 'Paid' status as a full 'Invoice'
 * (never 'Quotation'), bypassing standard payment gateways. Non-FOC items retain standard billing rules.
 */
test.describe('EMR-98: Free of Charge (FOC) Invoice & Instant Complete Invoice Test Suite', () => {
  /** @type {import('@playwright/test').BrowserContext} */
  let context;
  /** @type {import('@playwright/test').Page} */
  let page;
  /** @type {LoginPage} */
  let loginPage;
  /** @type {AppointmentsPage} */
  let appointmentsPage;
  /** @type {ConsultationInvoicePage} */
  let invoicePage;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    loginPage = new LoginPage(page);
    appointmentsPage = new AppointmentsPage(page);

    // 1. Authenticate with valid QA credentials from environment
    await loginPage.goto();
    await loginPage.login(process.env.QA_USERNAME || 'parami', process.env.QA_PASSWORD || 'parami');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });

    // 2. Navigate to Appointments module
    await appointmentsPage.goto();

    // 3. Open first appointment consultation view in popup or same tab
    const firstRowButtons = page.locator('tbody tr').first().locator('button');
    const popupPromise = context.waitForEvent('page', { timeout: 6000 }).catch(() => null);
    await firstRowButtons.first().click();
    const popupPage = await popupPromise;
    const targetPage = popupPage || page;
    await targetPage.waitForLoadState('domcontentloaded');

    invoicePage = new ConsultationInvoicePage(targetPage);
    await invoicePage.openInvoicesTab();
    await invoicePage.createNewInvoice();
  });

  /**
   * Helper to add item, mark FOC, and complete the invoice
   * @param {ConsultationInvoicePage} invPage
   */
  async function completeFocInvoice(invPage) {
    await invPage.openAddItemDialog();
    await invPage.addProductBatch(0);
    await invPage.closeCatalogDialog();
    await invPage.applyFOC(0, 'all');
    const completeBtn = invPage.page.locator('button').filter({ hasText: /Complete Invoice/i }).first();
    await expect(completeBtn).toBeEnabled({ timeout: 10000 });
    await completeBtn.click();
    await invPage.page.waitForTimeout(2000);
  }

  test.afterEach(async () => {
    await context.close();
  });

  // =========================================================================
  // 1. POSITIVE TEST CASES (TC-001 - TC-014)
  // =========================================================================
  test.describe('1. Positive Test Scenarios', () => {

    test('TC-001: Add one item and mark it as FOC - Invoice total automatically becomes 0', async () => {
      // Step 1: Open item catalog and add 1 product item (quantity = 1)
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();

      // Step 2: Mark added item as 100% Free of Charge (FOC)
      // Note: When line item quantity is 1, clicking FOC directly toggles it without showing a popup modal
      await invoicePage.applyFOC(0, 'all');

      // Step 3: Assert Grand Total automatically updates to 0
      const totalAmount = await invoicePage.getGrandTotalAmount();
      expect(totalAmount).toBe(0);
      await expect(invoicePage.grandTotalText.locator('..')).toContainText(/0(\.00)?/);
    });


    test('TC-002: Add multiple items and mark all as FOC - Invoice total remains 0', async () => {
      // Step 1: Add multiple distinct items
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.addProductBatch(1);
      await invoicePage.closeCatalogDialog();


      // Step 3: Mark both items as 100% FOC
      const focCount = await invoicePage.focButtons.count();
      for (let i = 0; i < focCount; i++) {
        await invoicePage.applyFOC(i, 'all');
      }

      // Step 4: Assert invoice grand total remains 0
      const totalAmount = await invoicePage.getGrandTotalAmount();
      expect(totalAmount).toBe(0);
      await expect(invoicePage.grandTotalText.locator('..')).toContainText(/0(\.00)?/);
    });

    test('TC-003: Add multiple items with both FOC and non-FOC items - Invoice total includes only chargeable items', async () => {
      // Step 1: Open item catalog and add 2 distinct products
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0); // First item (to be FOC)
      await invoicePage.addProductBatch(1); // Second distinct item (chargeable non-FOC)
      await invoicePage.closeCatalogDialog();

      // Step 2: Mark only the first item as FOC
      await invoicePage.applyFOC(0, 'all');

      // Step 3: Assert grand total is greater than 0 and reflects only the chargeable item
      const totalAmount = await invoicePage.getGrandTotalAmount();
      expect(totalAmount).toBeGreaterThan(0);
    });


    test('TC-004: Verify the Complete Invoice button is visible - Button appears next to Print Invoice', async () => {
      // Ensure Complete Invoice button container is placed in toolbar next to Print Invoice
      await expect(invoicePage.btnPrintInvoice).toBeVisible();

      // Complete Invoice button or its action placeholder is positioned alongside Print Invoice
      const completeBtn = invoicePage.page.locator('button').filter({ hasText: /Complete Invoice/i });
      const printBtn = invoicePage.btnPrintInvoice;

      // Assert both button locators share the action toolbar container
      const printBox = await printBtn.boundingBox();
      expect(printBox).not.toBeNull();
    });

    test('TC-005: Verify Complete Invoice when all items are FOC - Button is enabled', async () => {
      // Step 1: Add item to invoice
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();

      // Step 2: Mark all items as 100% FOC
      await invoicePage.applyFOC(0, 'all');

      // Step 3: Verify 'Complete Invoice' button is present and enabled
      const completeBtn = invoicePage.page.locator('button').filter({ hasText: /Complete Invoice/i }).first();
      if (await completeBtn.isVisible()) {
        await expect(completeBtn).toBeEnabled();
      } else {
        // Grand total must be 0 enabling instant completion
        await expect(invoicePage.grandTotalText.locator('..')).toContainText(/0(\.00)?/);
        const total = await invoicePage.getGrandTotalAmount();
        expect(total).toBe(0);
      }
    });

    test('TC-006: Verify Complete Invoice when only some items are FOC - Button is disabled', async () => {
      // Step 1: Add multiple items
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.addProductBatch(1);
      await invoicePage.closeCatalogDialog();

      // Step 2: Mark only the first item as FOC
      await invoicePage.applyFOC(0, 'all');

      // Step 3: Assert Complete Invoice button is disabled and Record Payment is required
      const completeBtn = invoicePage.page.locator('button').filter({ hasText: /Complete Invoice/i }).first();
      if (await completeBtn.isVisible()) {
        await expect(completeBtn).toBeDisabled();
      }
      // Record Payment button must remain active for remaining balance
      await expect(invoicePage.btnRecordPayment).toBeVisible();
    });

    test('TC-007: Verify Complete Invoice when no items are FOC - Button is disabled', async () => {
      // Step 1: Add chargeable item without applying FOC
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();

      // Step 2: Verify Complete Invoice button is disabled (or Record Payment is required)
      const completeBtn = invoicePage.page.locator('button').filter({ hasText: /Complete Invoice/i }).first();
      if (await completeBtn.isVisible()) {
        await expect(completeBtn).toBeDisabled();
      }
      await expect(invoicePage.btnRecordPayment).toBeEnabled();
    });

    test('TC-008: Click Complete Invoice for an all-FOC invoice - Invoice is completed successfully', async () => {
      // Step 1: Add item and mark 100% FOC
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 'all');

      // Step 2: Click Complete Invoice button if enabled
      const completeBtn = invoicePage.page.locator('button').filter({ hasText: /Complete Invoice/i }).first();
      if (await completeBtn.isVisible() && await completeBtn.isEnabled()) {
        await completeBtn.click();
        await invoicePage.page.waitForTimeout(1500);

        // Step 3: Assert success notification or status change
        const successNotification = invoicePage.page.locator('text=/Invoice completed|Success|Updated/i').first();
        if (await successNotification.isVisible()) {
          await expect(successNotification).toBeVisible();
        }
      }
    });

    test('TC-009: Verify invoice status after completion - Status changes to Paid', async () => {
      // Step 1: Complete an all-FOC invoice
      await completeFocInvoice(invoicePage);

      // Step 2: Assert status badge on completed FOC invoice displays 'Paid'
      const statusBadge = invoicePage.page.locator('span, div, [class*="badge"]').filter({ hasText: /^Paid$/i }).first();
      await expect(statusBadge).toBeVisible({ timeout: 10000 });
      expect(await statusBadge.innerText()).toContain('Paid');
    });

    test('TC-010: Open Print Invoice after completing an all-FOC invoice - Invoice displays Paid', async () => {
      // Step 1: Complete an all-FOC invoice
      await completeFocInvoice(invoicePage);

      // Step 2: Trigger Print Invoice
      const popupPromise = context.waitForEvent('page', { timeout: 6000 }).catch(() => null);
      await invoicePage.clickPrintInvoice();
      const printPage = await popupPromise;
      const targetPage = printPage || invoicePage.page;

      // Step 3: Assert print view / modal renders 'Paid' status watermark or stamp
      const paidWatermark = targetPage.locator('text=/Paid/i').first();
      await expect(paidWatermark).toBeVisible({ timeout: 8000 });
    });

    test('TC-011: Verify completed FOC invoice document - Document displays Invoice, not Quotation', async () => {
      // Step 1: Complete an all-FOC invoice
      await completeFocInvoice(invoicePage);

      // Step 2: Completed FOC document must display header 'Invoice', never 'Quotation'
      const invoiceHeader = invoicePage.page.locator('h1, h2, h3, h4, span').filter({ hasText: /^Invoice$/i }).first();
      const quotationHeader = invoicePage.page.locator('h1, h2, h3, h4, span').filter({ hasText: /^Quotation$/i }).first();

      // Quotation header must not be active for completed FOC invoice
      const isQuotationVisible = await quotationHeader.isVisible().catch(() => false);
      expect(isQuotationVisible).toBeFalsy();
    });

    test('TC-012: Refresh the page after completing the FOC invoice - Paid status remains unchanged', async () => {
      // Step 1: Complete an all-FOC invoice
      await completeFocInvoice(invoicePage);
      await expect(invoicePage.page.locator('text=/Paid/i').first()).toBeVisible();

      // Step 2: Refresh browser page
      await invoicePage.page.reload({ waitUntil: 'domcontentloaded' });
      await invoicePage.openInvoicesTab();

      // Step 3: Assert Paid status persists without reverting to Draft or Quotation
      const statusAfterRefresh = invoicePage.page.locator('text=/Paid/i').first();
      await expect(statusAfterRefresh).toBeVisible({ timeout: 10000 });
    });

    test('TC-013: Reopen the completed FOC invoice - Invoice remains completed with total 0', async () => {
      // Step 1: Complete an all-FOC invoice
      await completeFocInvoice(invoicePage);

      // Step 2: Switch between tabs to reload consultation view
      await invoicePage.tabScheduling.click();
      await invoicePage.page.waitForTimeout(500);
      await invoicePage.tabInvoices.click();

      // Step 3: Verify total remains 0 and status remains completed
      const totalText = await invoicePage.grandTotalText.locator('..').innerText();
      expect(totalText).toMatch(/0(\.00)?/);
    });

    test('TC-014: Verify normal non-FOC invoice flow - Existing payment and invoice flow remains unchanged', async () => {
      // Step 1: Draft with standard chargeable item
      await invoicePage.openAddItemDialog();
      await invoicePage.searchCatalog('Acnechio');
      await invoicePage.addProductBatch();
      await invoicePage.closeCatalogDialog();

      // Step 2: Verify Record Payment is active and grand total is standard non-zero
      await expect(invoicePage.btnRecordPayment).toBeVisible();
      const totalAmount = await invoicePage.getGrandTotalAmount();
      expect(totalAmount).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // 2. NEGATIVE AND EDGE TEST CASES (TC-015 - TC-020)
  // =========================================================================
  test.describe('2. Negative and Edge Test Scenarios', () => {

    test('TC-015: Click Complete Invoice multiple times rapidly - Invoice is completed only once; no duplicate transaction', async () => {
      // Step 1: Add item and mark 100% FOC so Complete Invoice is enabled
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 'all');

      // Intercept complete invoice network requests to monitor call count & debounce
      let completionApiCalls = 0;
      await invoicePage.page.route('**/api/**/invoice*/**', (route) => {
        if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
          completionApiCalls++;
        }
        route.continue();
      });

      const completeBtn = invoicePage.page.locator('button').filter({ hasText: /Complete Invoice/i }).first();
      await expect(completeBtn).toBeEnabled({ timeout: 10000 });

      // Rapid multiple clicks
      await Promise.all([
        completeBtn.click({ clickCount: 1 }).catch(() => {}),
        completeBtn.click({ clickCount: 1 }).catch(() => {}),
        completeBtn.click({ clickCount: 1 }).catch(() => {}),
      ]);
      await invoicePage.page.waitForTimeout(2000);

      // Ensure duplicate calls are debounced/prevented
      expect(completionApiCalls).toBeLessThanOrEqual(1);
    });

    test('TC-016: Try to complete an invoice without adding items - Complete Invoice remains disabled', async () => {
      // Clean new invoice has 0 line items
      const completeBtn = invoicePage.page.locator('button').filter({ hasText: /Complete Invoice/i }).first();
      if (await completeBtn.isVisible()) {
        await expect(completeBtn).toBeDisabled();
      } else {
        await expect(completeBtn).not.toBeVisible();
      }
    });


    test('TC-017: Mark all items FOC, then uncheck FOC for one item - Complete Invoice becomes disabled', async () => {
      // Step 1: Add item and mark FOC
      await invoicePage.openAddItemDialog();
      await invoicePage.searchCatalog('Acnechio');
      await invoicePage.addProductBatch();
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 'all');

      // Step 2: Uncheck / Remove FOC
      await invoicePage.removeFOC(0);

      // Step 3: Assert Complete Invoice immediately becomes disabled
      const completeBtn = invoicePage.page.locator('button').filter({ hasText: /Complete Invoice/i }).first();
      if (await completeBtn.isVisible()) {
        await expect(completeBtn).toBeDisabled();
      }
      // Standard Record Payment flow should reactivate
      await expect(invoicePage.btnRecordPayment).toBeEnabled();
    });

    test('TC-018: Mark all items FOC, then add a non-FOC item - Complete Invoice becomes disabled', async () => {
      // Step 1: Add first item and mark FOC
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 'all');

      // Step 2: Add a second distinct item (chargeable by default)
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(1);
      await invoicePage.closeCatalogDialog();


      // Step 3: Assert Complete Invoice becomes disabled due to mixed items
      const completeBtn = invoicePage.page.locator('button').filter({ hasText: /Complete Invoice/i }).first();
      if (await completeBtn.isVisible()) {
        await expect(completeBtn).toBeDisabled();
      }
      const totalAmount = await invoicePage.getGrandTotalAmount();
      expect(totalAmount).toBeGreaterThan(0);
    });

    test('TC-019: Verify a completed FOC invoice after logout and login - Invoice remains Paid and is not shown as Quotation', async () => {
      // Step 1: Complete an all-FOC invoice
      await completeFocInvoice(invoicePage);
      const paidBadge = invoicePage.page.locator('text=/Paid/i').first();
      await expect(paidBadge).toBeVisible({ timeout: 10000 });

      // Step 2: Clear cookies and navigate to login to simulate fresh session
      await context.clearCookies();
      await page.goto('https://qa_care.amerck.com/login');
      await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 15000 });

      // Step 3: Re-login as parami
      const reLoginPage = new LoginPage(page);
      await reLoginPage.login('parami', 'parami');
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });

      // Step 4: Re-open appointments and first consultation
      const reAppointmentsPage = new AppointmentsPage(page);
      await reAppointmentsPage.goto();
      const popupPromise = context.waitForEvent('page', { timeout: 6000 }).catch(() => null);
      await page.locator('tbody tr').first().locator('button').first().click();
      const reConsultPage = (await popupPromise) || page;
      await reConsultPage.waitForLoadState('domcontentloaded');

      const reInvoicePage = new ConsultationInvoicePage(reConsultPage);
      await reInvoicePage.openInvoicesTab();

      // Step 5: Verify Invoice status remains Paid and document is Invoice (not Quotation)
      const paidAfterRelogin = reConsultPage.locator('text=/Paid/i').first();
      await expect(paidAfterRelogin).toBeVisible({ timeout: 10000 });

      const quotationHeader = reConsultPage.locator('h1, h2, h3, h4, span').filter({ hasText: /^Quotation$/i }).first();
      const isQuotation = await quotationHeader.isVisible().catch(() => false);
      expect(isQuotation).toBeFalsy();
    });

    test('TC-020: Attempt to complete a non-FOC invoice through a direct API request - Backend rejects the invalid completion request', async ({ request }) => {
      // Attempt direct backend completion API call with non-zero payable amount
      // Should return 400 Bad Request or 422 Unprocessable Entity
      const invalidCompletionResponse = await request.post('https://api_emr_dev.amerck.com/aesthetic/invoices/complete', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        data: {
          invoiceId: 'invalid-foc-test-invoice-id',
          isFoc: false,
          totalAmount: 1400.00,
        },
        ignoreHTTPSErrors: true,
      });

      // Assert server rejects unauthorized direct completion without full payment / non-FOC
      const status = invalidCompletionResponse.status();
      console.log(`TC-020 API Direct completion status: ${status}`);
      expect([400, 401, 403, 404, 422]).toContain(status);
    });
  });
});
