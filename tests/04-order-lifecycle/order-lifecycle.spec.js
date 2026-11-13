const { test, expect } = require('../../src/fixtures');
const { ALL_SMS_OFF, ORDER_STATUS, DEFAULT_ITEM } = require('../../src/constants');

// These tests are about workflow rules, not SMS: switch every SMS off so the
// patient's handset is not spammed. smsConfig restores the original values.
test.beforeEach(async ({ smsConfig }) => {
  await smsConfig.set(ALL_SMS_OFF);
});

test.describe('Order lifecycle: Refraction Room -> Optical Shop -> Cashier @e2e', () => {
  test('ORD-01 @smoke an order moves through every status up to collection', async ({ journey, page, doctorApi }) => {
    await journey.until('sentToShop');
    await journey.refraction.goto();
    await expect(journey.refraction.rowByPatient(journey.patient.name).first()).toContainText('Sent to Shop');

    await journey.until('pendingAdvance');
    await journey.until('advancePaid');
    await journey.until('inProgress');
    await journey.until('qcPassed');
    await journey.until('ready');
    expect((await doctorApi.getOrder(journey.orderId)).status).toBe(ORDER_STATUS.ready);

    await journey.until('balancePaid');
    await journey.shop.collectDialog.open(journey.shop);
    if (await journey.shop.collectDialog.option('2 Min').isVisible()) await journey.shop.collectDialog.choose('2 Min');
    await journey.shop.collectDialog.submit('ORD-01');
    await journey.shop.expectStatus('Collected');
    await expect(page.getByText('Collection Details')).toBeVisible();
    expect((await doctorApi.getOrder(journey.orderId)).status).toBe(ORDER_STATUS.collected);
  });

  test('ORD-02 @negative "Send To Shop" stays disabled until a visual acuity value is chosen', async ({ journey }) => {
    const { refraction } = journey;
    await refraction.goto();
    await refraction.startConsultation(journey.patient);
    await expect(refraction.sendToShopButton).toBeDisabled();
    await refraction.selectVisualAcuity('6/9');
    await expect(refraction.sendToShopButton).toBeEnabled();
  });

  test('ORD-03 @negative "Collect Advance Payment" is disabled while the order has no items', async ({ journey }) => {
    await journey.until('sentToShop');
    await journey.shop.openOrder(journey.orderId);
    await journey.shop.expectStatus('Not Started');
    await expect(journey.page.getByText('No items selected.')).toBeVisible();
    await expect(journey.shop.collectAdvanceButton.first()).toBeDisabled();
  });

  test('ORD-04 advance dialog defaults to 50% and shows the balance', async ({ journey }) => {
    await journey.until('sentToShop');
    await journey.shop.openOrder(journey.orderId);
    await journey.shop.addInventoryItem(DEFAULT_ITEM.code);
    const dlg = await journey.shop.openAdvanceDialog();
    await expect(dlg.advanceInput).toHaveValue(String(DEFAULT_ITEM.price / 2));
    await expect(journey.shop.dialog).toContainText('Advance Amount (Default: 50%)');
    await expect(journey.shop.dialog).toContainText(`LKR ${(DEFAULT_ITEM.price / 2).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    await dlg.cancel.click();
    await journey.shop.expectStatus('Not Started');
  });

  test('ORD-05 @negative advance larger than the total is not accepted', async ({ journey, doctorApi }) => {
    await journey.until('sentToShop');
    await journey.shop.openOrder(journey.orderId);
    await journey.shop.addInventoryItem(DEFAULT_ITEM.code);
    const dlg = await journey.shop.openAdvanceDialog();
    await dlg.advanceInput.fill(String(DEFAULT_ITEM.price * 10));
    if (await dlg.confirm.isEnabled()) await dlg.confirm.click();
    await journey.page.waitForTimeout(3_000);
    expect((await doctorApi.getOrder(journey.orderId)).status, 'order must stay Not Started').toBe(ORDER_STATUS.notStarted);
  });

  test('ORD-06 @negative cashier cannot mark a payment as paid without an SAP reference', async ({ journey, doctorApi }) => {
    await journey.until('pendingAdvance');
    const salesOrder = await doctorApi.findPendingSalesOrder(journey.orderId);
    await journey.cashier.openSalesOrder(salesOrder.id);
    await journey.cashier.markAsPaid('');
    await journey.page.waitForTimeout(3_000);
    const after = await doctorApi.findPendingSalesOrder(journey.orderId);
    expect(after?.id, 'sales order must still be pending').toBe(salesOrder.id);
  });

  test('ORD-07 QC failure keeps the order in the shop and it can be re-checked', async ({ journey }) => {
    await journey.until('inProgress');
    await journey.shop.markReceived({ qc: 'failed', notes: 'Automation: QC failed' });
    await expect(journey.page.getByText('Failed', { exact: true })).toBeVisible();
    await expect(journey.shop.readyForCollectionButton).toHaveCount(0);
    await journey.shop.markReceived({ qc: 'passed', notes: 'Automation: QC passed on recheck' });
    await expect(journey.shop.readyForCollectionButton).toBeVisible();
  });

  test('ORD-08 @negative order cannot be collected while a balance is outstanding', async ({ journey }) => {
    await journey.until('ready');
    await expect(journey.shop.pendingPaymentButton).toBeDisabled();
    await expect(journey.shop.markCollectedButton).toHaveCount(0);
    await expect(journey.page.getByText('Pending Amount')).toBeVisible();
  });

  test('ORD-09 cancelling: "No" keeps the order, "Yes" cancels it', async ({ journey, doctorApi }) => {
    await journey.until('sentToShop');
    await journey.shop.openOrder(journey.orderId);
    await journey.shop.cancelOrder({ confirm: false });
    await journey.shop.expectStatus('Not Started');
    await journey.shop.saving(() => journey.shop.cancelOrder({ confirm: true }));
    await expect.poll(async () => (await doctorApi.getOrder(journey.orderId)).status).toBe(ORDER_STATUS.cancelled);
  });

  test('ORD-10 optical shop status filter only lists matching orders', async ({ journey }) => {
    await journey.shop.gotoList();
    await journey.shop.filterByStatus('Collected');
    // Rows carry an extra unlabeled cell, so match on the whole row text.
    const statuses = await journey.page.locator('tbody tr').allInnerTexts();
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses.every(s => /\bCollected\b/.test(s) && !/Not Started|Pending|In Progress|QC |Ready|Cancelled/.test(s)), statuses.join(' | ')).toBeTruthy();
  });
});
