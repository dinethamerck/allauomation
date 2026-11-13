const { expect } = require('@playwright/test');
const { sleep } = require('../utils/time');

/**
 * Verifies SMS through the SMS log API.
 *
 * Pattern: take a checkpoint (highest log id) right before an action, perform the
 * action, then look only at logs newer than the checkpoint for the order under test.
 * This keeps assertions isolated from other testers using the same QA org.
 */
class SmsVerifier {
  constructor(api) {
    this.api = api;
  }

  async checkpoint() {
    const { data } = await this.api.smsLogs();
    return data.reduce((max, log) => Math.max(max, log.id), 0);
  }

  /** All logs with id > sinceId (walks pages until it passes the checkpoint). */
  async logsSince(sinceId, { maxPages = 6 } = {}) {
    const logs = [];
    for (let page = 1; page <= maxPages; page++) {
      const { data } = await this.api.smsLogs({ page });
      logs.push(...data.filter(l => l.id > sinceId));
      if (!data.length || data.some(l => l.id <= sinceId)) break;
    }
    return logs;
  }

  /** type: metadata.type, or null for untyped (welcome / pickup) logs, or undefined for any. */
  async logsForOrder({ sinceId, orderId, type }) {
    return (await this.logsSince(sinceId)).filter(log => {
      const meta = log.metadata || {};
      if (Number(meta.order_id) !== Number(orderId)) return false;
      if (type === undefined) return true;
      return (meta.type ?? null) === type;
    });
  }

  async waitForSms({ sinceId, orderId, type, count = 1, timeout = 90_000, message }) {
    let found = [];
    await expect
      .poll(async () => (found = await this.logsForOrder({ sinceId, orderId, type })).length, {
        message: message || `expected ${count} SMS (type=${type}) for order ${orderId}`,
        timeout,
        intervals: [3_000, 5_000, 10_000],
      })
      .toBeGreaterThanOrEqual(count);
    return found;
  }

  /** Waits `duration` (long enough for the per-minute scheduler) then asserts nothing new was logged. */
  async expectNoSms({ sinceId, orderId, type, duration = 75_000, message }) {
    await sleep(duration);
    const logs = await this.logsForOrder({ sinceId, orderId, type });
    expect(logs, message || `no SMS (type=${type}) expected for order ${orderId}`).toEqual([]);
  }
}

module.exports = { SmsVerifier };
