const path = require('path');

/**
 * ImportProductsPage.js - Page Object Model for Products & Services Import
 * URL: https://qa_care.amerck.com/products (or similar)
 *
 * Based on UI screenshot: Products & Services page with "Import Products" button
 * in the top-right area alongside "Stocks" and "+ Add Product" buttons.
 */
class ImportProductsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // ─────────────────────────────────────────────
    // Navigation
    // ─────────────────────────────────────────────
    // The Products & Services page navigation link (sidebar/top menu)
    this.productsNavLink = page.locator(
      'a:has-text("Products"), a:has-text("Pharmacy"), nav a[href*="product"], nav a[href*="pharmacy"]'
    ).first();

    // ─────────────────────────────────────────────
    // Products & Services page top-bar buttons
    // ─────────────────────────────────────────────
    this.importProductsButton = page.locator(
      'button:has-text("Import Products"), a:has-text("Import Products"), [class*="import"]'
    ).first();

    this.addProductButton = page.locator(
      'button:has-text("Add Product"), button:has-text("+ Add Product")'
    ).first();

    this.stocksButton = page.locator(
      'button:has-text("Stocks"), a:has-text("Stocks")'
    ).first();

    // Search bar on products page
    this.searchBar = page.locator('input[placeholder*="Search product" i], input[placeholder*="Search" i]').first();

    // ─────────────────────────────────────────────
    // Import Modal / Dialog elements
    // ─────────────────────────────────────────────
    this.importModal = page.locator(
      '[role="dialog"], .modal, [class*="modal"], [class*="dialog"], [class*="import-modal"]'
    ).first();

    // File input inside modal
    this.fileInput = page.locator('input[type="file"]').first();

    // File path text input (if the UI shows a text box for file path)
    this.filePathInput = page.locator(
      'input[placeholder*="file path" i], input[placeholder*="browse" i], input[placeholder*="csv" i], input[name*="file" i][type="text"]'
    ).first();

    // Browse / Choose file button
    this.browseButton = page.locator(
      'button:has-text("Browse"), button:has-text("Choose File"), label:has-text("Browse"), label[for*="file"]'
    ).first();

    // Upload / Submit / Import button inside modal
    this.uploadButton = page.locator(
      'button:has-text("Upload"), button:has-text("Import"), button:has-text("Submit"), button[type="submit"]'
    ).last();

    // Download template button
    this.downloadTemplateButton = page.locator(
      'button:has-text("Download Template"), a:has-text("Download Template"), button:has-text("template")'
    ).first();

    // Modal close / cancel button
    this.modalCloseButton = page.locator(
      'button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"], button.close, [class*="close"]'
    ).first();

    // ─────────────────────────────────────────────
    // Feedback messages
    // ─────────────────────────────────────────────
    this.successMessage = page.locator(
      '.success, .alert-success, [class*="success"], [class*="toast-success"], text=successfully, text=imported'
    ).first();

    this.errorMessage = page.locator(
      '.error, .alert-danger, [class*="error"], [class*="toast-error"], [class*="invalid"]'
    ).first();

    this.validationMessage = page.locator(
      '[class*="validation"], [class*="warning"], .alert-warning, text=required, text=invalid'
    ).first();

    // Toast / snackbar notifications
    this.toastMessage = page.locator(
      '[class*="toast"], [class*="snack"], [role="alert"], [class*="notification"]'
    ).first();
  }

  // ═══════════════════════════════════════════════
  // Navigation Methods
  // ═══════════════════════════════════════════════

  /**
   * Navigate directly to the Products page
   */
  async gotoProductsPage() {
    // Navigate to Aesthetic Settings
    await this.page.goto('/admin/aesthetic-settings');
    await this.page.waitForLoadState('networkidle');

    // Click on the Products & Services card
    const productsCard = this.page.locator('text=Products & Services').first();
    await productsCard.waitFor({ state: 'visible', timeout: 10000 });
    await productsCard.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click Import Products button to open the modal
   */
  async openImportModal() {
    await this.importProductsButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.importProductsButton.click();
    await this.page.waitForTimeout(500); // Wait for modal animation
  }

  // ═══════════════════════════════════════════════
  // File Upload Methods
  // ═══════════════════════════════════════════════

  /**
   * Upload a file using the native file input
   * @param {string} filePath - Absolute path to the file
   */
  async uploadFile(filePath) {
    await this.fileInput.waitFor({ state: 'attached', timeout: 10000 });
    await this.fileInput.setInputFiles(filePath);
  }

  /**
   * Upload via file chooser (handles button-triggered file dialogs)
   * @param {string} filePath - Absolute path to the file
   */
  async uploadViaFileChooser(filePath) {
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.browseButton.click(),
    ]);
    await fileChooser.setFiles(filePath);
  }

  /**
   * Type file path into the text input (if UI has a text field)
   * @param {string} filePath
   */
  async typeFilePath(filePath) {
    await this.filePathInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.filePathInput.fill(filePath);
  }

  /**
   * Click the Upload/Import/Submit button
   */
  async clickUpload() {
    await this.uploadButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.uploadButton.click();
  }

  /**
   * Close/cancel the import modal
   */
  async closeModal() {
    try {
      await this.modalCloseButton.click({ timeout: 3000 });
    } catch {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(300);
  }

  /**
   * Wait for any toast/alert message and return its text
   * @param {number} timeout
   * @returns {Promise<string>}
   */
  async waitForToastMessage(timeout = 10000) {
    await this.toastMessage.waitFor({ state: 'visible', timeout });
    return await this.toastMessage.innerText();
  }

  /**
   * Get the current count of products displayed on the page
   * @returns {Promise<number>}
   */
  async getProductCount() {
    const cards = this.page.locator('[class*="product-card"], [class*="card"], .product-item');
    return await cards.count();
  }

  /**
   * Search for a product by name
   * @param {string} name
   */
  async searchProduct(name) {
    await this.searchBar.fill(name);
    await this.page.waitForTimeout(800); // debounce
  }

  /**
   * Check if a product with given name exists on the page
   * @param {string} productName
   * @returns {Promise<boolean>}
   */
  async productExists(productName) {
    const locator = this.page.locator(`text=${productName}`).first();
    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { ImportProductsPage };
