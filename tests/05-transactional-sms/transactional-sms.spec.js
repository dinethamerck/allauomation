const { test, expect } = require('../../src/fixtures');
const { ALL_SMS_OFF, SMS_SETTINGS, SMS_TYPE, SMS_LOG_STATUS, NEXT_VISIT_POPUP } = require('../../src/constants');
const { env } = require('../../src/config/env');

const { welcome, pickup, thankYou, thankYouWalkIn, reminder } = SMS_SETTINGS;

/** Every SMS must go to the patient's mobile and be logged as delivered. */
function expectDeliveredToPatient(logs) {
  for (const log of logs) {
    expect(log.number, `SMS ${log.id} recipient`).toBe(env.patient.mobile);
    expect(log.status, `SMS ${log.id} status`).toBe(SMS_LOG_STATUS.delivered);
  }
}

async function collect(journey, option = '4 Min') {
  const dialog = journey.shop.collectDialog;
  await dialog.open(journey.shop);
  if (option && (await dialog.option(option).isVisible())) await dialog.choose(option);
  return dialog.submit(`Automation ${test.info().title.slice(0, 6)}`);
}

test.describe('Transactional SMS (Welcome / Ready for Pickup / Thank you) @sms @e2e', () => {
  test('TX-01 Welcome SMS is sent once when the advance payment is collected', async ({ journey, sms, smsConfig }) => {
    await smsConfig.set({ ...ALL_SMS_OFF, [welcome.enabledKey]: true });
    const since = await sms.checkpoint();

    await journey.until('advancePaid');
    const logs = await sms.waitForSms({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.untyped });
    expectDeliveredToPatient(logs);

    // Balance payment must not trigger a second welcome message.
    await journey.until('balancePaid');
    await sms.expectNoSms({
      sinceId: Math.max(...logs.map(l => l.id)),
      orderId: journey.orderId,
      duration: 20_000,
      message: 'balance payment triggered another SMS',
    });
    expect(await sms.logsForOrder({ sinceId: since, orderId: journey.orderId })).toHaveLength(1);
  });

  test('TX-02 @negative no Welcome SMS when it is disabled', async ({ journey, sms, smsConfig }) => {
    await smsConfig.set({ ...ALL_SMS_OFF });
    const since = await sms.checkpoint();
    await journey.until('advancePaid');
    await sms.expectNoSms({ sinceId: since, orderId: journey.orderId, duration: 30_000 });
  });

  test('TX-03 Ready for Pickup SMS is sent when the order is marked Ready for Collection', async ({ journey, sms, smsConfig }) => {
    await smsConfig.set({ ...ALL_SMS_OFF, [pickup.enabledKey]: true });
    await journey.until('qcPassed');
    const since = await sms.checkpoint();
    await journey.until('ready');
    const logs = await sms.waitForSms({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.untyped });
    expect(logs).toHaveLength(1);
    expectDeliveredToPatient(logs);
  });

  test('TX-04 @negative no Ready for Pickup SMS when it is disabled', async ({ journey, sms, smsConfig }) => {
    await smsConfig.set({ ...ALL_SMS_OFF });
    await journey.until('qcPassed');
    const since = await sms.checkpoint();
    await journey.until('ready');
    await sms.expectNoSms({ sinceId: since, orderId: journey.orderId, duration: 30_000 });
  });

  test('TX-05 @negative a QC failure does not send the Ready for Pickup SMS', async ({ journey, sms, smsConfig }) => {
    await smsConfig.set({ ...ALL_SMS_OFF, [pickup.enabledKey]: true });
    await journey.until('inProgress');
    const since = await sms.checkpoint();
    await journey.shop.markReceived({ qc: 'failed', notes: 'Automation: QC failed' });
    await sms.expectNoSms({ sinceId: since, orderId: journey.orderId, duration: 30_000 });
  });

  test('TX-06 Thank you SMS is sent at collection and carries the next visit date', async ({ journey, sms, smsConfig, doctorApi }) => {
    await smsConfig.set({ ...ALL_SMS_OFF, [thankYou.enabledKey]: true, [NEXT_VISIT_POPUP.enabledKey]: true });
    await journey.until('balancePaid');
    const since = await sms.checkpoint();
    await collect(journey, '4 Min');

    const [log] = await sms.waitForSms({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.orderCollected });
    expectDeliveredToPatient([log]);
    const order = await doctorApi.getOrder(journey.orderId);
    expect(log.metadata.next_visit_date).toBe(order.metadata.next_visit_date);
  });

  test('TX-07 @negative no Thank you SMS when disabled, but the reminder is still scheduled', async ({ journey, sms, smsConfig, adminApi }) => {
    await smsConfig.set({ ...ALL_SMS_OFF, [reminder.enabledKey]: true, [NEXT_VISIT_POPUP.enabledKey]: true });
    await journey.until('balancePaid');
    const since = await sms.checkpoint();
    await collect(journey, '4 Min');

    await expect.poll(async () => (await adminApi.scheduledSmsForOrder(journey.orderId)).length, { message: 'reminder scheduled' }).toBe(1);
    await sms.expectNoSms({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.orderCollected, duration: 30_000 });
  });

  test('TX-08 walk-in customer receives the walk-in Thank you SMS', async ({ journey, sms, smsConfig }) => {
    await smsConfig.set({ ...ALL_SMS_OFF, [thankYouWalkIn.enabledKey]: true });
    await journey.startAsWalkIn();
    await journey.walkInReadyAndPaid();
    const since = await sms.checkpoint();
    await collect(journey);
    const logs = await sms.waitForSms({ sinceId: since, orderId: journey.orderId });
    expectDeliveredToPatient(logs);
  });

  test('TX-09 @negative walk-in customer gets no Thank you SMS when only the regular one is enabled', async ({ journey, sms, smsConfig }) => {
    await smsConfig.set({ ...ALL_SMS_OFF, [thankYou.enabledKey]: true });
    await journey.startAsWalkIn();
    await journey.walkInReadyAndPaid();
    const since = await sms.checkpoint();
    await collect(journey);
    await sms.expectNoSms({ sinceId: since, orderId: journey.orderId, type: SMS_TYPE.orderCollected, duration: 30_000 });
  });
});
