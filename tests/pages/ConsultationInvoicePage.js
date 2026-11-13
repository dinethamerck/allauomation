// @ts-check

/**
 * Page Object Model for Consultation & Invoice Module
 * Target: https://qa_care.amerck.com/admin/aesthetic-schedule/appointments/:id
 */
class ConsultationInvoicePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Navigation Tabs inside Consultation view
    this.tabConsultation = page.locator('button, a, [role="tab"]').filter({ hasText: /^Consultation$/i }).first();
    this.tabHistory = page.locator('button, a, [role="tab"]').filter({ hasText: /^History$/i }).first();
    this.tabScheduling = page.locator('button, a, [role="tab"]').filter({ hasText: /^Scheduling$/i }).first();
    this.tabTreatments = page.locator('button, a, [role="tab"]').filter({ hasText: /^Treatments$/i }).first();
    this.tabInvoices = page.locator('button, a, [role="tab"]').filter({ hasText: /^Invoices?$/i }).first();

    // Invoices Screen Buttons
    this.btnNewInvoice = page.locator('button').filter({ hasText: /New Invoice/i }).first();
    this.btnAddItem = page.locator('button').filter({ hasText: /Add Item/i }).first();
    this.btnRecordPayment = page.locator('button').filter({ hasText: /Record Payment/i }).first();
    this.btnPrintInvoice = page.locator('button').filter({ hasText: /Print Invoice/i }).first();
    this.btnCompleteInvoice = page.locator('button').filter({ hasText: /Complete Invoice/i }).first();
    this.btnDiscard = page.locator('button').filter({ hasText: /Discard/i }).first();

    // "Add Items to Invoice" Dialog / Modal
    this.catalogDialog = page.locator('[role="dialog"], div.fixed').first();
    this.catalogSearchInput = page.locator('input[placeholder*="Search treatments or products"], input[placeholder*="Search"]').first();
    this.catalogItems = page.locator('button, div').filter({ hasText: /Batch:/i });

    // Added Items Column (Right Side of Modal)
    this.addedItemsHeader = page.locator('text=/ADDED ITEMS/i').first();
    this.addedItemsList = page.locator('div').filter({ hasText: /each/i });
    this.btnDoneCatalog = page.locator('[role="dialog"] button').filter({ hasText: /Done|Save|Close|✕/i }).first();

    // Line items on Invoice View & FOC Elements
    this.invoiceLineItems = page.locator('div').filter({ hasText: /UNIT PRICE/i });
    this.focButtons = page.locator('button').filter({ hasText: /FOC/i });
    this.dialogApplyFoc = page.locator('[role="dialog"]').filter({ hasText: /Apply FOC/i });
    this.focQtyInput = this.dialogApplyFoc.locator('input[type="number"], input').first();
    this.btnSaveFoc = this.dialogApplyFoc.locator('button').filter({ hasText: /^Save$/i }).first();
    this.btnRemoveFoc = this.dialogApplyFoc.locator('button').filter({ hasText: /Remove FOC/i }).first();
    this.btnCancelFoc = this.dialogApplyFoc.locator('button').filter({ hasText: /^Cancel$/i }).first();

    // Totals, Status, and Document Representation
    this.grandTotalText = page.locator('text=/Grand Total/i').first();
    this.subtotalText = page.locator('text=/Subtotal/i').first();
    this.invoiceStatusBadge = page.locator('span, div, [class*="badge"]').filter({ hasText: /^(Paid|Draft|Unpaid)$/i }).first();
    this.documentTypeHeader = page.locator('h1, h2, h3, h4, span, div').filter({ hasText: /^(Invoice|Quotation)$/i }).first();
  }


  /**
   * Switch to Invoices tab and ensure invoice editor is open
   */
  async openInvoicesTab() {
    await this.tabInvoices.waitFor({ state: 'visible', timeout: 15000 });
    await this.tabInvoices.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Create and switch to a brand new invoice draft
   */
  async createNewInvoice() {
    const btnNewInvoice = this.page.getByRole('button', { name: /New Invoice/i }).first();
    await btnNewInvoice.waitFor({ state: 'visible', timeout: 15000 });
    await btnNewInvoice.click();

    const dialog = this.page.locator('[role="dialog"]').filter({ hasText: /New Invoice/i });
    await dialog.waitFor({ state: 'visible', timeout: 10000 });

    // Wait until server returns next-invoice-number and populates Reference No field
    const refInput = dialog.locator('input').first();
    await refInput.waitFor({ state: 'visible', timeout: 5000 });
    for (let i = 0; i < 20; i++) {
      const val = await refInput.inputValue().catch(() => '');
      if (val && val.trim().length > 0) break;
      await this.page.waitForTimeout(250);
    }

    const btnCreate = dialog.getByRole('button', { name: /Create Invoice/i });
    await btnCreate.waitFor({ state: 'visible', timeout: 5000 });

    await Promise.all([
      this.page.waitForResponse(res => res.url().includes('invoices') && res.request().method() === 'POST', { timeout: 10000 }).catch(() => null),
      btnCreate.click(),
    ]);

    await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(async () => {
      const btnClose = dialog.locator('button').filter({ hasText: /Close|✕/i }).last();
      if (await btnClose.isVisible().catch(() => false)) await btnClose.click().catch(() => {});
    });

    await this.page.waitForTimeout(1000);
    await this.btnAddItem.waitFor({ state: 'visible', timeout: 15000 });
  }


  /**
   * Open the "Add Items to Invoice" catalog dialog
   */
  async openAddItemDialog() {
    await this.btnAddItem.click();
    await this.catalogSearchInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Search within the catalog
   * @param {string} query
   */
  async searchCatalog(query) {
    await this.catalogSearchInput.fill(query);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get available stock information for a specific batch in the catalog dialog
   * @param {string} batchNumber
   */
  async getCatalogItemInfo(batchNumber) {
    const card = this.page.locator('div').filter({ hasText: new RegExp(`Batch:\\s*${batchNumber}`, 'i') }).first();
    await card.waitFor({ state: 'visible', timeout: 10000 });
    const text = await card.innerText();
    const availMatch = text.match(/Available:\s*(\d+)/i);
    const available = availMatch ? parseInt(availMatch[1], 10) : 0;
    const addedMatch = text.match(/Added\s*\((\d+)\)/i);
    const added = addedMatch ? parseInt(addedMatch[1], 10) : 0;

    return {
      text,
      available,
      added,
      cardLocator: card,
    };
  }

  /**
   * Add a product batch item to the invoice
   * @param {string|number} [batchNumberOrIndex]
   */
  async addProductBatch(batchNumberOrIndex) {
    if (typeof batchNumberOrIndex === 'number') {
      const addButtons = this.page.locator('[role="dialog"]').getByRole('button', { name: 'Add', exact: true });
      await addButtons.nth(batchNumberOrIndex).waitFor({ state: 'visible', timeout: 10000 });
      await addButtons.nth(batchNumberOrIndex).click();
    } else if (typeof batchNumberOrIndex === 'string') {
      const row = this.page.locator('[role="dialog"] div').filter({
        hasText: new RegExp(batchNumberOrIndex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      }).filter({
        has: this.page.getByRole('button', { name: 'Add', exact: true }),
      }).last();
      const btnAdd = row.getByRole('button', { name: 'Add', exact: true });
      await btnAdd.click();
    } else {
      const btnAdd = this.page.locator('[role="dialog"]').getByRole('button', { name: 'Add', exact: true }).first();
      await btnAdd.click();
    }
    await this.page.waitForTimeout(1000);
  }


  /**
   * Close catalog dialog if open
   */
  async closeCatalogDialog() {
    if (await this.btnDoneCatalog.isVisible().catch(() => false)) {
      await this.btnDoneCatalog.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Discard current draft invoice
   */
  async discardDraftInvoice() {
    if (await this.btnDiscard.isVisible().catch(() => false)) {
      await this.btnDiscard.click();
      await this.page.waitForTimeout(1000);
      // Confirm if a confirmation dialog appears
      const confirmBtn = this.page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Discard")').last();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Parse numeric grand total amount from invoice view
   * @returns {Promise<number>}
   */
  async getGrandTotalAmount() {
    const parent = this.grandTotalText.locator('..');
    const text = await parent.innerText();
    const matches = text.match(/[\d,]+(?:\.\d+)?/g);
    if (matches && matches.length > 0) {
      // Pick the last number (handles cases where original price is struck through)
      const lastNumberStr = matches[matches.length - 1].replace(/,/g, '');
      return parseFloat(lastNumberStr) || 0;
    }
    return 0;
  }

  /**
   * Apply FOC to a line item by index (0-based)
   * Core Business Logic (EMR-98):
   * - If item quantity is 1: Clicking FOC toggles it directly without any popup.
   * - If item quantity > 1: Clicking FOC opens the 'Apply FOC' popup modal.
   * @param {number} [itemIndex=0]
   * @param {number|'all'} [focQuantity='all']
   */
  async applyFOC(itemIndex = 0, focQuantity = 'all') {
    const focBtn = this.focButtons.nth(itemIndex);
    await focBtn.waitFor({ state: 'visible', timeout: 8000 });
    await focBtn.click();

    // Check if the Apply FOC modal appears (only appears when quantity > 1)
    const isDialogVisible = await this.dialogApplyFoc.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);

    if (isDialogVisible) {
      if (focQuantity === 'all') {
        const dialogText = await this.dialogApplyFoc.innerText();
        const match = dialogText.match(/Total Quantity:\s*(\d+)/i);
        const totalQty = match ? match[1] : '1';
        await this.focQtyInput.fill(totalQty);
      } else {
        await this.focQtyInput.fill(String(focQuantity));
      }
      await this.btnSaveFoc.click();
      await this.dialogApplyFoc.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
    await this.page.locator('text=/Saving/i').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    await this.page.waitForTimeout(800);
  }

  /**
   * Remove FOC from a line item
   * Core Business Logic (EMR-98):
   * - If item quantity is 1: Clicking FOC toggles it off directly without any popup.
   * - If item quantity > 1: Clicking FOC opens the 'Apply FOC' popup modal to remove FOC.
   * @param {number} [itemIndex=0]
   */
  async removeFOC(itemIndex = 0) {
    const focBtn = this.focButtons.nth(itemIndex);
    await focBtn.waitFor({ state: 'visible', timeout: 8000 });
    await focBtn.click();

    // Check if Apply FOC modal appears (when quantity > 1)
    const isDialogVisible = await this.dialogApplyFoc.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
    if (isDialogVisible) {
      if (await this.btnRemoveFoc.isVisible().catch(() => false)) {
        await this.btnRemoveFoc.click();
      } else {
        await this.focQtyInput.fill('0');
        await this.btnSaveFoc.click();
      }
      await this.dialogApplyFoc.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
    await this.page.locator('text=/Saving/i').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    await this.page.waitForTimeout(800);
  }


  /**
   * Click 'Complete Invoice' button
   */
  async clickCompleteInvoice() {
    await this.btnCompleteInvoice.waitFor({ state: 'visible', timeout: 8000 });
    await this.btnCompleteInvoice.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Click 'Print Invoice' button
   */
  async clickPrintInvoice() {
    await this.btnPrintInvoice.waitFor({ state: 'visible', timeout: 8000 });
    await this.btnPrintInvoice.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get current invoice status text
   * @returns {Promise<string>}
   */
  async getInvoiceStatus() {
    if (await this.invoiceStatusBadge.isVisible().catch(() => false)) {
      return (await this.invoiceStatusBadge.innerText()).trim();
    }
    return '';
  }

  /**
   * Read the displayed invoice reference number from the header/form
   * @returns {Promise<string>}
   */
  async getInvoiceReferenceNo() {
    const refEl = this.page.locator('text=/Invoice No:|Ref(erence)? No:|AA-\\d+/i').first();
    if (await refEl.isVisible().catch(() => false)) {
      const text = await refEl.innerText();
      const match = text.match(/(AA-\d+)/i) || text.match(/(?:Invoice No:?|Ref No:?)\s*([A-Za-z0-9-]+)/i);
      if (match) return match[1];
    }
    return '';
  }

  /**
   * Capture PDF binary buffer or preview page when Print/Download Invoice is clicked
   * @param {import('@playwright/test').BrowserContext} [context]
   * @returns {Promise<{ buffer?: Buffer, page?: import('@playwright/test').Page, source: string }>}
   */
  async downloadOrCapturePdf(context) {
    let capturedBuffer = null;
    let popupPage = null;

    const downloadPromise = this.page.waitForEvent('download', { timeout: 7000 }).catch(() => null);
    const popupPromise = context ? context.waitForEvent('page', { timeout: 7000 }).catch(() => null) : Promise.resolve(null);
    const responsePromise = this.page.waitForResponse(
      res => res.url().includes('pdf') || res.url().includes('print') || (res.headers()['content-type'] || '').includes('application/pdf'),
      { timeout: 7000 }
    ).catch(() => null);

    await this.clickPrintInvoice();

    const download = await downloadPromise;
    if (download) {
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      capturedBuffer = Buffer.concat(chunks);
      return { buffer: capturedBuffer, source: 'download' };
    }

    const response = await responsePromise;
    if (response) {
      capturedBuffer = await response.body().catch(() => null);
      if (capturedBuffer) {
        return { buffer: capturedBuffer, source: 'network' };
      }
    }

    popupPage = await popupPromise;
    if (popupPage) {
      await popupPage.waitForLoadState('domcontentloaded').catch(() => {});
      return { page: popupPage, source: 'popup' };
    }

    return { page: this.page, source: 'current' };
  }

  /**
   * Parse extracted text from a PDF Buffer
   * @param {Buffer} pdfBuffer
   * @returns {Promise<string>}
   */
  async parsePdfBuffer(pdfBuffer) {
    if (!pdfBuffer || pdfBuffer.length === 0) return '';
    try {
      const pdfModule = require('pdf-parse');
      if (typeof pdfModule === 'function') {
        const data = await pdfModule(pdfBuffer);
        return data.text || '';
      }
      if (pdfModule && typeof pdfModule.default === 'function') {
        const data = await pdfModule.default(pdfBuffer);
        return data.text || '';
      }
      if (pdfModule && pdfModule.PDFParse) {
        const uint8 = new Uint8Array(pdfBuffer);
        const parser = new pdfModule.PDFParse(uint8);
        await parser.load();
        const res = await parser.getText();
        return typeof res === 'string' ? res : (res?.text || '');
      }
    } catch (err) {
      console.warn('PDF parsing error in ConsultationInvoicePage:', err.message);
    }
    return '';
  }
}


module.exports = { ConsultationInvoicePage };
