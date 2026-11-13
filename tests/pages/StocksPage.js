// @ts-check

/**
 * Page Object Model for AMERCK CARE Stocks / Inventory Module
 * Target: https://qa_care.amerck.com/admin/aesthetic-settings/products/batches
 */
class StocksPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Headings & Navigation
    this.heading = page.locator('h6:has-text("Stocks"), text="Stocks"').first();
    this.tabByBatch = page.getByRole('tab', { name: /By Batch/i });
    this.tabByProduct = page.getByRole('tab', { name: /By Product/i });

    // Search inputs
    this.productSearchInput = page.getByPlaceholder('Search products...');
    this.batchSearchInput = page.getByPlaceholder('Search batch number...');

    // Products list / accordion
    this.productRows = page.locator('main').locator('div, button').filter({ hasText: /SKU:|Total Stock:/i });
    this.batchesTable = page.locator('table').first();
    this.batchTableRows = page.locator('table tbody tr');
  }

  /**
   * Navigate directly to the Stocks page
   */
  async goto() {
    await this.page.goto('/admin/aesthetic-settings/products/batches', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await this.tabByBatch.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Switch to "By Product" tab
   */
  async openByProductTab() {
    await this.tabByProduct.waitFor({ state: 'visible', timeout: 10000 });
    await this.tabByProduct.click();
    await this.productSearchInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Switch to "By Batch" tab
   */
  async openByBatchTab() {
    await this.tabByBatch.waitFor({ state: 'visible', timeout: 10000 });
    await this.tabByBatch.click();
    await this.batchSearchInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Filter products by name
   * @param {string} productName
   */
  async searchProduct(productName) {
    await this.productSearchInput.fill(productName);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Expand the accordion for a specific product
   * @param {string} productName
   */
  async expandProduct(productName) {
    const productItem = this.page.locator('main div, main button')
      .filter({ hasText: new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
      .filter({ hasText: /Total Stock:/i })
      .first();

    await productItem.waitFor({ state: 'visible', timeout: 15000 });
    await productItem.click();
    // Wait for the batches table to render
    await this.batchesTable.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Get all batch rows under the currently expanded product
   * @returns {Promise<Array<{ batchNumber: string, qtyAdded: number, available: number, totalAdded: number, price: string, expiry: string }>>}
   */
  async getProductBatches() {
    await this.batchesTable.waitFor({ state: 'visible', timeout: 10000 });
    const rows = await this.batchTableRows.all();
    const batches = [];

    for (const row of rows) {
      const cells = await row.locator('td').allInnerTexts();
      if (cells.length >= 6) {
        const batchNum = cells[0].trim();
        const qtyAdded = parseInt(cells[1].replace(/,/g, '').trim(), 10) || 0;

        // "Available" column can be "41 / 70" or "41"
        const availRaw = cells[2].trim();
        let available = 0;
        let totalAdded = qtyAdded;
        if (availRaw.includes('/')) {
          const parts = availRaw.split('/');
          available = parseInt(parts[0].replace(/,/g, '').trim(), 10) || 0;
          totalAdded = parseInt(parts[1].replace(/,/g, '').trim(), 10) || qtyAdded;
        } else {
          available = parseInt(availRaw.replace(/,/g, '').trim(), 10) || 0;
        }

        batches.push({
          batchNumber: batchNum,
          qtyAdded,
          available,
          totalAdded,
          price: cells[4]?.trim() || '',
          expiry: cells[5]?.trim() || '',
        });
      }
    }
    return batches;
  }

  /**
   * Get available stock for a specific batch number
   * @param {string} productName
   * @param {string} batchNumber
   * @returns {Promise<number>}
   */
  async getAvailableStockForBatch(productName, batchNumber) {
    await this.searchProduct(productName);
    await this.expandProduct(productName);
    const batches = await this.getProductBatches();
    const target = batches.find(b => b.batchNumber.toLowerCase().includes(batchNumber.toLowerCase()));
    if (!target) {
      throw new Error(`Batch "${batchNumber}" not found for product "${productName}" in Stocks page.`);
    }
    return target.available;
  }

  /**
   * Reload and re-fetch available stock for a batch (useful for cross-tab check)
   * @param {string} productName
   * @param {string} batchNumber
   * @returns {Promise<number>}
   */
  async refreshAndGetAvailableStock(productName, batchNumber) {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.openByProductTab();
    return await this.getAvailableStockForBatch(productName, batchNumber);
  }
}

module.exports = { StocksPage };
