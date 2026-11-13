// @ts-check

/**
 * Page Object Model for AMERCK CARE Aesthetic Settings - Products Module
 * Target: https://qa_care.amerck.com/admin/aesthetic-settings/products
 */
class ProductSettingsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Search and Header
    this.searchInput = page.locator('input[placeholder*="Search product"], input[placeholder*="Search"]').first();
    this.manageProductDialog = page.locator('[role="dialog"], div.fixed').first();
    this.productDetailsTab = page.locator('button, [role="tab"]').filter({ hasText: /^Product Details$/i }).first();
    this.batchesTab = page.locator('button, [role="tab"]').filter({ hasText: /^Batches$/i }).first();

    // Batches Table inside Manage Product modal
    this.batchesTable = page.locator('table').first();
    this.batchesRows = page.locator('table tbody tr');
    this.closeDialogBtn = page.locator('[role="dialog"] button:has-text("✕"), [role="dialog"] button[aria-label="Close"], [role="dialog"] button').filter({ hasText: /Close|✕/ }).first();
  }

  /**
   * Navigate to Product Settings
   */
  async goto() {
    await this.page.goto('/admin/aesthetic-settings/products', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Open Manage Product dialog for a specific product name
   * @param {string} productName
   */
  async openProduct(productName) {
    const productCard = this.page.getByText(productName).first();
    await productCard.waitFor({ state: 'visible', timeout: 15000 });
    await productCard.click();
    await this.batchesTab.waitFor({ state: 'visible', timeout: 10000 });
  }



  /**
   * Switch to Batches tab
   */
  async openBatchesTab() {
    await this.batchesTab.click();
    await this.batchesTable.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Extract all batch information from the Batches table
   * @returns {Promise<Array<{ batchNumber: string, qtyAdded: string, qtyAvailable: number, buyingPrice: string, price: string, expiry: string }>>}
   */
  async getBatchesData() {
    await this.batchesTable.waitFor({ state: 'visible', timeout: 10000 });
    const rows = await this.batchesRows.all();
    const batches = [];

    for (const row of rows) {
      const cells = await row.locator('td').allInnerTexts();
      if (cells.length >= 6) {
        batches.push({
          batchNumber: cells[0].trim(),
          qtyAdded: cells[1].trim(),
          qtyAvailable: parseInt(cells[2].trim(), 10) || 0,
          buyingPrice: cells[3].trim(),
          price: cells[4].trim(),
          expiry: cells[5].trim(),
        });
      }
    }
    return batches;
  }
}

module.exports = { ProductSettingsPage };
