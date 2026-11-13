/** Settings > SMS Log & Scheduled Reminders. */
class SmsLogPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByText('SMS Log & Scheduled Reminders');
    this.smsLogTab = page.getByRole('tab', { name: 'SMS Log' });
    this.scheduledTab = page.getByRole('tab', { name: 'Scheduled SMS' });
    this.panel = page.getByRole('tabpanel');
    this.nextPage = page.getByLabel('Go to next page');
    this.previousPage = page.getByLabel('Go to previous page');
    this.pageIndicator = this.panel.getByText(/^\d+\/\d+$/);
    this.emptyState = page.getByText('No records found!');
  }

  async goto() {
    await this.page.goto('/admin/settings/sms-log');
    await this.smsLogTab.waitFor({ timeout: 60_000 });
  }

  async openScheduledTab() {
    const loaded = this.page.waitForResponse(r => r.url().includes('/sms/scheduled'));
    await this.scheduledTab.click();
    await loaded;
  }

  /** Filter buttons are lower-case in the DOM and capitalised by CSS, so match case-insensitively. */
  filterButton(name) {
    return this.panel.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });
  }

  async filter(name, apiPath) {
    const loaded = this.page.waitForResponse(r => r.url().includes(apiPath));
    await this.filterButton(name).click();
    await loaded;
  }

  rows() {
    return this.panel.locator('tbody tr');
  }

  rowsForOrder(orderId) {
    return this.rows().filter({ has: this.page.locator(`a[href="/admin/optical-lab/${orderId}"]`) });
  }

  statusCells() {
    return this.rows().locator('td:nth-child(3)');
  }
}

module.exports = { SmsLogPage };
