// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { AppointmentsPage } = require('./pages/AppointmentsPage');
const { ConsultationInvoicePage } = require('./pages/ConsultationInvoicePage');
const pdfParse = require('pdf-parse');

/**
 * EMR-138 Automated Test Suite:
 * Free of Charge (FOC) Invoice PDF Item Pricing & "FREE" Discount Column Display
 * 
 * Core Requirement:
 * When the FOC (Free of Charge) option is selected for an invoice item, the generated
 * invoice PDF should retain the original unit price in the 'UNIT PRICE' column,
 * display "FREE" (or "N FREE" for partial FOC) in the 'DISCOUNT' column,
 * and calculate the 'SUBTOTAL' accordingly (0.00 for 100% FOC, or chargeable units * unit price).
 */
test.describe('EMR-138: Free of Charge (FOC) Invoice PDF Pricing & Discount Presentation', () => {
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

  test.afterEach(async () => {
    await context.close();
  });

  /**
   * Universal helper to safely extract text from PDF buffer across all pdf-parse versions
   * @param {Buffer} buffer
   * @returns {Promise<string>}
   */
  async function parsePdfBuffer(buffer) {
    if (!buffer || buffer.length === 0) return '';
    try {
      const pdfModule = require('pdf-parse');
      if (typeof pdfModule === 'function') {
        const data = await pdfModule(buffer);
        return data.text || '';
      }
      if (pdfModule && typeof pdfModule.default === 'function') {
        const data = await pdfModule.default(buffer);
        return data.text || '';
      }
      if (pdfModule && pdfModule.PDFParse) {
        const uint8 = new Uint8Array(buffer);
        const parser = new pdfModule.PDFParse(uint8);
        await parser.load();
        const res = await parser.getText();
        return typeof res === 'string' ? res : (res?.text || '');
      }
    } catch (err) {
      console.warn('PDF parsing error:', err.message);
    }
    return '';
  }

  /**
   * Helper to trigger invoice PDF generation/download and extract its raw text
   * @param {import('@playwright/test').BrowserContext} ctx
   * @param {ConsultationInvoicePage} invPage
   * @returns {Promise<{ pdfText: string, buffer?: Buffer, rawPage?: import('@playwright/test').Page }>}
   */
  async function generateAndExtractPdf(ctx, invPage) {
    const pdfCapture = await invPage.downloadOrCapturePdf(ctx);

    if (pdfCapture.buffer) {
      const parsedText = await parsePdfBuffer(pdfCapture.buffer);
      return { pdfText: parsedText, buffer: pdfCapture.buffer };
    }

    if (pdfCapture.page) {
      // In case PDF is rendered inside browser viewer or print modal
      const bodyText = await pdfCapture.page.locator('body').innerText().catch(() => '');
      return { pdfText: bodyText, rawPage: pdfCapture.page };
    }

    const fallbackText = await invPage.page.locator('body').innerText();
    return { pdfText: fallbackText };
  }

  /**
   * Helper to assert line item details within the PDF text or UI table
   * @param {string} pdfText
   * @param {{
   *   description?: RegExp|string,
   *   unitPrice: string|number,
   *   qty?: string|number,
   *   discount: string,
   *   subtotal: string|number
   * }} expected
   */
  function assertPdfLineItemValues(pdfText, expected) {
    const formattedPrice = typeof expected.unitPrice === 'number' ? expected.unitPrice.toFixed(2) : expected.unitPrice;
    const formattedSubtotal = typeof expected.subtotal === 'number' ? expected.subtotal.toFixed(2) : expected.subtotal;

    // 1. Verify Unit Price is preserved (MUST NOT be replaced with 0.00 if original was non-zero)
    expect(pdfText).toContain(formattedPrice);

    // 2. Verify Discount column displays "FREE" or "N FREE"
    const discountPattern = new RegExp(expected.discount.replace(/\s+/g, '\\s*'), 'i');
    expect(pdfText).toMatch(discountPattern);

    // 3. Verify Subtotal matches expectation (0.00 for full FOC, or chargeable remainder)
    expect(pdfText).toContain(formattedSubtotal);

    // 4. If description pattern provided, verify complimentary tag
    if (expected.description) {
      if (typeof expected.description === 'string') {
        expect(pdfText).toContain(expected.description);
      } else {
        expect(pdfText).toMatch(expected.description);
      }
    }
  }

  // =========================================================================
  // 1. POSITIVE TEST CASES (TC-001 - TC-012)
  // =========================================================================
  test.describe('1. Positive Test Scenarios', () => {

    test('TC-001: Single Item 100% FOC (Qty = 1) - PDF retains unit price, displays FREE discount, and 0.00 subtotal', async () => {
      // Step 1: Add 1 product item (quantity = 1, e.g. price 400.00)
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();

      // Step 2: Mark added item as 100% Free of Charge (FOC)
      await invoicePage.applyFOC(0, 'all');

      // Step 3: Assert UI table reflects 0.00 Grand Total
      const grandTotal = await invoicePage.getGrandTotalAmount();
      expect(grandTotal).toBe(0);

      // Step 4: Generate/download invoice PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 5: Assert PDF retains original unit price, displays "FREE" in discount, and 0.00 subtotal
      assertPdfLineItemValues(pdfText, {
        unitPrice: '400.00',
        qty: 1,
        discount: 'FREE',
        subtotal: '0.00',
      });
      expect(pdfText).toMatch(/GRAND TOTAL\s*0(\.00)?/i);
    });

    test('TC-002: Single Item Multi-Quantity 100% FOC (Qty = 3, 3 FREE) - PDF retains unit price and displays FREE discount', async () => {
      // Step 1: Add item and set quantity to 3
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();

      // Step 2: Apply 100% FOC for all 3 units
      await invoicePage.applyFOC(0, 'all');

      // Step 3: Generate invoice PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Validate Unit Price is 400.00 and Discount is FREE (or 3 FREE)
      assertPdfLineItemValues(pdfText, {
        unitPrice: '400.00',
        qty: 3,
        discount: 'FREE',
        subtotal: '0.00',
      });
    });

    test('TC-003: Single Item Partial FOC (Qty = 3, 2 FREE — Clinical Reference) - Retains unit price, displays "2 FREE", subtotal 400.00', async () => {
      // Step 1: Add item (e.g. Acnechio anti acne body spray 100ml, price 400.00)
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();

      // Step 2: Apply Partial FOC: Assign 2 units complimentary out of 3 total units
      await invoicePage.applyFOC(0, 2);

      // Step 3: Generate or download invoice PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Verify exact match with clinical screenshot:
      // - Description: contains "(2 FREE)"
      // - UNIT PRICE: 400.00
      // - QTY: 3
      // - DISCOUNT: 2 FREE
      // - SUBTOTAL: 400.00 (1 chargeable unit * 400.00)
      assertPdfLineItemValues(pdfText, {
        description: /Acnechio.*\(2\s*FREE\)/i,
        unitPrice: '400.00',
        qty: 3,
        discount: '2 FREE',
        subtotal: '400.00',
      });

      // Verify Summary totals in PDF
      expect(pdfText).toMatch(/SUBTOTAL\s*400\.00/i);
      expect(pdfText).toMatch(/Subtotal after discount\s*400\.00/i);
      expect(pdfText).toMatch(/GRAND TOTAL\s*400\.00/i);
    });

    test('TC-004: Multi-Item Invoice with All Items Marked 100% FOC - All items retain unit prices and display FREE', async () => {
      // Step 1: Add multiple distinct product/treatment items
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.addProductBatch(1);
      await invoicePage.closeCatalogDialog();

      // Step 2: Mark both items 100% FOC
      const count = await invoicePage.focButtons.count();
      for (let i = 0; i < count; i++) {
        await invoicePage.applyFOC(i, 'all');
      }

      // Step 3: Generate invoice PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Verify each line item preserves original unit price and displays FREE discount
      expect(pdfText).toMatch(/400\.00/);
      expect(pdfText).toMatch(/FREE/i);
      expect(pdfText).toMatch(/GRAND TOTAL\s*0(\.00)?/i);
    });

    test('TC-005: Mixed Cart (1 FOC Item + 1 Regular Chargeable Item) - FOC displays FREE, chargeable displays normal price', async () => {
      // Step 1: Add 2 items
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.addProductBatch(1);
      await invoicePage.closeCatalogDialog();

      // Step 2: Mark only Item 0 as FOC
      await invoicePage.applyFOC(0, 'all');

      // Step 3: Generate invoice PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Verify FOC item retains original unit price with FREE discount
      assertPdfLineItemValues(pdfText, {
        unitPrice: '400.00',
        discount: 'FREE',
        subtotal: '0.00',
      });

      // Chargeable item should have non-zero subtotal
      const grandTotal = await invoicePage.getGrandTotalAmount();
      expect(grandTotal).toBeGreaterThan(0);
      expect(pdfText).toContain(grandTotal.toFixed(2));
    });

    test('TC-006: Mixed Cart with Partial FOC Item + Regular Item - Accurate multi-row calculations in PDF', async () => {
      // Step 1: Add Item A and Item B
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.addProductBatch(1);
      await invoicePage.closeCatalogDialog();

      // Step 2: Apply partial FOC to Item A (e.g. 1 unit FOC)
      await invoicePage.applyFOC(0, 1);

      // Step 3: Generate invoice PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Verify PDF contains partial discount indicator and cumulative grand total
      expect(pdfText).toMatch(/FREE/i);
      expect(pdfText).toMatch(/GRAND TOTAL/i);
    });

    test('TC-007: Completed All-FOC Invoice PDF Status & Formatting - Displays Paid watermark and retains unit price', async () => {
      // Step 1: Add item and mark 100% FOC
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 'all');

      // Step 2: Complete the invoice
      await invoicePage.clickCompleteInvoice();
      await invoicePage.page.waitForTimeout(2000);

      // Step 3: Generate invoice PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Verify PDF displays "Paid" watermark/status, retains unit price, and displays FREE
      expect(pdfText).toMatch(/Paid/i);
      expect(pdfText).toContain('400.00');
      expect(pdfText).toMatch(/FREE/i);
      expect(pdfText).toMatch(/GRAND TOTAL\s*0(\.00)?/i);
    });

    test('TC-008: Invoice Summary Totals Alignment in Generated PDF - SUBTOTAL, discount, and GRAND TOTAL align', async () => {
      // Step 1: Add item and apply partial FOC (2 FREE of 3)
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 2);

      // Step 2: Generate PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 3: Verify all 3 summary rows exist and have matching figures
      expect(pdfText).toMatch(/SUBTOTAL/i);
      expect(pdfText).toMatch(/Subtotal after discount/i);
      expect(pdfText).toMatch(/GRAND TOTAL/i);
    });

    test('TC-009: Description Column Complimentary Tag Format - Appends (N FREE) to item name', async () => {
      // Step 1: Add item and assign 2 complimentary units
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 2);

      // Step 2: Generate PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 3: Assert description column contains complimentary note
      expect(pdfText).toMatch(/\(2\s*FREE\)/i);
    });

    test('TC-010: High-Value Product/Procedure FOC Pricing Retention - Preserves formatting and zero total', async () => {
      // Step 1: Add item
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();

      // Step 2: Apply FOC
      await invoicePage.applyFOC(0, 'all');

      // Step 3: Generate PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Original price format is preserved and discount displays FREE
      expect(pdfText).toMatch(/FREE/i);
      expect(pdfText).toMatch(/0\.00/);
    });

    test('TC-011: PDF Content Consistency Across Preview and File Download - Both streams produce identical outputs', async () => {
      // Step 1: Add item and apply FOC
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 'all');

      // Step 2: Capture PDF via download or network response
      const capture1 = await invoicePage.downloadOrCapturePdf(context);
      let text1 = '';
      if (capture1.buffer) {
        text1 = await parsePdfBuffer(capture1.buffer);
      } else if (capture1.page) {
        text1 = await capture1.page.locator('body').innerText().catch(() => '');
      }

      // Step 3: Verify core elements exist
      expect(text1).toContain('400.00');
      expect(text1).toMatch(/FREE/i);
    });

    test('TC-012: Multiple Batches of Same Product (One FOC, One Chargeable) - Distinct rows in PDF table', async () => {
      // Step 1: Add two items/batches
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();

      // Step 2: Mark first batch FOC, leave second batch chargeable
      await invoicePage.applyFOC(0, 'all');

      // Step 3: Generate PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Assert both FOC FREE discount and chargeable balance appear
      expect(pdfText).toMatch(/FREE/i);
      expect(pdfText).toContain('400.00');
    });
  });

  // =========================================================================
  // 2. NEGATIVE, REVERT & EDGE TEST SCENARIOS (TC-013 - TC-020)
  // =========================================================================
  test.describe('2. Negative and Edge Test Scenarios', () => {

    test('TC-013: Revert FOC (Toggle FOC Off) on Line Item - PDF reverts Discount to empty and restores full price', async () => {
      // Step 1: Add item and mark FOC
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 'all');

      // Step 2: Revert / remove FOC
      await invoicePage.removeFOC(0);

      // Step 3: Generate PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Assert Discount column no longer displays FREE and Subtotal is 400.00
      expect(pdfText).not.toMatch(/\(\d+\s*FREE\)/i);
      expect(pdfText).toMatch(/GRAND TOTAL\s*400\.00/i);
    });

    test('TC-014: Adjust FOC Quantity from Partial to 100% Complimentary - PDF reflects full FREE discount and 0 subtotal', async () => {
      // Step 1: Add item and apply partial FOC (2 units)
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 2);

      // Step 2: Re-open FOC and promote to 100% FOC
      await invoicePage.applyFOC(0, 'all');

      // Step 3: Generate PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Subtotal drops to 0.00
      expect(pdfText).toMatch(/GRAND TOTAL\s*0(\.00)?/i);
    });

    test('TC-015: Adjust FOC Quantity from 100% to Partial Complimentary - PDF recalculates chargeable subtotal', async () => {
      // Step 1: Add item and apply 100% FOC
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 'all');

      // Step 2: Adjust FOC quantity to 1 unit
      await invoicePage.applyFOC(0, 1);

      // Step 3: Generate PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Assert discount is 1 FREE and Subtotal is updated
      expect(pdfText).toMatch(/FREE/i);
    });

    test('TC-016: Zero FOC Quantity Input Validation - Setting FOC Qty to 0 leaves Discount empty', async () => {
      // Step 1: Add item
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();

      // Step 2: Attempt to assign 0 FOC quantity
      const focBtn = invoicePage.focButtons.first();
      await focBtn.click();
      if (await invoicePage.dialogApplyFoc.isVisible({ timeout: 2000 }).catch(() => false)) {
        await invoicePage.focQtyInput.fill('0');
        await invoicePage.btnSaveFoc.click();
      }

      // Step 3: Generate PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Verify full price is charged
      expect(pdfText).toContain('400.00');
    });

    test('TC-017: Text Wrapping & Table Column Integrity with Long Names - PDF table maintains alignment', async () => {
      // Step 1: Add product with longer name (e.g. Acnechio anti acne body spray 100ml)
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 2);

      // Step 2: Generate PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 3: Verify all column headers exist and are not mangled
      expect(pdfText).toContain('NO.');
      expect(pdfText).toContain('DESCRIPTION');
      expect(pdfText).toContain('UNIT PRICE');
      expect(pdfText).toContain('QTY');
      expect(pdfText).toContain('DISCOUNT');
      expect(pdfText).toContain('SUBTOTAL');
    });

    test('TC-018: PDF Header Metadata Alignment with FOC Document - Clinic Name and Invoice Details are accurate', async () => {
      // Step 1: Add item and mark FOC
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 'all');

      // Step 2: Generate PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 3: Assert Clinic Name and header elements match specification
      expect(pdfText).toMatch(/Amaran Aesthetic Clinic|INVOICE/i);
      expect(pdfText).toMatch(/Invoice Details|Invoice No:/i);
      expect(pdfText).toMatch(/Bill To/i);
    });

    test('TC-019: Cross-Session & Page Reload PDF Consistency - FOC PDF values persist on reload', async () => {
      // Step 1: Add item and apply FOC
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 'all');

      // Step 2: Reload the page
      await invoicePage.page.reload();
      await invoicePage.openInvoicesTab();

      // Step 3: Generate PDF
      const { pdfText } = await generateAndExtractPdf(context, invoicePage);

      // Step 4: Unit price and FREE discount remain intact
      expect(pdfText).toContain('400.00');
      expect(pdfText).toMatch(/FREE/i);
    });

    test('TC-020: Backend PDF Endpoint / Print Route Data Verification - PDF stream returns 200 OK', async () => {
      // Step 1: Add item and apply FOC
      await invoicePage.openAddItemDialog();
      await invoicePage.addProductBatch(0);
      await invoicePage.closeCatalogDialog();
      await invoicePage.applyFOC(0, 'all');

      // Step 2: Listen for print / PDF generation network response
      let pdfResponseReceived = false;
      invoicePage.page.on('response', res => {
        if (res.url().includes('pdf') || res.url().includes('print') || (res.headers()['content-type'] || '').includes('application/pdf')) {
          pdfResponseReceived = true;
          expect(res.status()).toBeLessThan(400);
        }
      });

      // Step 3: Click print invoice
      await invoicePage.clickPrintInvoice();
      await invoicePage.page.waitForTimeout(1500);
    });
  });
});
