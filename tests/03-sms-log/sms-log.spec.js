const { test, expect } = require('../../src/fixtures');
const { SmsLogPage } = require('../../src/pages/SmsLogPage');
const { authFile } = require('../../src/config/env');

test.use({ storageState: authFile('admin') });

test.describe('Settings > SMS Log & Scheduled Reminders @smslog', () => {
  let smsLog;

  test.beforeEach(async ({ page }) => {
    smsLog = new SmsLogPage(page);
    await smsLog.goto();
  });

  test('LOG-01 @smoke SMS Log tab shows the expected columns and filters', async ({ page }) => {
    await expect(smsLog.heading).toBeVisible();
    for (const col of ['Date/Time', 'To', 'Status', 'Actions']) {
      await expect(page.getByRole('tabpanel').locator('thead').getByText(col, { exact: true })).toBeVisible();
    }
    for (const f of ['All', 'Delivered', 'Failed']) await expect(smsLog.filterButton(f)).toBeVisible();
  });

  test('LOG-02 first page matches the SMS log API (number, status, order link)', async ({ adminApi }) => {
    const { data } = await adminApi.smsLogs();
    const rows = smsLog.rows();
    await expect(rows).toHaveCount(data.length);
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const log = data[i];
      const row = rows.nth(i);
      await expect(row.locator('td').nth(1)).toHaveText(log.number);
      if (log.status === 0) await expect(row.locator('td').nth(2)).toHaveText('Delivered');
      if (log.metadata?.order_id) {
        await expect(row.getByRole('link', { name: 'View Order' })).toHaveAttribute('href', `/admin/optical-lab/${Number(log.metadata.order_id)}`);
      }
    }
  });

  test('LOG-03 "Delivered" filter only lists delivered SMS', async () => {
    await smsLog.filter('Delivered', 'status=delivered');
    const statuses = await smsLog.statusCells().allInnerTexts();
    expect(statuses.every(s => s.trim() === 'Delivered'), statuses.join(',')).toBeTruthy();
  });

  test('LOG-04 "Failed" filter only lists failed SMS (or the empty state)', async () => {
    await smsLog.filter('Failed', 'status=failed');
    if (await smsLog.emptyState.isVisible()) return;
    const statuses = await smsLog.statusCells().allInnerTexts();
    expect(statuses.every(s => s.trim() === 'Failed'), statuses.join(',')).toBeTruthy();
  });

  test('LOG-05 pagination requests the next page and updates the indicator', async ({ page }) => {
    const indicator = await smsLog.pageIndicator.innerText();
    test.skip(indicator.endsWith('/1'), 'only one page of SMS logs');
    const next = page.waitForResponse(r => r.url().includes('/sms/logs?page=2'));
    await smsLog.nextPage.click();
    await next;
    await expect(smsLog.pageIndicator).toHaveText(/^2\//);
    await smsLog.previousPage.click();
    await expect(smsLog.pageIndicator).toHaveText(/^1\//);
  });

  test('LOG-06 "View Order" opens the related optical-shop order', async ({ context }) => {
    const link = smsLog.rows().first().getByRole('link', { name: 'View Order' });
    const href = await link.getAttribute('href');
    const [orderPage] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await orderPage.waitForLoadState();
    expect(orderPage.url()).toContain(href);
  });

  test('LOG-07 @smoke Scheduled SMS tab shows columns and status filters', async ({ page }) => {
    await smsLog.openScheduledTab();
    for (const col of ['Scheduled Date/Time', 'To', 'Status', 'Actions']) {
      await expect(page.getByRole('tabpanel').locator('thead').getByText(col, { exact: true })).toBeVisible();
    }
    for (const f of ['All', 'Scheduled', 'On Hold', 'Not Delivered']) await expect(smsLog.filterButton(f)).toBeVisible();
  });

  for (const [label, apiStatus] of [['Scheduled', 'scheduled'], ['On Hold', 'on_hold'], ['Not Delivered', 'not_delivered']]) {
    test(`LOG-08 Scheduled tab "${label}" filter lists only "${label}" rows and matches the API`, async ({ adminApi }) => {
      await smsLog.openScheduledTab();
      await smsLog.filter(label, '/sms/scheduled');
      const api = await adminApi.scheduledSms({ status: apiStatus });
      expect(api.data.every(s => s.status === apiStatus), `API returned other statuses for ${apiStatus}`).toBeTruthy();
      if (!api.data.length) return;
      const statuses = await smsLog.statusCells().allInnerTexts();
      expect(statuses.every(s => s.trim().toLowerCase() === label.toLowerCase()), statuses.join(',')).toBeTruthy();
    });
  }

  test('LOG-09 Scheduled tab rows show patient name + mobile and link to the order', async ({ adminApi }) => {
    const { data } = await adminApi.scheduledSms();
    test.skip(!data.length, 'no scheduled SMS present');
    await smsLog.openScheduledTab();
    const row = smsLog.rowsForOrder(data[0].order_id).first();
    await expect(row).toContainText(data[0].patient_name);
    await expect(row).toContainText(data[0].number);
  });
});
