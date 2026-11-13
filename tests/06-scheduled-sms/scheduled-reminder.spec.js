const { test, expect } = require('../../src/fixtures');
const { SmsLogPage } = require('../../src/pages/SmsLogPage');
const {
  ALL_SMS_OFF, SMS_SETTINGS, SMS_TYPE, SMS_LOG_STATUS, SCHEDULED_STATUS, NEXT_VISIT_POPUP, NEXT_VISIT_OPTIONS, ORDER_STATUS,
} = require('../../src/constants');
const { env } = require('../../src/config/env');
const {
  parseOrgDateTime, formatOrgDateTime, orgDay, previewToOrgDateTime, minutesBetween, sleepUntil,
} = require('../../src/utils/time');

// Journey (~2 min) + wait for the due minute + scheduler window + duplicate check.
test.describe.configure({ timeout: 12 * 60_000 });

const REMINDER_ON = { ...ALL_SMS_OFF, [SMS_SETTINGS.reminder.enabledKey]: true, [NEXT_VISIT_POPUP.enabledKey]: true };
// The scheduler runs once a minute; allow two cycles plus API latency.
const DELIVERY_WINDOW_MS = 150_000;

/** Opens the collect popup, chooses a next-visit option, confirms. Returns what was scheduled. */
async function collectWithNextVisit(journey, label) {
  const dialog = journey.shop.collectDialog;
  await dialog.open(journey.shop);
  await expect(dialog.confirm, 'Confirm requires a next-visit choice').toBeDisabled();
  const clickedAt = new Date();
  await dialog.choose(label);
  const preview = previewToOrgDateTime(await dialog.scheduledPreview.innerText());
  const body = await dialog.submit(`Automation ${label}`);
  await journey.shop.expectStatus('Collected');
  return { clickedAt, preview, sent: body.metadata };
}

async function waitForReminder(sms, { sinceId, orderId, nextVisit }) {
  await sleepUntil(parseOrgDateTime(nextVisit));
  const [log] = await sms.waitForSms({
    sinceId, orderId, type: SMS_TYPE.nextVisitReminder, timeout: DELIVERY_WINDOW_MS,
    message: `next visit reminder for order ${orderId} due ${nextVisit}`,
  });
  return log;
}

test.describe('Scheduled Next Visit reminder SMS @scheduled @e2e', () => {
  for (const [i, [label, { key, minutes }]] of Object.entries(NEXT_VISIT_OPTIONS).entries()) {
    test(`SCH-0${i + 1} "${label}" reminder is scheduled, then delivered on time exactly once`, async ({ journey, sms, smsConfig, adminApi, doctorApi, adminPage }) => {
      await smsConfig.set(REMINDER_ON);
      await journey.until('balancePaid');
      const since = await sms.checkpoint();

      const { clickedAt, preview, sent } = await test.step('collect with next visit option', () => collectWithNextVisit(journey, label));

      await test.step('popup preview and saved values match the chosen option', async () => {
        const expected = formatOrgDateTime(new Date(clickedAt.getTime() + minutes * 60_000));
        expect(minutesBetween(preview, expected), `preview ${preview} vs expected ${expected}`).toBeLessThanOrEqual(1);
        expect(sent.next_visit_option).toBe(key);
        expect(sent.next_visit_date).toBe(preview);
      });

      await test.step('Scheduled SMS lists the reminder as "scheduled"', async () => {
        const [entry] = await adminApi.scheduledSmsForOrder(journey.orderId);
        expect(entry, 'scheduled entry').toBeTruthy();
        expect(entry.status).toBe(SCHEDULED_STATUS.scheduled);
        expect(entry.option).toBe(key);
        expect(entry.scheduled_date).toBe(preview);
        expect(entry.number).toBe(env.patient.mobile);

        const page = new SmsLogPage(adminPage);
        await page.goto();
        await page.openScheduledTab();
        await expect(page.rowsForOrder(journey.orderId).first()).toContainText(/scheduled/i);
      });

      await test.step('nothing is sent before the scheduled time', async () => {
        const early = await sms.logsForOrder({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.nextVisitReminder });
        if (Date.now() < parseOrgDateTime(preview).getTime()) expect(early).toEqual([]);
      });

      const log = await test.step('reminder is delivered at the scheduled minute', async () => {
        const reminder = await waitForReminder(sms, { sinceId: since, orderId: journey.orderId, nextVisit: preview });
        const due = parseOrgDateTime(preview).getTime();
        const sentAt = new Date(reminder.createdAt).getTime();
        expect(sentAt, 'sent before due time').toBeGreaterThanOrEqual(due - 5_000);
        expect(sentAt - due, 'delay after due time (ms)').toBeLessThanOrEqual(DELIVERY_WINDOW_MS);
        expect(reminder.number).toBe(env.patient.mobile);
        expect(reminder.status).toBe(SMS_LOG_STATUS.delivered);
        expect(reminder.metadata.scheduled_date).toBe(preview.slice(0, 10));
        return reminder;
      });

      await test.step('order and scheduled list reflect the delivery', async () => {
        const order = await doctorApi.getOrder(journey.orderId);
        expect(order.metadata.reminder_sent).toBe(true);
        expect(order.metadata.reminder_status).toBe('delivered');
        expect(order.metadata.reminder_sent_at).toBeTruthy();
        const remaining = await adminApi.scheduledSmsForOrder(journey.orderId);
        expect(remaining.filter(s => s.status === SCHEDULED_STATUS.scheduled)).toEqual([]);
      });

      await test.step('SMS Log page shows the delivered reminder', async () => {
        const page = new SmsLogPage(adminPage);
        await page.goto();
        await expect(page.rowsForOrder(journey.orderId).first()).toContainText('Delivered');
      });

      await test.step('no duplicate reminder on the next scheduler cycles', async () => {
        await sms.expectNoSms({ sinceId: log.id, orderId: journey.orderId, type: SMS_TYPE.nextVisitReminder, duration: 75_000 });
      });
    });
  }

  test('SCH-04 customised future date is stored and not sent early', async ({ journey, sms, smsConfig, adminApi, doctorApi }) => {
    await smsConfig.set(REMINDER_ON);
    await journey.until('balancePaid');
    const since = await sms.checkpoint();
    const dialog = journey.shop.collectDialog;
    await dialog.open(journey.shop);

    const target = orgDay(3);
    await dialog.pickCustomDate(target);
    await expect(dialog.confirm).toBeEnabled();
    const body = await dialog.submit('Automation customised date');
    expect(body.metadata.next_visit_date.startsWith(target.iso), body.metadata.next_visit_date).toBeTruthy();

    const order = await doctorApi.getOrder(journey.orderId);
    expect(order.status).toBe(ORDER_STATUS.collected);
    const [entry] = await adminApi.scheduledSmsForOrder(journey.orderId);
    expect(entry?.status).toBe(SCHEDULED_STATUS.scheduled);
    expect(entry.scheduled_date.startsWith(target.iso)).toBeTruthy();

    await sms.expectNoSms({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.nextVisitReminder, message: 'future reminder sent early' });
  });

  test('SCH-05 @negative customised calendar does not allow past dates', async ({ journey, smsConfig }) => {
    await smsConfig.set(REMINDER_ON);
    await journey.until('balancePaid');
    const dialog = journey.shop.collectDialog;
    await dialog.open(journey.shop);
    await dialog.customizedButton.click();
    await expect(dialog.confirm, 'Confirm needs a date').toBeDisabled();
    await dialog.pickDateButton.first().click();

    const yesterday = orgDay(-1);
    test.skip(yesterday.monthOffset !== 0, 'yesterday is in the previous month');
    await expect(dialog.dayCell(yesterday.day)).toBeDisabled();
    await journey.page.keyboard.press('Escape');
  });

  test('SCH-06 @negative closing the popup does not collect the order or schedule anything', async ({ journey, sms, smsConfig, adminApi, doctorApi }) => {
    await smsConfig.set(REMINDER_ON);
    await journey.until('balancePaid');
    const since = await sms.checkpoint();
    const dialog = journey.shop.collectDialog;
    await dialog.open(journey.shop);
    await dialog.choose('1 Min');
    await dialog.close.click();

    await journey.shop.expectStatus('Ready');
    expect((await doctorApi.getOrder(journey.orderId)).status).toBe(ORDER_STATUS.ready);
    expect(await adminApi.scheduledSmsForOrder(journey.orderId)).toEqual([]);
    await sms.expectNoSms({ sinceId: since, orderId: journey.orderId, duration: 90_000 });
  });

  test('SCH-07 @negative reminder is not sent while "Next Visit Reminder" SMS is disabled', async ({ journey, sms, smsConfig, adminApi, doctorApi }) => {
    await smsConfig.set({ ...REMINDER_ON, [SMS_SETTINGS.reminder.enabledKey]: false });
    await journey.until('balancePaid');
    const since = await sms.checkpoint();
    const { preview } = await collectWithNextVisit(journey, '1 Min');

    const list = await adminApi.scheduledSms();
    expect(list.isReminderEnabled).toBe(false);
    const before = (await adminApi.scheduledSmsForOrder(journey.orderId))[0];
    test.info().annotations.push({ type: 'observed status before due', description: String(before?.status) });

    await sleepUntil(parseOrgDateTime(preview), 90_000);
    expect(await sms.logsForOrder({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.nextVisitReminder })).toEqual([]);

    const order = await doctorApi.getOrder(journey.orderId);
    expect(order.metadata.reminder_sent).not.toBe(true);
    const after = (await adminApi.scheduledSmsForOrder(journey.orderId))[0];
    expect(after, 'entry stays visible for follow-up').toBeTruthy();
    expect([SCHEDULED_STATUS.onHold, SCHEDULED_STATUS.notDelivered]).toContain(after.status);
  });

  test('SCH-08 reminder disabled then re-enabled before due time is still delivered', async ({ journey, sms, smsConfig, adminApi }) => {
    await smsConfig.set(REMINDER_ON);
    await journey.until('balancePaid');
    const since = await sms.checkpoint();
    const { preview } = await collectWithNextVisit(journey, '4 Min');

    await smsConfig.set({ [SMS_SETTINGS.reminder.enabledKey]: false });
    const held = (await adminApi.scheduledSmsForOrder(journey.orderId))[0];
    test.info().annotations.push({ type: 'observed status while disabled', description: String(held?.status) });
    expect(held?.status).not.toBe(SCHEDULED_STATUS.notDelivered);

    await sleepUntil(parseOrgDateTime(preview), -90_000);
    await smsConfig.set({ [SMS_SETTINGS.reminder.enabledKey]: true });

    const log = await waitForReminder(sms, { sinceId: since, orderId: journey.orderId, nextVisit: preview });
    expect(log.status).toBe(SMS_LOG_STATUS.delivered);
  });

  test('SCH-09 @negative with the Next Visit popup disabled no reminder is scheduled', async ({ journey, sms, smsConfig, adminApi }) => {
    await smsConfig.set({ ...REMINDER_ON, [NEXT_VISIT_POPUP.enabledKey]: false });
    await journey.until('balancePaid');
    const since = await sms.checkpoint();
    const dialog = journey.shop.collectDialog;
    await dialog.open(journey.shop);

    for (const label of [...Object.keys(NEXT_VISIT_OPTIONS), 'Customized']) {
      await expect(dialog.option(label), `${label} must be hidden`).toHaveCount(0);
    }
    await expect(dialog.confirm).toBeEnabled();
    const body = await dialog.submit('Automation popup disabled');
    expect(body.metadata.next_visit_date ?? null).toBeNull();

    expect(await adminApi.scheduledSmsForOrder(journey.orderId)).toEqual([]);
    await sms.expectNoSms({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.nextVisitReminder, duration: 90_000 });
  });

  test('SCH-10 @slow two orders scheduled for the same minute each get their own reminder', async ({ page, doctorApi, sms, smsConfig }) => {
    const { OrderJourney } = require('../../src/flows/OrderJourney');
    await smsConfig.set(REMINDER_ON);
    const first = new OrderJourney(page, doctorApi);
    const second = new OrderJourney(page, doctorApi);
    await first.until('balancePaid');
    await second.until('balancePaid');
    const since = await sms.checkpoint();

    await first.shop.openOrder(first.orderId);
    const a = await collectWithNextVisit(first, '2 Min');
    await second.shop.openOrder(second.orderId);
    const b = await collectWithNextVisit(second, '1 Min');

    const later = [a.preview, b.preview].sort().pop();
    await sleepUntil(parseOrgDateTime(later));
    for (const j of [first, second]) {
      const logs = await sms.waitForSms({ sinceId: since, orderId: j.orderId, type: SMS_TYPE.nextVisitReminder, timeout: DELIVERY_WINDOW_MS });
      expect(logs, `order ${j.orderId}`).toHaveLength(1);
    }
  });
});

test.describe('Scheduled reminder with a browser outside the org time zone @scheduled @timezone', () => {
  test.use({ timezoneId: 'UTC' });

  test('SCH-11 next visit time is stored in organisation time regardless of browser time zone', async ({ journey, smsConfig }) => {
    await smsConfig.set({ ...REMINDER_ON, [SMS_SETTINGS.reminder.enabledKey]: false });
    await journey.until('balancePaid');
    const dialog = journey.shop.collectDialog;
    await dialog.open(journey.shop);
    const clickedAt = new Date();
    await dialog.choose('1 Min');
    const body = await dialog.submit('Automation timezone');

    const expected = formatOrgDateTime(new Date(clickedAt.getTime() + 60_000));
    expect(
      minutesBetween(body.metadata.next_visit_date, expected),
      `stored ${body.metadata.next_visit_date}, expected about ${expected} (${env.orgTimezone})`,
    ).toBeLessThanOrEqual(1);
  });
});
