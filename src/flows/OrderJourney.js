const { test } = require('@playwright/test');
const { RefractionRoomPage } = require('../pages/RefractionRoomPage');
const { OpticalShopPage } = require('../pages/OpticalShopPage');
const { CashierPage } = require('../pages/CashierPage');
const { DEFAULT_ITEM } = require('../constants');
const { env } = require('../config/env');

const STAGES = ['sentToShop', 'pendingAdvance', 'advancePaid', 'inProgress', 'qcPassed', 'ready', 'balancePaid'];

/**
 * Drives one order through Refraction Room -> Optical Shop -> Cashier using the UI
 * (doctor account). Call `until(stage)` to stop where the test wants to take over.
 * Each step is a Playwright test.step so the HTML report shows exactly where a run failed.
 */
class OrderJourney {
  constructor(page, api, { patient = env.patient, item = DEFAULT_ITEM } = {}) {
    this.page = page;
    this.api = api;
    this.patient = patient;
    this.item = item;
    this.refraction = new RefractionRoomPage(page);
    this.shop = new OpticalShopPage(page);
    this.cashier = new CashierPage(page);
    this.prescriptionId = null;
    this.orderId = null;
    this.reached = -1;
    this.walkIn = false;
  }

  async until(stage) {
    const target = STAGES.indexOf(stage);
    if (target < 0) throw new Error(`Unknown stage "${stage}". Use one of ${STAGES.join(', ')}`);
    for (let i = this.reached + 1; i <= target; i++) {
      await test.step(`order journey: ${STAGES[i]}`, () => this[STAGES[i]]());
      this.reached = i;
    }
    return this;
  }

  /** Walk-in customer: order created directly in the Optical Shop ("New Order"), no consultation. */
  async startAsWalkIn() {
    await test.step('order journey: walk-in order', async () => {
      await this.shop.gotoList();
      this.orderId = await this.shop.createWalkInOrder(this.patient);
      test.info().annotations.push({ type: 'order', description: `walk-in order ${this.orderId}` });
    });
    this.walkIn = true;
    this.reached = STAGES.indexOf('sentToShop');
    return this;
  }

  async sentToShop() {
    await this.refraction.goto();
    this.prescriptionId = await this.refraction.startConsultation(this.patient);
    await this.refraction.selectVisualAcuity('6/9');
    await this.refraction.remarks.fill(`Automation ${new Date().toISOString()}`);
    await this.refraction.save();
    await this.refraction.sendToShop();
    this.orderId = (await this.api.findOrderForPrescription(this.prescriptionId)).id;
    test.info().annotations.push({ type: 'order', description: `prescription ${this.prescriptionId} -> order ${this.orderId}` });
  }

  async pendingAdvance() {
    await this.shop.openOrder(this.orderId);
    await this.shop.expectStatus('Not Started');
    await this.shop.addInventoryItem(this.item.code);
    await this.shop.collectAdvancePayment();
    await this.shop.openOrder(this.orderId);
    await this.shop.expectStatus('Pending Advance');
  }

  /**
   * Walk-in path: add item -> "Collect Payment" puts the order straight into Ready (no lab/QC
   * steps); the backend creates the cashier entry, which must be paid before collection.
   */
  async walkInReadyAndPaid() {
    if (!this.walkIn) throw new Error('call startAsWalkIn() first');
    await test.step('order journey: walk-in payment', async () => {
      await this.shop.openOrder(this.orderId);
      await this.shop.addInventoryItem(this.item.code);
      await this.shop.collectAdvancePayment();
      await this.shop.openOrder(this.orderId);
      await this.shop.expectStatus('Ready');
      await this.payPendingSalesOrder('WALKIN');
      await this.shop.openOrder(this.orderId);
      await this.shop.markCollectedButton.waitFor({ timeout: 30_000 });
    });
    return this;
  }

  async payPendingSalesOrder(label) {
    const salesOrder = await this.api.findPendingSalesOrder(this.orderId);
    if (!salesOrder) throw new Error(`No pending cashier entry for order ${this.orderId}`);
    await this.cashier.openSalesOrder(salesOrder.id);
    await this.cashier.markAsPaid(`AUTO-${label}-${Date.now().toString().slice(-6)}`);
    await this.cashier.expectPaid();
    return salesOrder;
  }

  async advancePaid() {
    this.advanceSalesOrder = await this.payPendingSalesOrder('ADV');
    await this.shop.openOrder(this.orderId);
    await this.shop.expectStatus('Advance Paid');
  }

  async inProgress() {
    await this.shop.startOrder();
  }

  async qcPassed() {
    await this.shop.markReceived({ qc: 'passed', notes: 'Automation: QC passed' });
  }

  async ready() {
    await this.shop.markReadyForCollection();
  }

  async balancePaid() {
    this.balanceSalesOrder = await this.payPendingSalesOrder('BAL');
    await this.shop.openOrder(this.orderId);
    await this.shop.markCollectedButton.waitFor({ timeout: 30_000 });
  }
}

module.exports = { OrderJourney, STAGES };
