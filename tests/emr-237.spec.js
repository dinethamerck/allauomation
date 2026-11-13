// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');

/**
 * EMR-237: Appointment status changes automatically when an appointment is edited / rescheduled.
 * See EMR_237_TEST_CASES.md for the root causes (RC-x) and break points (BP-x).
 *
 * Root cause (local code): emr-frontend/app/admin/aesthetic-schedule/appointments/[id]/create-form.jsx
 *   - the edit/reschedule form loads the appointment and HARD-CODES `status: "scheduled"` (formik.setValues),
 *   - on Update the whole form (`...values`) is PUT to /aesthetic/appointments/:id,
 *   - the backend applies `appointment.update(data)` blindly → "Confirmed" becomes "Scheduled".
 *
 * Fix under test (emr-frontend, merged into qa_release/1.1.11.1 on 2026-11-12):
 *   05914b1  create-form load: status = payload.status === "confirmed" ? "confirmed" : "scheduled"
 *   8a0c677  follow-ups (Quick Schedule "Custom Date" / "N Weeks" / Scheduling tab) inherit "confirmed";
 *            no_patient loaded from the appointment; <Select key={status}>
 *   → Agreed rule (ticket clarification 2026-11-12): only "confirmed" is kept on reschedule/edit; every other
 *     status returns to the default "scheduled" (TC-006, TC-015 verify the rule). The status still changes
 *     only when the user changes it (TC-007, TC-023) – except the follow-up race in TC-033 (BP-12).
 *
 * Test data: realistic, fictional clients (CLIENTS below, emails on the reserved example.com domain) with
 * realistic front-desk notes (NOTES below). Appointments are booked on far-future dates (2027-11 … 2028-05)
 * so they never show up on the clinic's working calendar; every UI test that clicks a calendar card uses its
 * own date. Each test records "appointment #id · client" in the report. Cleanup in afterAll.
 * Skip everything that creates data with EMR237_READONLY=1 (TC-000 still runs – it is read-only).
 */

const READONLY = process.env.EMR237_READONLY === '1';

/**
 * Fictional clients with realistic details – the same fields the New Client form sends
 * (name, email, mobile, dob, gender). Emails use example.com (reserved, nothing is ever delivered).
 * Mobiles are made up in the Sri Lankan format: they could belong to someone real, so never use the
 * WhatsApp "Confirmation" button on these test appointments. Each client is created once on QA
 * (found again by email) and reused by later runs.
 * @type {{ name: string, email: string, mobile: string, gender: 'Female'|'Male', dob: [number, number, number], id?: number }[]}
 */
const CLIENTS = [
  { name: 'Nimali Perera', email: 'nimali.perera@example.com', mobile: '0771234501', gender: 'Female', dob: [1992, 3, 14] },
  { name: 'Tharushi Fernando', email: 'tharushi.fernando@example.com', mobile: '0712345602', gender: 'Female', dob: [1996, 7, 22] },
  { name: 'Kasun Herath', email: 'kasun.herath@example.com', mobile: '0763456703', gender: 'Male', dob: [1988, 11, 5] },
  { name: 'Dilani Rathnayake', email: 'dilani.rathnayake@example.com', mobile: '0754567804', gender: 'Female', dob: [1985, 1, 30] },
  { name: 'Sachini Liyanage', email: 'sachini.liyanage@example.com', mobile: '0725678905', gender: 'Female', dob: [1999, 9, 18] },
  { name: 'Chamath Ekanayake', email: 'chamath.ekanayake@example.com', mobile: '0786789006', gender: 'Male', dob: [1983, 12, 11] },
];
/** Client for a test, fixed by its number: TC-001 → Nimali Perera, TC-002 → Tharushi Fernando, … (wraps after 6). */
const clientFor = (label) => CLIENTS[(Number((/TC-(\d+)/.exec(label) || [])[1] || 1) - 1) % CLIENTS.length];

/** Front-desk note on each test appointment (key = test id). */
const NOTES = {
  'TC-001': 'First visit – consultation for pigmentation on both cheeks.',
  'TC-002': 'Client asked for a slightly later slot on the same day.',
  'TC-003': 'Travelling overseas – asked to move the session a few months ahead.',
  'TC-004': 'Wants to add a treatment after the consultation.',
  'TC-005': 'Regular client – prefers morning slots.',
  'TC-006': 'Review visit after the second laser session.',
  'TC-007': 'Booked over the phone.',
  'TC-008': 'Asked about evening availability – keeping this slot for now.',
  'TC-009': "Moved to the afternoon at the client's request.",
  'TC-010': 'Undecided between HydraFacial and microneedling.',
  'TC-012': 'Laser machine servicing – no client.',
  'TC-013': 'Client changed their mind about the add-on treatment.',
  'TC-014': 'Rescheduled after a missed call.',
  'TC-015': 'Walk-in follow-up.',
  'TC-020': 'Moved to another doctor – original doctor on leave.',
  'TC-021': 'Booked through an Instagram enquiry.',
  'TC-022': 'Treatment plan agreed at the last consultation.',
  'TC-023': 'Client is in the treatment room.',
  'TC-024': 'Corporate package client.',
  'TC-025': 'Booked by a family member.',
  'TC-026': 'Has rescheduled several times because of work travel.',
  'TC-027': 'Bridal package – trial session.',
  'TC-030': 'Course of 3 sessions – book the next one.',
  'TC-031': 'Session completed – client wants a follow-up.',
  'TC-032': 'Follow-up in 2 weeks as advised by the doctor.',
};

/** Local wall-clock time → ISO. Node and the browser share the machine timezone, so the form shows these hours. */
const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const slot = (y, m, d, h, min = 0, mins = 30) => ({ start_time: at(y, m, d, h, min), end_time: at(y, m, d, h, min + mins) });
const pad = (n) => String(n).padStart(2, '0');

const STATUS_LABEL = {
  scheduled: 'Scheduled', confirmed: 'Confirmed', waiting: 'Waiting', engaged: 'Engaged',
  completed: 'Completed', cancelled: 'Cancelled', 'no-show': 'No Show', 'not-reachable': 'Not Reachable',
};

test.describe('EMR-237: editing an appointment keeps Confirmed (other statuses return to Scheduled)', () => {
  // Independent tests (each creates its own appointment) – one failure must not hide the others
  test.describe.configure({ mode: 'default' });
  const DESKTOP_CHROMIUM_ONLY = 'EMR-237 runs on desktop Chromium only (creates QA data + desktop Schedule UI)';

  /** @type {import('@playwright/test').BrowserContext} */ let context;
  /** @type {import('@playwright/test').Page} */ let page;
  /** @type {Record<string,string>} */ let headers = {};
  let apiBase = '';
  const ctx = { doctorId: null, doctor2Id: null, typeId: null };
  const created = { appointments: [] };

  const call = async (method, p, data) => {
    const r = await page.request.fetch(apiBase + p, { method, headers, data });
    let body = null;
    try { body = await r.json(); } catch {}
    return { status: r.status(), body };
  };
  const getAppt = async (id) => {
    const r = await call('GET', `/aesthetic/appointments/${id}`);
    return r.body?.payload ?? r.body;
  };
  const statusOf = async (id) => (await getAppt(id))?.status;

  /**
   * Create an appointment for the test's client and put it into `status` (default "confirmed").
   * `label` is the test id ("TC-002", "TC-006 waiting"): it picks the client and the front-desk note.
   * `extra` overrides body fields, e.g. { patient_id: null } for a "No Patient Needed" booking.
   * Returns the appointment plus `client` (null when there is no patient).
   */
  async function createAppt(when, status = 'confirmed', label = '', extra = {}) {
    const client = extra.patient_id === null ? null : await ensureClient(clientFor(label));
    const r = await call('POST', '/aesthetic/appointments', {
      ...when, notes: NOTES[label.split(' ')[0]] || '', status: 'scheduled',
      patient_id: client ? client.id : null, doctor_id: ctx.doctorId, appointment_type_id: ctx.typeId,
      ...extra,
    });
    expect(r.status, JSON.stringify(r.body)).toBeLessThan(400);
    const appt = r.body?.payload?.appointment;
    expect(appt?.id, 'appointment id').toBeTruthy();
    created.appointments.push(appt.id);
    test.info().annotations.push({ type: 'data', description: `appointment #${appt.id} · ${client ? `${client.name} <${client.email}>` : 'no patient'} · ${status}` });
    if (status !== 'scheduled') {
      // Same call the Appointment Details status menu makes: PUT { status }
      const s = await call('PUT', `/aesthetic/appointments/${appt.id}`, { status });
      expect(s.status, JSON.stringify(s.body)).toBe(200);
    }
    expect(await statusOf(appt.id), 'precondition: status set').toBe(status);
    return { ...appt, client };
  }

  /** Find a roster client on QA by email, or create it with the fields the New Client form sends. Cached per worker. */
  async function ensureClient(c) {
    if (c.id) return c;
    const found = (await call('GET', `/aesthetic/patients?page=1&limit=10&search=${encodeURIComponent(c.email)}`)).body?.payload;
    const list = Array.isArray(found) ? found : found?.patients || found?.rows || found?.data || [];
    let p = list.find((x) => String(x.email || '').toLowerCase() === c.email);
    if (!p) {
      const [y, m, d] = c.dob;
      const r = await call('POST', '/aesthetic/patients', {
        name: c.name, email: c.email, mobile: c.mobile, gender: c.gender, dob: new Date(y, m - 1, d).toISOString(),
      });
      expect(r.status, `create client ${c.name}: ${JSON.stringify(r.body)}`).toBe(200);
      p = r.body?.payload;
    }
    expect(p?.id, `client id for ${c.name}`).toBeTruthy();
    c.id = p.id;
    return c;
  }

  // ---------------------------------------------------------------- UI helpers (reschedule form)
  /** Status <Select> of the appointment form. Pass a scope (e.g. the Create Appointment modal) when another dialog is open. */
  // (the `has` locator must be page-rooted: inside filter() it is resolved relative to each candidate div)
  const statusCombo = (scope = page) =>
    scope.locator('div.space-y-2').filter({ has: page.getByText('Appointment Status', { exact: true }) }).getByRole('combobox');

  /** Schedule page → click the client's card on `date` → Appointment Details dialog. Dates must be unique per test. */
  async function openDetailsFromSchedule(date, clientName) {
    await page.goto(`/admin/aesthetic-schedule?date=${date}`, { waitUntil: 'domcontentloaded' });
    const card = page.getByText(clientName).first();
    await expect(card).toBeVisible({ timeout: 30000 });
    await card.click();
    const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Appointment Details' });
    await expect(dlg).toBeVisible({ timeout: 15000 });
    return dlg;
  }

  /**
   * Appointment Details → Quick Schedule Follow-up → "Custom Date" → pick y-m-d → Create Appointment modal.
   * react-day-picker v8: nav buttons name="next-month", day buttons name="day".
   */
  async function openCustomDateFollowUp(dlg, y, m, d) {
    await dlg.getByRole('button', { name: 'Custom Date' }).click();
    const pop = page.locator('[data-radix-popper-content-wrapper]').filter({ has: page.locator('button[name="day"]') });
    await expect(pop).toBeVisible({ timeout: 10000 });
    const now = new Date();
    const clicks = (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1));
    for (let i = 0; i < clicks; i++) await pop.locator('button[name="next-month"]').click();
    await pop.locator('button[name="day"]:not([disabled])').filter({ hasText: new RegExp(`^${d}$`) }).first().click();
    // The dialog wrapper injects a generic title, so the modal's accessible name is "Dialog" – find it by content
    const modal = page.getByRole('dialog').filter({ has: page.locator('input[name="appointment_date"]') });
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(statusCombo(modal)).toBeVisible({ timeout: 10000 });
    return modal;
  }

  /** Requests to GET /aesthetic/appointments/:id (no sub-path) – used to slow down the form's data load. */
  const apptGetRe = (id) => new RegExp(`/aesthetic/appointments/${id}(\\?[^/]*)?$`);

  /** Open the edit/reschedule form for an appointment and wait until its values are loaded. */
  async function openRescheduleForm(appt) {
    await page.goto(`/admin/aesthetic-schedule/appointments/${appt.id}?reschedule=true`, { waitUntil: 'domcontentloaded' });
    const d = new Date(appt.start_time);
    await expect(page.locator('input[name="appointment_date"]')).toHaveValue(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, { timeout: 30000 });
    await expect(page.locator('input[name="start_time"]')).toHaveValue(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
  }

  /** Click Update and return { sentStatus, responseStatus } of the PUT the form makes. */
  async function submitUpdate(apptId) {
    const reqP = page.waitForRequest((r) => r.method() === 'PUT' && new RegExp(`/aesthetic/appointments/${apptId}$`).test(r.url()), { timeout: 20000 });
    const resP = page.waitForResponse((r) => r.request().method() === 'PUT' && new RegExp(`/aesthetic/appointments/${apptId}$`).test(r.url()), { timeout: 20000 });
    await page.getByRole('button', { name: 'Update' }).click();
    const req = await reqP;
    const res = await resP;
    let sent = {};
    try { sent = req.postDataJSON() || {}; } catch {}
    await page.waitForURL(/\/admin\/aesthetic-schedule\?date=/, { timeout: 20000 }).catch(() => {});
    test.info().annotations.push({ type: 'observed', description: `form PUT sent status="${sent.status}" → HTTP ${res.status()}` });
    return { sentStatus: sent.status, responseStatus: res.status() };
  }

  // ---------------------------------------------------------------- lifecycle
  test.beforeAll(async ({ browser, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, DESKTOP_CHROMIUM_ONLY);
    test.setTimeout(150000);
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
    await expect.poll(() => !!headers.authorization, { timeout: 20000 }).toBe(true);

    if (READONLY) return;
    const doctors = (await call('GET', '/aesthetic/doctors')).body?.payload || [];
    expect(doctors.length, 'at least one aesthetic doctor').toBeGreaterThan(0);
    ctx.doctorId = doctors[0].id;
    ctx.doctor2Id = (doctors[1] || doctors[0]).id;
    const types = (await call('GET', '/aesthetic/appointment-types')).body?.payload || [];
    const type = types.find((t) => t.active !== false) || types[0];
    expect(type?.id, 'an appointment type').toBeTruthy();
    ctx.typeId = type.id;
    // clients are found/created on first use (ensureClient), so a run only touches the clients it needs
  });

  test.afterAll(async () => {
    for (const id of created.appointments) {
      // remove planned/scheduled treatment rows first (they block DELETE), then soft-delete
      const rows = (await call('GET', `/aesthetic/appointments/${id}/scheduling`).catch(() => null))?.body?.payload || [];
      for (const t of Array.isArray(rows) ? rows : []) await call('DELETE', `/aesthetic/appointments/${id}/treatments/${t.id}`).catch(() => null);
      const r = await call('DELETE', `/aesthetic/appointments/${id}`).catch(() => null);
      if (!r || r.status >= 400) await call('PUT', `/aesthetic/appointments/${id}`, { status: 'deleted' }).catch(() => null);
    }
    await context?.close();
  });

  test.beforeEach(({}, testInfo) => {
    test.skip(READONLY && !testInfo.title.startsWith('TC-000'), 'EMR237_READONLY=1 – data-creating tests skipped');
  });

  // ======================================================== Part 0: which build is QA running?
  test('TC-000: QA build fingerprint – the latest EMR-237 commit (8a0c677) is deployed', async () => {
    // The app shows no version. localStorage key literals survive minification, so the JS bundle of the
    // appointment form tells us which commit is deployed: "nsrc" exists only from 8a0c677 on.
    test.setTimeout(60000);
    const scripts = [];
    const onRes = (r) => { if (r.request().resourceType() === 'script' && r.url().includes('/_next/')) scripts.push(r); };
    page.on('response', onRes);
    await page.goto('/admin/aesthetic-schedule/appointments/new', { waitUntil: 'load' });
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible({ timeout: 30000 });
    page.off('response', onRes);
    let nsrc = false; let confirmedOnly = 0;
    for (const r of scripts) {
      const t = await r.text().catch(() => '');
      if (/["']nsrc["']/.test(t)) nsrc = true;
      confirmedOnly += (t.match(/\?\s*"confirmed"\s*:\s*"scheduled"/g) || []).length;
    }
    test.info().annotations.push({
      type: 'observed',
      description: `scripts scanned: ${scripts.length}; "nsrc" (8a0c677): ${nsrc ? 'present' : 'absent'}; ` +
        `'? "confirmed" : "scheduled"' occurrences (05914b1/8a0c677): ${confirmedOnly}`,
    });
    expect(nsrc, 'QA must serve qa_release/1.1.11.1 (EMR-237 commit 8a0c677) for this re-test to be valid').toBe(true);
  });

  // ======================================================== Part 1: UI – the reported defect
  test('TC-001: Schedule → Appointment Details → Reschedule opens the form with the CURRENT status (Confirmed)', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(slot(2027, 11, 15, 10), 'confirmed', 'TC-001');
    // Real user path from the ticket: Schedule → card → Appointment Details → Reschedule
    const dlg = await openDetailsFromSchedule('2027-11-15', appt.client.name);
    await expect(dlg.getByText('Patient confirmed attendance')).toBeVisible();
    await dlg.getByRole('button', { name: /Reschedule/ }).click();
    await page.waitForURL(new RegExp(`/appointments/${appt.id}\\?reschedule=true`), { timeout: 20000 });
    await openRescheduleForm(appt);
    test.info().annotations.push({ type: 'defect', description: 'RC-1: create-form.jsx load effect sets status: "scheduled" instead of payload.status' });
    await expect(statusCombo(), 'form must pre-select the saved status').toHaveText(/Confirmed/, { timeout: 5000 });
  });

  test('TC-002: reschedule time (same day) via the form keeps "Confirmed"', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(slot(2027, 11, 16, 10), 'confirmed', 'TC-002');
    await openRescheduleForm(appt);
    await page.locator('input[name="start_time"]').fill('11:00');
    const { sentStatus, responseStatus } = await submitUpdate(appt.id);
    expect(responseStatus).toBe(200);
    const after = await getAppt(appt.id);
    expect(new Date(after.start_time).getHours(), 'time actually moved').toBe(11);
    expect(sentStatus, 'form must not send a different status').toBe('confirmed');
    expect(after.status, 'status after reschedule').toBe('confirmed');
  });

  test('TC-003: reschedule several months ahead via the form keeps "Confirmed"', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(slot(2027, 11, 17, 10), 'confirmed', 'TC-003');
    await openRescheduleForm(appt);
    await page.locator('input[name="appointment_date"]').fill('2028-04-18');
    await page.locator('input[name="start_time"]').fill('12:00');
    const { responseStatus } = await submitUpdate(appt.id);
    expect(responseStatus).toBe(200);
    const after = await getAppt(appt.id);
    const d = new Date(after.start_time);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()], 'date actually moved').toEqual([2028, 4, 18]);
    expect(after.status).toBe('confirmed');
  });

  test('TC-004: add a treatment via the form (no time change) keeps "Confirmed"', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(slot(2027, 11, 18, 10), 'confirmed', 'TC-004');
    await openRescheduleForm(appt);
    await page.getByRole('button', { name: 'Add Treatment' }).click();
    const tdlg = page.locator('[role="dialog"]').filter({ hasText: 'Select Treatments' });
    await expect(tdlg).toBeVisible({ timeout: 10000 });
    const addBtn = tdlg.getByRole('button', { name: /^Add$/ }).first();
    await expect(addBtn, 'at least one treatment exists in Settings').toBeVisible({ timeout: 15000 });
    await addBtn.click();
    await tdlg.getByRole('button', { name: /Add Selected \(1\)/ }).click();
    await expect(tdlg).toBeHidden();
    await submitUpdate(appt.id);
    const rows = (await call('GET', `/aesthetic/appointments/${appt.id}/scheduling`)).body?.payload || [];
    test.info().annotations.push({ type: 'observed', description: `treatment rows after save: ${rows.length}` });
    expect(await statusOf(appt.id)).toBe('confirmed');
  });

  test('TC-005: only Notes edited via the form keeps "Confirmed"', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(slot(2027, 11, 19, 10), 'confirmed', 'TC-005');
    await openRescheduleForm(appt);
    await page.locator('textarea[name="notes"]').fill(`${NOTES['TC-005']} Requested numbing cream 30 minutes before the session.`);
    await submitUpdate(appt.id);
    const after = await getAppt(appt.id);
    expect(after.notes).toContain('numbing cream');
    expect(after.status).toBe('confirmed');
  });

  // Agreed rule (ticket clarification 2026-11-12): only Confirmed is kept – every other status returns to Scheduled.
  for (const status of ['waiting', 'engaged', 'not-reachable', 'no-show', 'completed', 'cancelled']) {
    test(`TC-006 [${status}]: reschedule a "${STATUS_LABEL[status]}" appointment → status returns to "Scheduled" (rule)`, async () => {
      test.setTimeout(90000);
      test.info().annotations.push({ type: 'rule', description: 'Only Confirmed is kept on reschedule/edit; every other status returns to the default "Scheduled"' });
      const day = 22 + ['waiting', 'engaged', 'not-reachable', 'no-show', 'completed', 'cancelled'].indexOf(status);
      const appt = await createAppt(slot(2027, 11, day, 10), status, `TC-006 ${status}`);
      await openRescheduleForm(appt);
      await expect(statusCombo(), 'form pre-selects the default status').toHaveText(/Scheduled/);
      await page.locator('input[name="start_time"]').fill('13:00');
      const { sentStatus, responseStatus } = await submitUpdate(appt.id);
      expect(responseStatus).toBe(200);
      const after = await getAppt(appt.id);
      expect(new Date(after.start_time).getHours(), 'time actually moved').toBe(13);
      expect(sentStatus).toBe('scheduled');
      expect(after.status, `"${status}" returns to "scheduled"`).toBe('scheduled');
    });
  }

  test('TC-007: user changes the status manually in the form → new status is saved (AC-2)', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(slot(2027, 11, 20, 10), 'confirmed', 'TC-007');
    await openRescheduleForm(appt);
    await statusCombo().click();
    await page.getByRole('option', { name: 'Waiting' }).click();
    await expect(statusCombo()).toHaveText(/Waiting/);
    const { sentStatus } = await submitUpdate(appt.id);
    expect(sentStatus).toBe('waiting');
    expect(await statusOf(appt.id)).toBe('waiting');
  });

  test('TC-008: Cancel on the reschedule form changes nothing', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(slot(2027, 11, 21, 10), 'confirmed', 'TC-008');
    let putSent = false;
    const onReq = (r) => { if (r.method() === 'PUT' && r.url().includes(`/aesthetic/appointments/${appt.id}`)) putSent = true; };
    page.on('request', onReq);
    await openRescheduleForm(appt);
    await page.locator('input[name="start_time"]').fill('15:00');
    await page.getByRole('link', { name: 'Cancel' }).click();
    await page.waitForURL(/\/admin\/aesthetic-schedule/, { timeout: 15000 });
    page.off('request', onReq);
    expect(putSent, 'no PUT on cancel').toBe(false);
    const after = await getAppt(appt.id);
    expect(after.status).toBe('confirmed');
    expect(new Date(after.start_time).getHours()).toBe(10);
  });

  test('TC-009: Appointment Details still shows "Confirmed" after a reschedule (UI read-back)', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(slot(2027, 11, 29, 10), 'confirmed', 'TC-009');
    await openRescheduleForm(appt);
    await page.locator('input[name="start_time"]').fill('14:00');
    await submitUpdate(appt.id);
    const dlg = await openDetailsFromSchedule('2027-11-29', appt.client.name);
    await expect(dlg.getByText('Patient confirmed attendance')).toBeVisible();
  });

  test('TC-010: removing a treatment row (X) in the form must NOT submit the form (BP-3)', async () => {
    test.setTimeout(90000);
    // Latent today: the X has no type="button" (defaults to submit), but React removes the row during the click,
    // so the detached button never submits. Any change that keeps the row (e.g. a confirm step) turns this into a silent save.
    test.info().annotations.push({ type: 'breakpoint', description: 'BP-3 (latent): X button on a selected treatment has no type="button" → defaults to submit inside <form>' });
    const appt = await createAppt(slot(2027, 11, 30, 10), 'confirmed', 'TC-010');
    await openRescheduleForm(appt);
    await page.getByRole('button', { name: 'Add Treatment' }).click();
    const tdlg = page.locator('[role="dialog"]').filter({ hasText: 'Select Treatments' });
    await expect(tdlg).toBeVisible({ timeout: 10000 });
    await tdlg.getByRole('button', { name: /^Add$/ }).first().click();
    await tdlg.getByRole('button', { name: /Add Selected \(1\)/ }).click();
    await expect(tdlg).toBeHidden();
    let putSent = false;
    const onReq = (r) => { if (r.method() === 'PUT' && r.url().includes(`/aesthetic/appointments/${appt.id}`)) putSent = true; };
    page.on('request', onReq);
    // Selected-treatment rows sit under the "Treatments" label; the X is the only button in a row
    const section = page.locator('form div.flex.flex-col.gap-2').filter({ has: page.getByText('Treatments', { exact: true }) });
    const rows = section.locator('div.space-y-2 > div');
    await expect(rows, 'one treatment selected').toHaveCount(1);
    const rowText = (await rows.first().innerText()).trim();
    const xType = await rows.first().getByRole('button').getAttribute('type');
    await rows.first().getByRole('button').click();
    await page.waitForTimeout(2500);
    page.off('request', onReq);
    test.info().annotations.push({ type: 'observed', description: `X button type="${xType}"; PUT sent on X click: ${putSent}; url now ${page.url()}` });
    expect(putSent, 'removing a treatment row must not save the appointment').toBe(false);
    await expect(page.getByText(rowText, { exact: true }), 'row removed from the form').toBeHidden();
  });

  // ======================================================== Part 2: API contract – other edit paths
  test('TC-020: drag-and-drop shape PUT {doctor_id,start_time,end_time} keeps status', async () => {
    const appt = await createAppt(slot(2027, 12, 1, 10), 'confirmed', 'TC-020');
    const r = await call('PUT', `/aesthetic/appointments/${appt.id}`, { doctor_id: ctx.doctor2Id, ...slot(2027, 12, 1, 15) });
    expect(r.status).toBe(200);
    expect(await statusOf(appt.id)).toBe('confirmed');
  });

  test('TC-021: notes-only PUT (Appointment Details note box) keeps status', async () => {
    const appt = await createAppt(slot(2027, 12, 2, 10), 'confirmed', 'TC-021');
    const r = await call('PUT', `/aesthetic/appointments/${appt.id}`, { notes: 'Reminder call done – client will bring previous reports.' });
    expect(r.status).toBe(200);
    expect(await statusOf(appt.id)).toBe('confirmed');
  });

  test('TC-022: adding a scheduled treatment (Treatment Room / Add Treatment) keeps status', async () => {
    const appt = await createAppt(slot(2027, 12, 3, 10), 'confirmed', 'TC-022');
    const list = (await call('GET', '/aesthetic/treatments')).body?.payload || [];
    test.skip(!list.length, 'no treatments configured');
    const t = list[0];
    const r = await call('POST', `/aesthetic/appointments/${appt.id}/scheduled-treatments`, {
      treatment_id: t.id, name: t.name, notes: 'Session 1 of the agreed treatment plan.', session_index: 1,
    });
    expect(r.status, JSON.stringify(r.body)).toBeLessThan(400);
    expect(await statusOf(appt.id)).toBe('confirmed');
  });

  test('TC-023: explicit status PUT still changes the status (AC-2, status menu)', async () => {
    const appt = await createAppt(slot(2027, 12, 4, 10), 'confirmed', 'TC-023');
    const r = await call('PUT', `/aesthetic/appointments/${appt.id}`, { status: 'engaged' });
    expect(r.status).toBe(200);
    expect(await statusOf(appt.id)).toBe('engaged');
  });

  test('TC-024: invalid status value is rejected with 4xx and status is unchanged (BP-5)', async () => {
    test.fail(true, 'Known gap EMR-237/BP-5: Sequelize ENUM validation error is returned as HTTP 500 (status is unchanged, so data is safe)');
    const appt = await createAppt(slot(2027, 12, 6, 10), 'confirmed', 'TC-024');
    const r = await call('PUT', `/aesthetic/appointments/${appt.id}`, { status: 'rescheduled' });
    test.info().annotations.push({ type: 'observed', description: `PUT status "rescheduled" → ${r.status}: ${JSON.stringify(r.body).slice(0, 160)}` });
    expect(await statusOf(appt.id), 'status must be unchanged').toBe('confirmed');
    expect(r.status, 'validation error should be 400, not 500/200').toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
  });

  test('TC-025: empty / null status in an edit payload must not wipe or reset the status (BP-5)', async () => {
    const appt = await createAppt(slot(2027, 12, 7, 10), 'confirmed', 'TC-025');
    const r1 = await call('PUT', `/aesthetic/appointments/${appt.id}`, { ...slot(2027, 12, 7, 11), status: '' });
    const r2 = await call('PUT', `/aesthetic/appointments/${appt.id}`, { ...slot(2027, 12, 7, 12), status: null });
    test.info().annotations.push({ type: 'observed', description: `status "" → ${r1.status}; status null → ${r2.status}` });
    expect(await statusOf(appt.id)).toBe('confirmed');
  });

  test('TC-026: repeated reschedules (3x) keep status every time', async () => {
    const appt = await createAppt(slot(2027, 12, 8, 10), 'confirmed', 'TC-026');
    for (const [m, d, h] of [[12, 9, 11], [1, 10, 12], [5, 11, 9]]) {
      const y = m === 12 ? 2027 : 2028;
      const r = await call('PUT', `/aesthetic/appointments/${appt.id}`, slot(y, m, d, h));
      expect(r.status).toBe(200);
      expect(await statusOf(appt.id), `after move to ${y}-${m}-${d}`).toBe('confirmed');
    }
  });

  test('TC-027: Appointment Log (all-appointments) reports the rescheduled appointment as Confirmed', async () => {
    const appt = await createAppt(slot(2027, 12, 13, 10), 'confirmed', 'TC-027');
    await call('PUT', `/aesthetic/appointments/${appt.id}`, slot(2027, 12, 14, 10));
    const q = `start=${encodeURIComponent(at(2027, 12, 14, 0))}&end=${encodeURIComponent(at(2027, 12, 14, 23, 59))}&status=confirmed&page=1&limit=50`;
    const r = await call('GET', `/aesthetic/all-appointments?${q}`);
    const p = r.body?.payload;
    const rows = p?.appointments || p?.rows || p?.data || (Array.isArray(p) ? p : []);
    expect(rows.some((x) => x.id === appt.id), 'listed under the Confirmed filter').toBe(true);
  });

  // ======================================================== Part 3: re-test of qa_release/1.1.11.1 (commit 8a0c677)
  // ---- side effects of the edit form
  // (No Availability-page test: that page renders unavailability blocks only, so its Appointment Details
  //  dialog – and the undefined handleReschedule() at availability/page.js:363 – is unreachable. See BP-11.)
  test('TC-012: appointment WITHOUT a patient – reschedule keeps status and "No Patient Needed" stays ticked (8a0c677)', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(slot(2027, 12, 16, 10), 'confirmed', 'TC-012', { patient_id: null });
    await openRescheduleForm(appt);
    await expect(page.locator('#no_patient'), 'no_patient is now loaded from the appointment').toBeChecked();
    await page.locator('input[name="start_time"]').fill('11:00');
    const { responseStatus } = await submitUpdate(appt.id);
    expect(responseStatus).toBe(200);
    const after = await getAppt(appt.id);
    expect(after.patient_id ?? null, 'still no patient').toBeNull();
    expect(new Date(after.start_time).getHours(), 'time moved').toBe(11);
    expect(after.status).toBe('confirmed');
  });

  test('TC-013: removing an EXISTING treatment in the reschedule form is saved (BP-4)', async () => {
    test.setTimeout(90000);
    test.fail(true, 'Known gap EMR-237/BP-4 (pre-existing): create-form onSuccess only POSTs NEW treatments – removed ones are never deleted (confirmed on QA 2026-11-12)');
    const appt = await createAppt(slot(2027, 12, 17, 10), 'confirmed', 'TC-013');
    const list = (await call('GET', '/aesthetic/treatments')).body?.payload || [];
    test.skip(!list.length, 'no treatments configured');
    const add = await call('POST', `/aesthetic/appointments/${appt.id}/scheduled-treatments`, {
      treatment_id: list[0].id, name: list[0].name, notes: 'Add-on treatment discussed at the consultation.', session_index: 1,
    });
    expect(add.status, JSON.stringify(add.body)).toBeLessThan(400);
    await openRescheduleForm(appt);
    const section = page.locator('form div.flex.flex-col.gap-2').filter({ has: page.getByText('Treatments', { exact: true }) });
    const rows = section.locator('div.space-y-2 > div');
    await expect(rows, 'existing treatment listed in the form').toHaveCount(1, { timeout: 15000 });
    await rows.first().getByRole('button').click();
    await expect(rows).toHaveCount(0);
    await submitUpdate(appt.id);
    const after = (await call('GET', `/aesthetic/appointments/${appt.id}/scheduling`)).body?.payload || [];
    test.info().annotations.push({ type: 'observed', description: `treatment rows after removing it in the form and saving: ${after.length}` });
    expect(await statusOf(appt.id), 'status kept').toBe('confirmed');
    expect(after.length, 'treatment removed in the form must be removed on save').toBe(0);
  });

  test('TC-014: slow load – clicking Update before the appointment has loaded saves nothing (BP-2 guard)', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(slot(2027, 12, 20, 10), 'confirmed', 'TC-014');
    const re = apptGetRe(appt.id);
    const slow = async (route) => {
      if (route.request().method() === 'GET') await new Promise((r) => setTimeout(r, 6000));
      await route.continue().catch(() => {});
    };
    await page.route(re, slow);
    let putSent = false;
    const onReq = (r) => { if (r.method() === 'PUT' && re.test(r.url())) putSent = true; };
    page.on('request', onReq);
    try {
      await page.goto(`/admin/aesthetic-schedule/appointments/${appt.id}?reschedule=true`, { waitUntil: 'domcontentloaded' });
      const btn = page.getByRole('button', { name: 'Update' });
      await expect(btn).toBeVisible({ timeout: 15000 });
      let clickResult = 'clicked';
      await btn.click({ timeout: 2500 }).catch((e) => { clickResult = `blocked (${String(e.message).split('\n')[0].slice(0, 90)})`; });
      await page.waitForTimeout(1500);
      test.info().annotations.push({ type: 'observed', description: `early Update click: ${clickResult}; PUT sent: ${putSent}` });
      expect(putSent, 'no PUT with default/empty values').toBe(false);
      // once loaded, the real values and status are shown
      await expect(page.locator('input[name="start_time"]')).toHaveValue('10:00', { timeout: 20000 });
      await expect(statusCombo()).toHaveText(/Confirmed/);
    } finally {
      page.off('request', onReq);
      await page.unroute(re, slow);
    }
    expect(await statusOf(appt.id)).toBe('confirmed');
  });

  test('TC-015: WAITING appointment, notes-only edit (no reschedule) → status returns to "Scheduled" (rule)', async () => {
    // The rule is applied when the form LOADS (create-form.jsx:291), so it covers any save from the form –
    // not only a time change. Note for the team: this includes clients already in the clinic (Waiting/Engaged).
    test.setTimeout(90000);
    test.info().annotations.push({ type: 'rule', description: 'Any save from the reschedule form keeps Confirmed only; other statuses return to "Scheduled"' });
    const appt = await createAppt(slot(2027, 12, 28, 10), 'waiting', 'TC-015');
    await openRescheduleForm(appt);
    await page.locator('textarea[name="notes"]').fill('Arrived 10 minutes early – waiting at reception.');
    const { sentStatus } = await submitUpdate(appt.id);
    const after = await getAppt(appt.id);
    expect(after.notes, 'note saved').toContain('waiting at reception');
    expect(new Date(after.start_time).getHours(), 'time unchanged').toBe(10);
    expect(sentStatus).toBe('scheduled');
    expect(after.status, 'status after a notes-only edit').toBe('scheduled');
  });

  // ---- NEW behaviour in 8a0c677: follow-up appointments inherit "Confirmed"
  test('TC-030: Quick Schedule → Custom Date from a CONFIRMED appointment → follow-up is created Confirmed (rule)', async () => {
    test.setTimeout(120000);
    test.info().annotations.push({ type: 'rule', description: 'Same rule applied to follow-ups (8a0c677): Confirmed carries over to the new booking' });
    const appt = await createAppt(slot(2027, 12, 21, 10), 'confirmed', 'TC-030');
    const dlg = await openDetailsFromSchedule('2027-12-21', appt.client.name);
    const modal = await openCustomDateFollowUp(dlg, 2028, 1, 19);
    await expect(modal.locator('input[name="appointment_date"]')).toHaveValue('2028-01-19');
    await expect(modal.getByText(appt.client.name).first(), 'client carried over to the follow-up').toBeVisible();
    await expect(statusCombo(modal), 'follow-up form pre-selects the source status').toHaveText(/Confirmed/);
    await modal.locator('textarea[name="notes"]').fill('Session 2 of 3 – same therapist if possible.');
    const reqP = page.waitForRequest((r) => r.method() === 'POST' && /\/aesthetic\/appointments$/.test(new URL(r.url()).pathname), { timeout: 20000 });
    const resP = page.waitForResponse((r) => r.request().method() === 'POST' && /\/aesthetic\/appointments$/.test(new URL(r.url()).pathname), { timeout: 20000 });
    await modal.getByRole('button', { name: 'Create' }).click();
    const req = await reqP;
    const res = await resP;
    const body = await res.json().catch(() => ({}));
    const newId = body?.payload?.appointment?.id;
    if (newId) created.appointments.push(newId);
    const sent = (() => { try { return req.postDataJSON() || {}; } catch { return {}; } })();
    test.info().annotations.push({ type: 'data', description: `follow-up appointment #${newId} · ${appt.client.name} <${appt.client.email}>` });
    test.info().annotations.push({ type: 'observed', description: `follow-up POST status="${sent.status}" → HTTP ${res.status()}, id ${newId}` });
    expect(res.status()).toBeLessThan(400);
    expect(newId, 'follow-up created').toBeTruthy();
    expect(await statusOf(newId), 'follow-up status (as implemented in 8a0c677)').toBe('confirmed');
    expect(await statusOf(appt.id), 'source appointment untouched').toBe('confirmed');
  });

  test('TC-031: Quick Schedule → Custom Date from a COMPLETED appointment → follow-up starts Scheduled (rule)', async () => {
    test.setTimeout(90000);
    test.info().annotations.push({ type: 'rule', description: 'Same rule applied to follow-ups (8a0c677): only Confirmed carries over; any other status starts Scheduled' });
    const appt = await createAppt(slot(2027, 12, 22, 10), 'completed', 'TC-031');
    const dlg = await openDetailsFromSchedule('2027-12-22', appt.client.name);
    const modal = await openCustomDateFollowUp(dlg, 2028, 1, 20);
    await expect(statusCombo(modal)).toHaveText(/Scheduled/);
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toBeHidden();
  });

  test('TC-032: Quick Schedule → "2 Weeks" → pick a date → new appointment form inherits Confirmed (nsrc flow, 8a0c677)', async () => {
    test.setTimeout(120000);
    const appt = await createAppt(slot(2027, 12, 23, 10), 'confirmed', 'TC-032');
    const dlg = await openDetailsFromSchedule('2027-12-23', appt.client.name);
    await dlg.getByRole('button', { name: '2 Weeks', exact: true }).click();
    await page.waitForURL(new RegExp(`/appointments/${appt.id}\\?tab=scheduling&jump=2`), { timeout: 20000 });
    // the calendar jumps to source + 2 weeks (2028-01-06) and highlights it (dayPropGetter → #dbeafe)
    await expect(page.locator('.rbc-month-view .rbc-day-bg[style*="219, 234, 254"]').first()).toBeVisible({ timeout: 30000 });
    await page.locator('.rbc-month-view .rbc-date-cell:not(.rbc-off-range) button').filter({ hasText: /^0?7$/ }).first().click();
    await page.waitForURL(/\/admin\/aesthetic-schedule\?date=2028-01-07/, { timeout: 20000 });
    const ls = await page.evaluate(() => ({ npid: localStorage.getItem('npid'), nsrc: localStorage.getItem('nsrc') }));
    test.info().annotations.push({ type: 'observed', description: `localStorage after picking the date: ${JSON.stringify(ls)}` });
    expect(ls.npid, 'client kept for the new booking').toBe(String(appt.client.id));
    expect(ls.nsrc, 'source appointment id kept for the new booking').toBe(String(appt.id));
    // Empty-slot click on the Schedule page pushes exactly this URL (aesthetic-schedule/page.js:869)
    await page.goto(`/admin/aesthetic-schedule/appointments/new?doctorId=${ctx.doctorId}&start=2028-01-07T11:00`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(appt.client.name).first(), 'client prefilled').toBeVisible({ timeout: 20000 });
    await expect(statusCombo(), 'status taken from the confirmed source').toHaveText(/Confirmed/, { timeout: 15000 });
    expect(await page.evaluate(() => localStorage.getItem('nsrc')), 'nsrc consumed').toBeNull();
  });

  // TC-033 (BP-12, follow-up status race) lives in its own file: tests/emr-237-tc033.spec.js
  // – one test in one browser tab, with on-screen captions, step screenshots, video and a timeline.
});
