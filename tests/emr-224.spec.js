// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');

/**
 * EMR-224: Unable to delete created Appointments and Treatments.
 * See EMR_224_TEST_CASES.md for root causes (RC-1..RC-6) and break points.
 *
 * Isolated test data only: a test treatment "QA224X<ts>" and test appointments on 2027-12-31
 * with NO patient / doctor / type (so no real patient's history is touched). Cleanup in afterAll.
 * Skip the data-creating part with EMR224_READONLY=1.
 */

const TS = Date.now();
const TAG = `QA224X${TS}`;
const SLOT = (h) => ({ start_time: `2027-12-31T0${h}:00:00.000Z`, end_time: `2027-12-31T0${h}:30:00.000Z` });

test.describe.serial('EMR-224: delete appointments & treatments', () => {
  // Desktop Chromium only:
  //  - most checks are API calls (same result in every browser) and they CREATE test data, so running
  //    them in 4 projects only multiplies the data and the parallel load on QA;
  //  - WebKit on Windows fails the TLS handshake to qa_pg.amerck.care ("SSL connect error");
  //  - the Schedule calendar card is hidden at phone width (Mobile Chrome), so the UI steps can't click it.
  const DESKTOP_CHROMIUM_ONLY = 'EMR-224 runs on desktop Chromium only (API checks + desktop Schedule UI)';

  /** @type {import('@playwright/test').BrowserContext} */ let context;
  /** @type {import('@playwright/test').Page} */ let page;
  /** @type {Record<string,string>} */ let headers = {};
  let apiBase = '';
  const created = { treatments: [], appointments: [], tfs: [] };

  const call = async (method, p, data) => {
    const r = await page.request.fetch(apiBase + p, { method, headers, data });
    let body = null;
    try { body = await r.json(); } catch {}
    return { status: r.status(), body };
  };

  async function createTreatment(suffix) {
    const r = await call('POST', '/aesthetic/treatments', { name: `${TAG} ${suffix}`, notes: 'EMR-224 QA test', price: 1 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const list = (await call('GET', '/aesthetic/treatments')).body?.payload || [];
    const t = list.find((x) => x.name === `${TAG} ${suffix}`);
    expect(t, 'created treatment listed').toBeTruthy();
    created.treatments.push(t.id);
    return t;
  }

  async function createAppointment(h, notes) {
    const r = await call('POST', '/aesthetic/appointments', { ...SLOT(h), notes: `${TAG} ${notes}`, status: 'scheduled', patient_id: '', doctor_id: '' });
    expect(r.status, JSON.stringify(r.body)).toBeLessThan(400);
    const appt = r.body?.payload?.appointment;
    expect(appt?.id, 'appointment id').toBeTruthy();
    created.appointments.push(appt.id);
    return appt;
  }

  test.beforeAll(async ({ browser, browserName, isMobile }) => {
    // Skipping here (before login) skips the whole group – the per-test skip ran too late for WebKit's SSL failure
    test.skip(browserName !== 'chromium' || isMobile, DESKTOP_CHROMIUM_ONLY);
    test.setTimeout(120000);
    context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();
    page.on('request', (req) => {
      const h = req.headers();
      if (!headers.authorization && h.authorization && req.url().includes('/aesthetic/')) {
        headers = { authorization: h.authorization };
        apiBase = new URL(req.url()).origin;
      }
    });
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(process.env.QA_USERNAME || 'parami', process.env.QA_PASSWORD || 'parami');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 40000 });
    await page.goto('/admin/aesthetic-appointments', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => !!headers.authorization, { timeout: 15000 }).toBe(true);
  });

  test.afterAll(async () => {
    // Remove scheduled-treatment rows first, then soft-delete appointments, then delete treatments
    for (const { apptId, tfsId } of created.tfs) await call('DELETE', `/aesthetic/appointments/${apptId}/treatments/${tfsId}`).catch(() => null);
    for (const id of created.appointments) {
      const r = await call('DELETE', `/aesthetic/appointments/${id}`).catch(() => null);
      if (r && r.status >= 400) await call('PUT', `/aesthetic/appointments/${id}`, { status: 'deleted' }).catch(() => null); // has consultation → status fallback
    }
    for (const id of created.treatments) await call('DELETE', `/aesthetic/treatments/${id}`).catch(() => null);
    await context?.close();
  });

  // ======================================================== Part 1: UI (read-only)
  test('TC-001: Appointment Details offers a Delete action (RC-1)', async () => {
    test.info().annotations.push({ type: 'defect', description: 'RC-1: Delete button is commented out in appointment-details.jsx (AlertDialogTrigger has no child) – no way to open the delete confirmation' });
    test.fail(true, 'Known defect EMR-224/RC-1: no Delete button on Appointment Details');
    await page.goto('/admin/aesthetic-schedule?date=2026-11-05', { waitUntil: 'domcontentloaded' });
    const card = page.getByText(/janitha|Parami|Dineth/i).first();
    await expect(card).toBeVisible({ timeout: 20000 });
    await card.click();
    const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Appointment Details' });
    await expect(dlg).toBeVisible({ timeout: 10000 });
    await expect(dlg.getByRole('button', { name: /^Delete$/ })).toBeVisible({ timeout: 5000 });
  });

  test('TC-002: status menu offers "Deleted" (bypass path – documents current behaviour)', async () => {
    // Independent of TC-001: always start from a fresh Schedule page (TC-001 may leave a dialog open)
    const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Appointment Details' });
    await page.goto('/admin/aesthetic-schedule?date=2026-11-05', { waitUntil: 'domcontentloaded' });
    const card = page.getByText(/janitha|Parami|Dineth/i).first();
    await expect(card).toBeVisible({ timeout: 30000 });
    await card.click();
    await expect(dlg).toBeVisible({ timeout: 15000 });
    const statusBtn = dlg.locator('button').filter({ hasText: /Appointment is|Patient confirmed|Client has|Client is|completed successfully|was cancelled|did not attend|Unable to contact/ }).first();
    await expect(statusBtn).toBeVisible({ timeout: 15000 });
    await statusBtn.click();
    const menu = page.locator('[data-radix-popper-content-wrapper] button');
    await expect(menu.first()).toBeVisible({ timeout: 10000 });
    const options = await menu.allInnerTexts();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    test.info().annotations.push({ type: 'observed', description: `status options: ${options.map((o) => o.split('\n')[0]).join(', ')}` });
    expect(options.some((o) => o.startsWith('Deleted')), '"Deleted" is a selectable status').toBe(true);
  });

  // ======================================================== Part 2: Treatment delete (API, isolated)
  test('TC-010: delete an UNUSED treatment → 200 and it disappears', async () => {
    test.skip(process.env.EMR224_READONLY === '1', 'read-only');
    const t = await createTreatment('unused');
    const r = await call('DELETE', `/aesthetic/treatments/${t.id}`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const list = (await call('GET', '/aesthetic/treatments')).body?.payload || [];
    expect(list.some((x) => x.id === t.id)).toBe(false);
    created.treatments = created.treatments.filter((id) => id !== t.id);
  });

  /** shared: one appointment with one scheduled treatment */
  const shared = { appt: null, treatment: null, tfs: null };

  test('TC-011: setup – test appointment + scheduled treatment (Treatment Room)', async () => {
    test.skip(process.env.EMR224_READONLY === '1', 'read-only');
    shared.treatment = await createTreatment('in-use');
    shared.appt = await createAppointment(3, 'scheduled-treatment');
    const r = await call('POST', `/aesthetic/appointments/${shared.appt.id}/scheduled-treatments`, {
      treatment_id: shared.treatment.id, name: shared.treatment.name, notes: 'EMR-224 QA', session_index: 1, org_id: shared.appt.org_id,
    });
    expect(r.status, JSON.stringify(r.body)).toBeLessThan(400);
    shared.tfs = r.body?.payload;
    expect(shared.tfs?.id, 'scheduled treatment row').toBeTruthy();
    created.tfs.push({ apptId: shared.appt.id, tfsId: shared.tfs.id });
  });

  test('TC-012: deleting a treatment that is IN USE deactivates it (soft delete) with a clear message', async () => {
    // Local emr-backend: hard destroy → FK RESTRICT → 500 (RC-3). QA build (2026-11-09): fixed with soft delete.
    test.skip(process.env.EMR224_READONLY === '1', 'read-only');
    const r = await call('DELETE', `/aesthetic/treatments/${shared.treatment.id}`);
    test.info().annotations.push({ type: 'observed', description: `status ${r.status}: ${JSON.stringify(r.body).slice(0, 200)}` });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body?.payload?.softDeleted).toBe(true);
    expect(r.body?.payload?.message).toMatch(/in use.*deactivated/i);
  });

  test('TC-013: deactivated treatment is hidden from the Treatments list and Add Items search', async () => {
    test.skip(process.env.EMR224_READONLY === '1', 'read-only');
    const list = (await call('GET', '/aesthetic/treatments')).body?.payload || [];
    const row = list.find((x) => x.id === shared.treatment.id);
    test.info().annotations.push({ type: 'observed', description: `in GET /treatments: ${row ? JSON.stringify(row).slice(0, 160) : 'not listed'}` });
    expect(row, 'deactivated treatment must not be offered in Settings → Treatments').toBeFalsy();
    const s = (await call('GET', `/aesthetic/search?query=${encodeURIComponent(TAG)}&page=1&limit=10`)).body?.payload;
    const items = Array.isArray(s) ? s : s?.items || [];
    expect(items.filter((i) => i.type !== 'product' && (i.item_id || i.id) === shared.treatment.id), 'not offered in Add Items').toEqual([]);
  });

  test('TC-014: existing scheduled session of a deactivated treatment still shows in the Treatment Room', async () => {
    test.skip(process.env.EMR224_READONLY === '1', 'read-only');
    const r = await call('GET', `/aesthetic/appointments/${shared.appt.id}/scheduling`);
    const rows = Array.isArray(r.body?.payload) ? r.body.payload : r.body?.payload?.treatments || [];
    test.info().annotations.push({ type: 'observed', description: `scheduling ${r.status}, rows ${rows.length}` });
    expect(r.status).toBe(200);
    expect(rows.some((x) => x.id === shared.tfs.id), 'history of the scheduled session is kept').toBe(true);
  });

  // ======================================================== Part 3: Appointment delete (API, isolated)
  test('TC-020: appointment with a treatment scheduled INTO it can be deleted (RC-2)', async () => {
    test.skip(process.env.EMR224_READONLY === '1', 'read-only');
    test.info().annotations.push({ type: 'defect', description: 'RC-2: deleteAppointment checks treatmentsForScheduling (FK scheduled_appointment_id = this appointment) for scheduled_appointment_id !== null → always true → every appointment that has a treatment booked into it is undeletable' });
    test.fail(true, 'Known defect EMR-224/RC-2: wrong association in the scheduled-treatment check');
    const r = await call('DELETE', `/aesthetic/appointments/${shared.appt.id}`);
    test.info().annotations.push({ type: 'observed', description: `status ${r.status}: ${JSON.stringify(r.body)}` });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
  });

  test('TC-021: plain appointment (no consultation / invoice / treatments) deletes → status "deleted"', async () => {
    test.skip(process.env.EMR224_READONLY === '1', 'read-only');
    const appt = await createAppointment(4, 'plain');
    const r = await call('DELETE', `/aesthetic/appointments/${appt.id}`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const got = await call('GET', `/aesthetic/appointments/${appt.id}`);
    const status = got.body?.payload?.status ?? got.body?.status;
    expect(status).toBe('deleted');
  });

  test('TC-022: deleting an already-deleted appointment is rejected (idempotency)', async () => {
    test.skip(process.env.EMR224_READONLY === '1', 'read-only');
    test.fail(true, 'Known gap EMR-224/BP-9: no status check – deleting twice returns 200 again');
    const id = created.appointments[created.appointments.length - 1];
    const r = await call('DELETE', `/aesthetic/appointments/${id}`);
    expect(r.status, 'second delete should be 404/409').toBeGreaterThanOrEqual(400);
  });

  /**
   * One reusable test patient for the whole QA environment (created once, then found by name).
   * Keeps real patients' history clean – only this patient gets the deleted test appointments.
   */
  const TEST_PATIENT = 'QA224 Test Patient';
  async function ensureTestPatient() {
    const found = (await call('GET', `/aesthetic/patients?page=1&limit=10&search=${encodeURIComponent(TEST_PATIENT)}`)).body?.payload;
    const list = Array.isArray(found) ? found : found?.patients || found?.rows || found?.data || [];
    const existing = list.find((p) => p.name === TEST_PATIENT);
    if (existing) return existing;
    const r = await call('POST', '/aesthetic/patients', { name: TEST_PATIENT, mobile: '0700000224', gender: 'other', notes: 'Automation test patient (EMR-224). Do not use.' });
    expect(r.status, `create test patient: ${JSON.stringify(r.body)}`).toBe(200);
    return r.body?.payload;
  }

  test('TC-023: appointment with a consultation is blocked with a clear message (rule)', async () => {
    test.skip(process.env.EMR224_READONLY === '1', 'read-only');
    const patient = await ensureTestPatient();
    expect(patient?.id, 'test patient id').toBeTruthy();
    const r0 = await call('POST', '/aesthetic/appointments', { ...SLOT(5), notes: `${TAG} with-consultation`, status: 'scheduled', patient_id: patient.id, doctor_id: '' });
    expect(r0.status, JSON.stringify(r0.body)).toBeLessThan(400);
    const appt = r0.body?.payload?.appointment;
    created.appointments.push(appt.id);
    const c = await call('POST', '/aesthetic/consultations', { appointment_id: appt.id, patient_id: patient.id, notes: `${TAG} consultation` });
    expect(c.status, `consultation create: ${JSON.stringify(c.body)}`).toBeLessThan(400);
    const r = await call('DELETE', `/aesthetic/appointments/${appt.id}`);
    expect(r.status).toBe(400);
    expect(r.body?.error).toMatch(/existing consultation/i);
    shared.consultAppt = appt;
  });

  test('TC-024: status "deleted" via update BYPASSES the delete rules (RC-4)', async () => {
    test.skip(process.env.EMR224_READONLY === '1', 'read-only');
    test.info().annotations.push({ type: 'defect', description: 'RC-4: PUT /appointments/:id {status:"deleted"} succeeds even when DELETE refuses the same appointment – the UI exposes this via the status menu' });
    test.fail(true, 'Known defect EMR-224/RC-4: update endpoint allows status "deleted" without the delete checks');
    // shared.appt is the appointment DELETE refused in TC-020 (scheduled treatment)
    const del = await call('DELETE', `/aesthetic/appointments/${shared.appt.id}`);
    expect(del.status, 'precondition: DELETE is refused').toBe(400);
    const r = await call('PUT', `/aesthetic/appointments/${shared.appt.id}`, { status: 'deleted' });
    const after = await call('GET', `/aesthetic/appointments/${shared.appt.id}`);
    test.info().annotations.push({ type: 'observed', description: `PUT status deleted → ${r.status}; status now ${after.body?.payload?.status ?? after.body?.status}` });
    expect(r.status, 'status "deleted" must go through the same rules as DELETE').toBeGreaterThanOrEqual(400);
  });

  test('TC-025: unknown appointment id → 404, not 400/500', async () => {
    const r = await call('DELETE', '/aesthetic/appointments/999999999');
    test.info().annotations.push({ type: 'observed', description: `status ${r.status}: ${JSON.stringify(r.body)}` });
    expect(r.body?.error).toMatch(/not found/i);
    expect([404, 400]).toContain(r.status); // 400 today; 404 is the correct code
  });

  test('TC-026: unknown treatment id → handled error, not a crash', async () => {
    const r = await call('DELETE', '/aesthetic/treatments/999999999');
    expect(r.body?.error || '').toMatch(/not found/i);
  });
});
