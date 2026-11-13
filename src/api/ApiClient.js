const { request } = require('@playwright/test');
const { env } = require('../config/env');

/**
 * Thin client for the backend used by the UI (qa_opt_api). Used for test setup,
 * configuration snapshots/restores and for verifying SMS that the UI does not expose.
 */
class ApiClient {
  constructor(context) {
    this.context = context;
  }

  /** Raw login call; returns { status, token } so negative tests can inspect failures. */
  static async login({ username, password }) {
    const anon = await request.newContext({ baseURL: env.apiUrl, timeout: 60_000 });
    try {
      const res = await anon.post('/auth/login', { data: { user_name: username, password } });
      const body = await res.json().catch(() => ({}));
      return { status: res.status(), token: body.token };
    } finally {
      await anon.dispose();
    }
  }

  static async create(role) {
    const { status, token } = await ApiClient.login(env.credentials(role));
    if (!token) throw new Error(`API login failed for role "${role}" (HTTP ${status})`);
    const context = await request.newContext({
      baseURL: env.apiUrl,
      timeout: 60_000, // QA occasionally takes >20 s to answer
      extraHTTPHeaders: { authorization: `Bearer ${token}` },
    });
    return new ApiClient(context);
  }

  async dispose() {
    await this.context.dispose();
  }

  async get(path) {
    const res = await this.context.get(path);
    if (!res.ok()) throw new Error(`GET ${path} -> HTTP ${res.status()}`);
    return res.json();
  }

  async post(path, data) {
    const res = await this.context.post(path, { data });
    if (!res.ok()) throw new Error(`POST ${path} -> HTTP ${res.status()}`);
    return res.json().catch(() => ({}));
  }

  // ---- Settings ---------------------------------------------------------

  async getConfiguration() {
    return (await this.get('/settings/configuration')).configuration;
  }

  /** The UI saves one key at a time; partial bodies are accepted. */
  async updateConfiguration(partial) {
    return this.post('/settings/configuration', partial);
  }

  // ---- SMS ---------------------------------------------------------------

  /** status: all | delivered | failed. 25 rows per page, newest first. */
  async smsLogs({ page = 1, status = 'all' } = {}) {
    return this.get(`/sms/logs?page=${page}&status=${status}`);
  }

  /** status: all | scheduled | on_hold | not_delivered. Delivered reminders drop off this list. */
  async scheduledSms({ page = 1, status = 'all' } = {}) {
    return this.get(`/sms/scheduled?page=${page}&status=${status}`);
  }

  async scheduledSmsForOrder(orderId) {
    const { data } = await this.scheduledSms();
    return data.filter(s => Number(s.order_id) === Number(orderId));
  }

  // ---- Optical system ---------------------------------------------------

  async getOrder(orderId) {
    return (await this.get(`/optical-system/orders/${orderId}`)).payload;
  }

  async listOrders({ search = '', status = '', pageSize = 50 } = {}) {
    const q = `page=1&search=${encodeURIComponent(search)}&status=${status}&pageSize=${pageSize}`;
    return (await this.get(`/optical-system/orders?${q}`)).payload.orders;
  }

  async listPrescriptions({ pageSize = 50 } = {}) {
    return (await this.get(`/optical-system/prescriptions?page=1&search=&pageSize=${pageSize}`)).payload.prescriptions;
  }

  async listSalesOrders({ pageSize = 50 } = {}) {
    return (await this.get(`/optical-system/sales-orders?page=1&search=&status=&pageSize=${pageSize}`)).payload.salesOrders;
  }

  /** Optical-shop order created when a consultation is sent to shop (same encounter). */
  async findOrderForPrescription(prescriptionId) {
    const prescription = (await this.listPrescriptions()).find(p => p.id === Number(prescriptionId));
    if (!prescription) throw new Error(`Prescription ${prescriptionId} not found`);
    const order = (await this.listOrders()).find(o => o.encounter_id === prescription.encounter_id);
    if (!order) throw new Error(`No optical-shop order for prescription ${prescriptionId}`);
    return order;
  }

  /** The cashier entry (sales order) still waiting for payment for this order. */
  async findPendingSalesOrder(orderId) {
    return (await this.listSalesOrders()).find(s => Number(s.order_id) === Number(orderId) && s.status !== 'Completed');
  }
}

module.exports = { ApiClient };
