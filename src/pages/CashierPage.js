const { expect } = require('@playwright/test');

/** Cashier: /admin/optical-cashier (list) and /admin/optical-cashier/:salesOrderId (payment). */
class CashierPage {
  constructor(page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder('Search by reference number, UHID, patient name');
    this.statusFilter = page.getByRole('combobox').filter({ hasText: /Filter by Status|All|Pending|Paid/ });
    this.sapReference = page.getByPlaceholder('SAP Reference Number');
    this.markAsPaidButton = page.getByRole('button', { name: 'Mark as Paid' });
  }

  async goto() {
    await this.page.goto('/admin/optical-cashier');
    await this.searchInput.waitFor();
  }

  async openSalesOrder(salesOrderId) {
    await this.page.goto(`/admin/optical-cashier/${salesOrderId}`);
    await this.page.getByText('Payment Details').waitFor({ timeout: 60_000 });
  }

  async filterByStatus(label) {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: label, exact: true }).click();
  }

  rows() {
    return this.page.locator('tbody tr');
  }

  async markAsPaid(sapReference) {
    if (sapReference !== undefined) await this.sapReference.fill(sapReference);
    await this.markAsPaidButton.click();
  }

  async expectPaid() {
    await expect(this.page.locator('xpath=//label[normalize-space()="Status"]/following::*[normalize-space()][1]')).toHaveText('Paid', { timeout: 30_000 });
  }
}

module.exports = { CashierPage };
