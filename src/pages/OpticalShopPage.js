const { expect } = require('@playwright/test');
const { PatientSearchDialog } = require('./PatientSearchDialog');

const ORDER_PUT = /\/optical-system\/orders\/\d+$/;

/** Optical Shop: /admin/optical-lab (list) and /admin/optical-lab/:id (order detail). */
class OpticalShopPage {
  constructor(page) {
    this.page = page;
    this.newOrderButton = page.getByRole('button', { name: 'New Order' });
    this.searchInput = page.getByPlaceholder('Search…');
    this.statusFilter = page.getByRole('combobox').filter({ hasText: /^(All|Not Started|Pending Advance|Advance Paid|In Progress|QC Failed|QC Passed|Ready for Collection|Collected|Cancelled)$/ });

    // order detail
    this.statusValue = page.locator('xpath=//label[normalize-space()="Status"]/following::*[normalize-space()][1]');
    this.inventoryItemButton = page.getByRole('button', { name: 'Inventory Item' });
    this.customItemButton = page.getByRole('button', { name: 'Custom Item' });
    // Consultation orders: "Collect Advance Payment"; walk-in orders: "Collect Payment".
    this.collectAdvanceButton = page.getByRole('button', { name: /^Collect (Advance )?Payment$/ });
    this.cancelOrderButton = page.getByRole('button', { name: 'Cancel Order' });
    this.startOrderButton = page.getByRole('button', { name: 'Start Order' });
    // UI spells it "Recieved"; accept both so a typo fix does not break the suite.
    this.markReceivedButton = page.getByRole('button', { name: /Mark as Rec(ie|ei)ved/ });
    this.readyForCollectionButton = page.getByRole('button', { name: 'Ready for Collection' });
    this.pendingPaymentButton = page.getByRole('button', { name: 'Pending Payment' });
    this.markCollectedButton = page.getByRole('button', { name: 'Mark as Collected' });
    this.dialog = page.getByRole('dialog');
    this.collectDialog = new CollectDialog(page);
  }

  async gotoList() {
    await this.page.goto('/admin/optical-lab');
    await this.newOrderButton.waitFor();
  }

  async filterByStatus(label) {
    await this.statusFilter.click();
    const loaded = this.page.waitForResponse(r => r.url().includes('/optical-system/orders?'));
    await this.page.getByRole('option', { name: label, exact: true }).click();
    await loaded;
    await this.page.locator('tbody tr').first().waitFor();
  }

  async openOrder(orderId) {
    await this.page.goto(`/admin/optical-lab/${orderId}`);
    await this.statusValue.waitFor({ timeout: 60_000 });
  }

  async expectStatus(label) {
    await expect(this.statusValue).toHaveText(label, { timeout: 30_000 });
  }

  /** Runs an order-changing action and waits for the backend to accept the PUT. */
  async saving(action) {
    const saved = this.page.waitForResponse(r => ORDER_PUT.test(r.url()) && r.request().method() === 'PUT');
    await action();
    const res = await saved;
    expect(res.ok(), `order update failed: HTTP ${res.status()}`).toBeTruthy();
  }

  async addInventoryItem(code) {
    await this.inventoryItemButton.click();
    const card = this.dialog
      .getByText(new RegExp(`^${code} - `))
      .locator('xpath=ancestor::*[.//button[normalize-space()="Add to Order"]][1]');
    await card.getByRole('button', { name: 'Add to Order' }).click();
    await this.dialog.getByRole('button', { name: 'Close' }).click();
    await expect(this.dialog).toBeHidden();
    await expect(this.page.getByText(new RegExp(`^${code} - `)).first()).toBeVisible();
  }

  async addCustomItem({ name, price, quantity = 1, sku, description }) {
    await this.customItemButton.click();
    await this.dialog.locator('input[name="name"]').fill(name);
    if (sku) await this.dialog.locator('input[name="sku"]').fill(sku);
    if (description) await this.dialog.locator('input[name="description"]').fill(description);
    await this.dialog.locator('input[name="price"]').fill(String(price));
    await this.dialog.locator('input[name="quantity"]').fill(String(quantity));
    await this.dialog.getByRole('button', { name: 'Confirm' }).click();
  }

  /** Opens the "Collect Advance Payment" dialog. Defaults: 50% advance. */
  async openAdvanceDialog() {
    await this.collectAdvanceButton.first().click(); // walk-in renders a nested button
    await this.dialog.getByText(/^Collect (Advance )?Payment$/).first().waitFor();
    return {
      advanceInput: this.dialog.locator('input[name="advancePayment"]'),
      discountInput: this.dialog.locator('input[name="discount_amount"]'),
      confirm: this.dialog.getByRole('button', { name: 'Confirm' }),
      cancel: this.dialog.getByRole('button', { name: 'Cancel' }),
    };
  }

  async collectAdvancePayment({ advance } = {}) {
    const dlg = await this.openAdvanceDialog();
    if (advance !== undefined) await dlg.advanceInput.fill(String(advance));
    // Consultation orders POST a sales order; walk-in orders PUT the order and the backend creates it.
    const saved = this.page.waitForResponse(r => /\/optical-system\/(sales-orders|orders\/\d+)$/.test(r.url()) && r.request().method() !== 'GET');
    await dlg.confirm.click();
    await saved;
    // Consultation orders return to the list; walk-in orders stay on the order page.
    await expect(this.dialog).toBeHidden({ timeout: 60_000 });
  }

  async startOrder() {
    await this.saving(() => this.startOrderButton.click());
    await this.expectStatus('In Progress');
  }

  async markReceived({ qc, notes = '' }) {
    await this.markReceivedButton.click();
    await this.dialog.getByPlaceholder(/Optional notes about the QC status/).fill(notes);
    await this.saving(() => this.dialog.getByRole('button', { name: qc === 'passed' ? 'QC Passed' : 'QC Failed' }).click());
    await this.expectStatus(qc === 'passed' ? 'QC Passed' : 'QC Failed');
  }

  async markReadyForCollection() {
    await this.readyForCollectionButton.click();
    await this.dialog.getByText('The patient will be notified via an SMS').waitFor();
    await this.saving(() => this.dialog.getByRole('button', { name: 'Confirm' }).click());
    await this.expectStatus('Ready');
  }

  async cancelOrder({ confirm = true } = {}) {
    await this.cancelOrderButton.click();
    await this.dialog.getByText('Are you sure you want to cancel this order?').waitFor();
    await this.dialog.getByRole('button', { name: confirm ? 'Yes' : 'No' }).click();
  }

  /** Walk-in order from the Optical Shop "New Order" button. Returns the new order id. */
  async createWalkInOrder(patient) {
    await this.newOrderButton.click();
    const search = new PatientSearchDialog(this.page);
    await search.search(patient.mobile);
    await search.select(patient.name);
    await this.page.waitForURL(/\/optical-lab\/\d+$/, { timeout: 60_000 });
    return Number(this.page.url().match(/(\d+)$/)[1]);
  }
}

/** "Mark Order as Collected" popup holding the Next Visit Recommendation. */
class CollectDialog {
  constructor(page) {
    this.page = page;
    this.root = page.getByRole('dialog');
    this.remarks = this.root.locator('#remarks');
    this.confirm = this.root.getByRole('button', { name: 'Confirm' });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.nextVisitHeading = this.root.getByText('Next Visit Recommendation', { exact: true });
    this.customizedButton = this.root.getByRole('button', { name: 'Customized' });
    this.pickDateButton = this.root.getByRole('button', { name: /Pick a date|\d{4}|[A-Z][a-z]+ \d{1,2}/ }).filter({ hasNotText: /Min|Customized|Confirm|Close/ });
    this.scheduledPreview = this.root.locator('xpath=.//*[normalize-space()="Scheduled Next Visit:"]/following::*[normalize-space()][1]');
  }

  async open(shop) {
    await shop.markCollectedButton.click();
    await this.root.getByText('Mark Order as Collected').waitFor();
  }

  option(label) {
    return this.root.getByRole('button', { name: label, exact: true });
  }

  async choose(label) {
    await this.option(label).click();
  }

  /** Picks a day in the react-day-picker calendar; monthOffset = months ahead of the current month. */
  async pickCustomDate({ day, monthOffset = 0 }) {
    await this.customizedButton.click();
    await this.pickDateButton.first().click();
    for (let i = 0; i < monthOffset; i++) await this.page.getByRole('button', { name: 'Go to next month' }).click();
    await this.dayCell(day).click();
  }

  /** Day cell of the displayed month (ignores the greyed "outside" days of adjacent months). */
  dayCell(day) {
    return this.page
      .getByRole('grid')
      .locator('button[name="day"]:not([class*="outside"])')
      .filter({ hasText: new RegExp(`^${day}$`) })
      .first();
  }

  async submit(remarks) {
    if (remarks !== undefined) await this.remarks.fill(remarks);
    const saved = this.page.waitForResponse(r => ORDER_PUT.test(r.url()) && r.request().method() === 'PUT');
    await this.confirm.click();
    const res = await saved;
    return res.request().postDataJSON();
  }
}

module.exports = { OpticalShopPage, CollectDialog };
