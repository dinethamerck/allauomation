const { test, expect } = require('../../src/fixtures');
const { SmsLogPage } = require('../../src/pages/SmsLogPage');
const { ConfigurationPage } = require('../../src/pages/ConfigurationPage');
const { ALL_SMS_OFF, SMS_SETTINGS, SMS_TYPE, SMS_LOG_STATUS, NEXT_VISIT_POPUP, NEXT_VISIT_OPTIONS } = require('../../src/constants');
const { formatOrgDate } = require('../../src/utils/time');

// Regression tests for reported issues. Each test name starts with the issue it covers.
test.describe.configure({ timeout: 10 * 60_000 });

const EMPTY_STATE = 'No records found!';
const OLD_SCHEDULED_EMPTY_STATE = 'No scheduled reminders found!';
const NEXT_VISIT_LABELS = [...Object.keys(NEXT_VISIT_OPTIONS), 'Customized'];

/** Clicks "Mark as Collected", confirms whatever dialog appears, returns the order update body. */
async function markCollected(journey, remarks) {
  const { shop } = journey;
  const saved = journey.page.waitForResponse(r => /\/optical-system\/orders\/\d+$/.test(r.url()) && r.request().method() === 'PUT');
  await shop.markCollectedButton.click();
  const dialog = shop.collectDialog;
  if (await dialog.root.isVisible().catch(() => false)) {
    if (remarks) await dialog.remarks.fill(remarks).catch(() => {});
    await dialog.confirm.click();
  }
  const body = (await saved).request().postDataJSON();
  await shop.expectStatus('Collected');
  return body;
}

async function reminderLogsByOrder(adminApi) {
  const byOrder = new Map();
  for (let page = 1; page <= 50; page++) {
    const { data } = await adminApi.smsLogs({ page });
    if (!data.length) break;
    for (const log of data.filter(l => l.metadata?.type === SMS_TYPE.nextVisitReminder)) {
      const id = Number(log.metadata.order_id);
      byOrder.set(id, [...(byOrder.get(id) || []), log]);
    }
  }
  return byOrder;
}

test.describe('BUG: Scheduled SMS empty state must read "No records found!" @bugs @smslog', () => {
  test.use({ storageState: require('../../src/config/env').authFile('admin') });

  test('BUG-EMPTY-01 every SMS Log and Scheduled SMS filter shows the common empty-state message', async ({ page }) => {
    const empty = { data: [], isReminderEnabled: true, pagination: { total: 0, currentPage: 1, pageSize: 25, totalPages: 0 } };
    await page.route(/\/sms\/(logs|scheduled)\?/, route => route.fulfill({ json: empty }));
    const smsLog = new SmsLogPage(page);
    await smsLog.goto();

    const check = async (tab, filters) => {
      for (const filter of filters) {
        // Responses are mocked, so just click (the active filter does not refetch).
        await smsLog.filterButton(filter).click();
        await expect(smsLog.panel.getByText(EMPTY_STATE), `${tab} > ${filter}`).toBeVisible();
        await expect(smsLog.panel.getByText(OLD_SCHEDULED_EMPTY_STATE), `${tab} > ${filter}`).toHaveCount(0);
      }
    };
    await check('SMS Log', ['All', 'Delivered', 'Failed']);
    await smsLog.openScheduledTab();
    await check('Scheduled SMS', ['All', 'Scheduled', 'On Hold', 'Not Delivered']);
  });

  test('BUG-EMPTY-02 the same message is shown when reminders are switched off', async ({ page }) => {
    const empty = { data: [], isReminderEnabled: false, pagination: { total: 0, currentPage: 1, pageSize: 25, totalPages: 0 } };
    await page.route(/\/sms\/scheduled\?/, route => route.fulfill({ json: empty }));
    const smsLog = new SmsLogPage(page);
    await smsLog.goto();
    await smsLog.openScheduledTab();
    await expect(smsLog.panel.getByText(EMPTY_STATE)).toBeVisible();
    await expect(smsLog.panel.getByText(OLD_SCHEDULED_EMPTY_STATE)).toHaveCount(0);
  });
});

test.describe('BUG: duplicate "Delivered" entries for one scheduled reminder @bugs @scheduled', () => {
  test('BUG-DUP-01 no order has more than one reminder entry in the SMS log', async ({ adminApi }) => {
    const byOrder = await reminderLogsByOrder(adminApi);
    const duplicates = [...byOrder].filter(([, logs]) => logs.length > 1)
      .map(([orderId, logs]) => `order ${orderId}: ${logs.length}x (${logs.map(l => `#${l.id} ${l.createdAt}`).join(', ')})`);
    expect(duplicates, 'one SMS must produce exactly one log entry').toEqual([]);
  });

  test('BUG-DUP-02 every due customised-date reminder was logged exactly once', async ({ adminApi, doctorApi }) => {
    const byOrder = await reminderLogsByOrder(adminApi);
    const today = formatOrgDate(new Date());
    const customised = (await doctorApi.listOrders({ status: 'collected', pageSize: 200 }))
      .filter(o => o.metadata?.next_visit_option === 'customized' && o.metadata.next_visit_date?.slice(0, 10) <= today);
    test.skip(!customised.length, 'no customised-date reminder has fallen due yet');

    const problems = customised
      .map(o => ({ id: o.id, date: o.metadata.next_visit_date, count: (byOrder.get(o.id) || []).length }))
      .filter(o => o.count > 1);
    expect(problems, 'customised reminders with duplicate log entries').toEqual([]);
  });

  test('BUG-DUP-03 an interval reminder is delivered once and not re-logged on later scheduler cycles', async ({ journey, sms, smsConfig }) => {
    await smsConfig.set({ ...ALL_SMS_OFF, [SMS_SETTINGS.reminder.enabledKey]: true, [NEXT_VISIT_POPUP.enabledKey]: true });
    await journey.until('balancePaid');
    const since = await sms.checkpoint();
    await journey.shop.collectDialog.open(journey.shop);
    await journey.shop.collectDialog.choose('1 Min');
    await journey.shop.collectDialog.submit('BUG-DUP-03');

    const [first] = await sms.waitForSms({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.nextVisitReminder, timeout: 150_000 });
    expect(first.status).toBe(SMS_LOG_STATUS.delivered);
    await test.step('wait two more scheduler cycles', async () => {
      await sms.expectNoSms({ sinceId: first.id, orderId: journey.orderId, type: SMS_TYPE.nextVisitReminder, duration: 130_000 });
    });
    expect(await sms.logsForOrder({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.nextVisitReminder })).toHaveLength(1);
  });
});

test.describe('STORY: configuration toggles control the popup and the reminder SMS @bugs @config', () => {
  test('STORY-01 both toggles are available under Configuration with their sections', async ({ adminPage }) => {
    const config = new ConfigurationPage(adminPage);
    await config.goto();
    await expect(adminPage.getByText('Next Visit Recommendation', { exact: true })).toBeVisible();
    await expect(adminPage.getByText(/^SMS Settings?$/)).toBeVisible();
    for (const label of [NEXT_VISIT_POPUP.label, SMS_SETTINGS.reminder.label]) {
      await expect(config.label(label)).toBeVisible();
      await expect(config.switchFor(label)).toBeVisible();
    }
  });

  test('STORY-02 popup toggle ON (set in the UI) shows the Next Visit Recommendation on collection', async ({ adminPage, journey, smsConfig }) => {
    await smsConfig.set({ ...ALL_SMS_OFF, [NEXT_VISIT_POPUP.enabledKey]: false });
    const config = new ConfigurationPage(adminPage);
    await config.goto();
    await config.setToggle(NEXT_VISIT_POPUP.label, NEXT_VISIT_POPUP.enabledKey, true);

    await journey.until('balancePaid');
    await journey.shop.collectDialog.open(journey.shop);
    await expect(journey.shop.collectDialog.nextVisitHeading).toBeVisible();
    for (const label of NEXT_VISIT_LABELS) await expect(journey.shop.collectDialog.option(label)).toBeVisible();
    await journey.shop.collectDialog.close.click();
  });

  test('STORY-03 popup toggle OFF (set in the UI) hides the Next Visit Recommendation on collection', async ({ adminPage, journey, smsConfig }) => {
    await smsConfig.set({ ...ALL_SMS_OFF, [NEXT_VISIT_POPUP.enabledKey]: true });
    const config = new ConfigurationPage(adminPage);
    await config.goto();
    await config.setToggle(NEXT_VISIT_POPUP.label, NEXT_VISIT_POPUP.enabledKey, false);

    await journey.until('balancePaid');
    await journey.shop.markCollectedButton.click();
    await journey.page.waitForTimeout(1_500);
    await expect(journey.page.getByText('Next Visit Recommendation', { exact: true })).toHaveCount(0);
    for (const label of NEXT_VISIT_LABELS) await expect(journey.shop.collectDialog.option(label)).toHaveCount(0);
  });

  // Reminder toggle ON -> sent: SCH-01..03. Reminder toggle OFF -> not sent: SCH-07.
});

test.describe('BUG: reminder shown as "Scheduled" when Next Visit Recommendation is disabled @bugs @scheduled', () => {
  test('BUG-SCHED-01 popup OFF + reminder SMS ON: collecting an order must not schedule a reminder', async ({ journey, sms, smsConfig, adminApi, adminPage }) => {
    // Steps 1-3 of the report: Next Visit Recommendation = No, Next Visit Reminder SMS = Yes.
    await smsConfig.set({ ...ALL_SMS_OFF, [SMS_SETTINGS.reminder.enabledKey]: true, [NEXT_VISIT_POPUP.enabledKey]: false });
    await journey.until('balancePaid');
    const since = await sms.checkpoint();

    // Step 4: mark the order as collected.
    const body = await markCollected(journey, 'BUG-SCHED-01');
    test.info().annotations.push({ type: 'saved metadata', description: JSON.stringify({
      next_visit_option: body.metadata?.next_visit_option, next_visit_date: body.metadata?.next_visit_date,
    }) });

    // Steps 5-6: SMS Log -> Scheduled SMS must not list the order.
    const scheduled = await adminApi.scheduledSmsForOrder(journey.orderId);
    const smsLog = new SmsLogPage(adminPage);
    await smsLog.goto();
    await smsLog.openScheduledTab();
    await expect(smsLog.rowsForOrder(journey.orderId), 'Scheduled SMS tab lists the order').toHaveCount(0);
    expect(scheduled.map(s => `${s.status} ${s.scheduled_date}`), 'scheduled entries for the order').toEqual([]);
    expect(body.metadata?.next_visit_date ?? null, 'no next visit date should be saved').toBeNull();

    // And nothing is actually sent on the next scheduler cycles.
    await sms.expectNoSms({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.nextVisitReminder, duration: 90_000 });
  });
});
