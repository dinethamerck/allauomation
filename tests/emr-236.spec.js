// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');

/**
 * EMR-236: "Consultation" quick select button for appointments of ANY doctor.
 * See EMR_236_TEST_CASES.md for the code review, break points (BP-x) and the full test case list.
 *
 * Fix under test (emr-frontend 7bff0b8, merged into qa_release/1.1.11.1):
 *   canConsultAppointment(profile) = profile.doctor && "Aesthetic Consultations" permission
 *   – used for the Appointment Details button, the appointment page's Consultation tab (and default tab)
 *     and the consultation form gate. The appointment's doctor no longer matters.
 *
 * Logged-in QA user (QA_USERNAME) must be a DOCTOR with "Aesthetic Consultations" ("Dr P").
 * "Dr K" = another doctor taken from /aesthetic/doctors.
 *
 * Optional role accounts (tests skip when not set) – add to .env:
 *   EMR236_DRK_USERNAME / EMR236_DRK_PASSWORD             another doctor (sees consultations done by Dr P)
 *   EMR236_NOPERM_USERNAME / EMR236_NOPERM_PASSWORD       doctor WITHOUT "Aesthetic Consultations"
 *   EMR236_FRONTDESK_USERNAME / EMR236_FRONTDESK_PASSWORD front desk (no doctor profile) WITH the permission
 *   EMR236_CASHIER_USERNAME / EMR236_CASHIER_PASSWORD     user without clinical permissions
 *
 * Test data: fictional clients (example.com), appointments on 2028-02 / 2028-03 (off the working calendar).
 * NOTE: there is no API to delete consultations, and opening a Consultation tab creates one (BP-1). Appointments
 * that end up with a consultation are soft-deleted (status "deleted") in afterAll; their consultations remain.
 * Skip everything that creates data with EMR236_READONLY=1.
 */

const READONLY = process.env.EMR236_READONLY === '1';

/** @type {{ name: string, email: string, mobile: string, gender: 'Female'|'Male', dob: [number, number, number], id?: number }[]} */
const CLIENTS = [
  { name: 'Nimali Perera', email: 'nimali.perera@example.com', mobile: '0771234501', gender: 'Female', dob: [1992, 3, 14] },
  { name: 'Tharushi Fernando', email: 'tharushi.fernando@example.com', mobile: '0712345602', gender: 'Female', dob: [1996, 7, 22] },
  { name: 'Kasun Herath', email: 'kasun.herath@example.com', mobile: '0763456703', gender: 'Male', dob: [1988, 11, 5] },
  { name: 'Dilani Rathnayake', email: 'dilani.rathnayake@example.com', mobile: '0754567804', gender: 'Female', dob: [1985, 1, 30] },
  { name: 'Sachini Liyanage', email: 'sachini.liyanage@example.com', mobile: '0725678905', gender: 'Female', dob: [1999, 9, 18] },
  { name: 'Chamath Ekanayake', email: 'chamath.ekanayake@example.com', mobile: '0786789006', gender: 'Male', dob: [1983, 12, 11] },
];
const clientFor = (label) => CLIENTS[(Number((/TC-(\d+)/.exec(label) || [])[1] || 1) - 1) % CLIENTS.length];

const NOTES = {
  'TC-001': 'Own patient – review after first peel.',
  'TC-002': 'Booked for Dr Kavini – laser consultation.',
  'TC-003': 'Consultation started by the booked doctor.',
  'TC-004': 'Consultation already completed.',
  'TC-005': 'Walk-in, doctor to be assigned.',
  'TC-006': 'Laser room maintenance – no client.',
  'TC-007': 'Client cancelled by phone.',
  'TC-008': 'Shared patient – covering colleague.',
  'TC-010': 'Covering for Dr Kavini today.',
  'TC-011': 'Covering colleague – continue the consultation.',
  'TC-012': 'Covering colleague – finish the consultation.',
  'TC-021': 'Own appointment opened from a link.',
  'TC-027': 'Only checking the notes, not consulting.',
  'TC-028': 'Opened from the Appointment Log.',
  'TC-030': 'Started by the booked doctor, finished by a colleague.',
  'TC-031': 'Two doctors in the same consultation.',
  'TC-032': 'Completed consultation – must stay locked.',
  'TC-034': 'Treatment plan completed twice.',
  'TC-042': 'Doctor on the record must not be editable.',
};

const pad = (n) => String(n).padStart(2, '0');
const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
/** A 30-minute slot at 10:00 local on y-m-d, plus helper strings for finding it on screen. */
const day = (y, m, d, h = 10) => ({
  start_time: at(y, m, d, h), end_time: at(y, m, d, h, 30), date: `${y}-${pad(m)}-${pad(d)}`,
  long: new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), // "February 3, 2028"
});
const ACTION_BUTTONS = ['Consultation', 'History', 'Scheduling', 'Treatments', 'Invoices', 'Confirmation', 'Reschedule'];
const BLOCK_MESSAGE = 'You will be able to view this consultation once it has been completed.';
/**
 * Role accounts. `must` is checked after login (doctor = in the aesthetic doctor list, consult = has
 * "Aesthetic Consultations"); a test whose account doesn't fit its role is skipped with the reason,
 * so it never passes for the wrong reason.
 */
const ROLE = {
  drk: { user: process.env.EMR236_DRK_USERNAME, pass: process.env.EMR236_DRK_PASSWORD, env: 'EMR236_DRK',
    must: { doctor: true, consult: true }, what: 'another doctor WITH "Aesthetic Consultations"' },
  noperm: { user: process.env.EMR236_NOPERM_USERNAME, pass: process.env.EMR236_NOPERM_PASSWORD, env: 'EMR236_NOPERM',
    must: { doctor: true, consult: false }, what: 'a doctor WITHOUT "Aesthetic Consultations"' },
  frontdesk: { user: process.env.EMR236_FRONTDESK_USERNAME, pass: process.env.EMR236_FRONTDESK_PASSWORD, env: 'EMR236_FRONTDESK',
    must: { doctor: false, consult: true }, what: 'a non-doctor user WITH "Aesthetic Consultations"' },
  cashier: { user: process.env.EMR236_CASHIER_USERNAME, pass: process.env.EMR236_CASHIER_PASSWORD, env: 'EMR236_CASHIER',
    must: { consult: false }, what: 'a user WITHOUT "Aesthetic Consultations"' },
};

test.describe('EMR-236: Consultation button for any doctor\'s appointment', () => {
  test.describe.configure({ mode: 'default' });

  /** @type {import('@playwright/test').BrowserContext} */ let context;
  /** @type {import('@playwright/test').Page} */ let page;
  /** @type {Record<string,string>} */ let headers = {};
  let apiBase = '';
  const ctx = { me: null, other: null, typeId: null, doctors: [] };
  const created = { appointments: [] };
  /** POST /aesthetic/consultations requests seen on the main page (url + body). */
  const consultationPosts = [];

  // ------------------------------------------------------------------ API helpers
  const mkCall = (p, h) => async (method, url, data) => {
    const r = await p.request.fetch(apiBase + url, { method, headers: h(), data });
    let body = null;
    try { body = await r.json(); } catch {}
    return { status: r.status(), body };
  };
  const call = (method, url, data) => mkCall(page, () => headers)(method, url, data);
  const consultationOf = async (apptId) => (await call('GET', `/aesthetic/appointments/${apptId}/consultations`)).body?.payload || null;
  const saveConsultation = (appt, extra = {}) =>
    call('POST', '/aesthetic/consultations', { patient_id: appt.patient_id, appointment_id: appt.id, consultation_data: [], ...extra });

  async function ensureClient(c) {
    if (c.id) return c;
    const found = (await call('GET', `/aesthetic/patients?page=1&limit=10&search=${encodeURIComponent(c.email)}`)).body?.payload;
    const list = Array.isArray(found) ? found : found?.patients || found?.rows || found?.data || [];
    let p = list.find((x) => String(x.email || '').toLowerCase() === c.email);
    if (!p) {
      const [y, m, d] = c.dob;
      const r = await call('POST', '/aesthetic/patients', { name: c.name, email: c.email, mobile: c.mobile, gender: c.gender, dob: new Date(y, m - 1, d).toISOString() });
      expect(r.status, `create client ${c.name}: ${JSON.stringify(r.body)}`).toBe(200);
      p = r.body?.payload;
    }
    c.id = p.id;
    return c;
  }

  /**
   * Book a test appointment.
   * @param {ReturnType<typeof day>} when
   * @param {{ label: string, doctor?: 'me'|'other'|'none'|number, patient?: boolean, status?: string }} o
   */
  async function createAppt(when, o) {
    const client = o.patient === false ? null : await ensureClient(clientFor(o.label));
    const doctorId = o.doctor === 'none' ? null : typeof o.doctor === 'number' ? o.doctor : (o.doctor === 'me' ? ctx.me : ctx.other).id;
    const r = await call('POST', '/aesthetic/appointments', {
      start_time: when.start_time, end_time: when.end_time, status: 'scheduled', notes: NOTES[o.label] || '',
      patient_id: client ? client.id : null, doctor_id: doctorId, appointment_type_id: ctx.typeId,
    });
    expect(r.status, JSON.stringify(r.body)).toBeLessThan(400);
    const appt = r.body?.payload?.appointment;
    created.appointments.push(appt.id);
    if (o.status && o.status !== 'scheduled') {
      const s = await call('PUT', `/aesthetic/appointments/${appt.id}`, { status: o.status });
      expect(s.status).toBe(200);
    }
    test.info().annotations.push({ type: 'data', description: `appointment #${appt.id} · ${when.date} 10:00 · doctor ${doctorId ?? 'none'} · ${client ? `${client.name} <${client.email}>` : 'no client'}${o.status ? ` · ${o.status}` : ''}` });
    return { ...appt, client, when };
  }

  // ------------------------------------------------------------------ UI helpers
  /** The Appointment Details dialog (same component on every entry point). */
  const detailsDialog = (p = page) => p.locator('[role="dialog"]').filter({ hasText: 'Quick Schedule Follow-up' });

  /** Labels of the action buttons in Appointment Details (waits for the consultation status lookup). */
  async function dialogButtons(dlg) {
    await expect(dlg.getByRole('button', { name: 'History' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500); // the "completed" check is an async lookup
    const labels = (await dlg.locator('button').allInnerTexts()).map((t) => t.trim());
    return ACTION_BUTTONS.filter((b) => labels.includes(b));
  }

  /** Schedule page for the appointment's date → click its card (by client name or note) → Appointment Details. */
  async function openFromSchedule(appt, p = page) {
    await p.goto(`/admin/aesthetic-schedule?date=${appt.when.date}`, { waitUntil: 'domcontentloaded' });
    const text = appt.client ? appt.client.name : appt.notes;
    const card = p.getByText(text).first();
    await expect(card, 'appointment card on the Schedule page').toBeVisible({ timeout: 30000 });
    await card.click();
    const dlg = detailsDialog(p);
    await expect(dlg).toBeVisible({ timeout: 15000 });
    return dlg;
  }

  /** Client profile → Appointments list (narrowed to the appointment's day) → click its live card → Appointment Details. */
  async function openFromClientProfile(appt, p = page) {
    await p.goto(`/admin/aesthetic-clients/${appt.client.id}`, { waitUntil: 'domcontentloaded' });
    // The list is paged; clients with many appointments push ours off page 1 – use the Start / End date filters
    const dates = p.getByRole('tabpanel').locator('input[type="date"]');
    await expect(dates.first(), 'date filters of the Appointments list').toBeVisible({ timeout: 30000 });
    await dates.nth(0).fill(appt.when.date);
    await dates.nth(1).fill(appt.when.date);
    const card = p.locator('div')
      .filter({ has: p.getByRole('heading', { level: 6 }) })
      .filter({ hasText: `${appt.when.long} 10:00 AM` })
      .filter({ hasNotText: 'Deleted' })
      .last();
    await expect(card, 'appointment in the client\'s list').toBeVisible({ timeout: 30000 });
    await card.click();
    const dlg = detailsDialog(p);
    await expect(dlg).toBeVisible({ timeout: 15000 });
    return dlg;
  }

  const consultationTab = (p = page) => p.getByRole('tab', { name: 'Consultation' });
  const notesBox = (p = page) => p.getByPlaceholder('Enter notes here');

  /** Open the appointment page on the Consultation tab and wait until the form is there. */
  async function openConsultation(apptId, p = page) {
    await p.goto(`/admin/aesthetic-schedule/appointments/${apptId}?tab=emr`, { waitUntil: 'domcontentloaded' });
    await expect(p.getByRole('heading', { name: 'Consultation Notes' }), 'consultation form').toBeVisible({ timeout: 30000 });
  }

  /** Wait for an autosave whose body contains `marker`. */
  const waitForSave = (marker, p = page) => p.waitForResponse(
    (r) => r.request().method() === 'POST' && /\/aesthetic\/consultations$/.test(r.url()) && (r.request().postData() || '').includes(marker),
    { timeout: 20000 },
  );

  /** End Consultation → confirm in the "End Appointment" modal. */
  async function endConsultation(p = page) {
    await p.getByRole('button', { name: 'End Consultation' }).first().click();
    const modal = p.getByRole('dialog').filter({ hasText: 'End Appointment' });
    await expect(modal).toBeVisible({ timeout: 10000 });
    const saved = p.waitForResponse((r) => r.request().method() === 'POST' && /\/aesthetic\/consultations$/.test(r.url()) && (r.request().postData() || '').includes('"completed"'), { timeout: 20000 });
    await modal.getByRole('button', { name: 'End Consultation' }).click();
    return saved;
  }
  const completedBanner = (p = page) => p.getByText(/This consultation has been\s*completed by/);

  /**
   * Log in as one of the optional role accounts in its own browser context, check the account fits the role,
   * then run `fn`. Skips (with the reason) when the account is missing, not onboarded, or the wrong kind of user.
   */
  async function asRole(roleKey, fn) {
    const role = ROLE[roleKey];
    test.skip(!role.user || !role.pass, `Set ${role.env}_USERNAME / ${role.env}_PASSWORD in .env to run this test`);
    const ctx2 = await context.browser().newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 900 } });
    const p2 = await ctx2.newPage();
    /** @type {Record<string,string>} */ let h2 = {};
    p2.on('request', (req) => { const h = req.headers(); if (!h2.authorization && h.authorization && req.url().includes('/aesthetic/')) h2 = { authorization: h.authorization }; });
    try {
      const lp = new LoginPage(p2);
      await lp.goto();
      await lp.login(role.user.trim(), role.pass.trim());
      await p2.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 40000 });
      const token = await p2.evaluate(() => JSON.parse(atob(String(localStorage.getItem('token')).split('.')[1])));
      await p2.goto('/admin/aesthetic-appointments', { waitUntil: 'domcontentloaded' });
      await expect.poll(async () => !!h2.authorization || (await p2.getByText("Let's get you onboarded").count()) > 0, { timeout: 20000 }).toBe(true).catch(() => {});
      const onboarding = (await p2.getByText("Let's get you onboarded").count()) > 0;
      test.skip(onboarding, `${role.env} account (user ${token.id}) hasn't finished onboarding – it sees the welcome wizard instead of the app`);
      test.skip(!h2.authorization, `${role.env} account (user ${token.id}) can't open the Aesthetic module`);
      // Does the account fit the role?
      const isDoctor = (ctx.doctors || []).some((d) => d.id === token.id);
      const canConsult = String(token?.permissions?.['Aesthetic Consultations'] || '').replace(/-/g, '').length > 0;
      const reasons = [];
      if (role.must.doctor !== undefined && role.must.doctor !== isDoctor) reasons.push(isDoctor ? 'is a doctor' : 'is not a doctor');
      if (role.must.consult !== undefined && role.must.consult !== canConsult) reasons.push(canConsult ? 'has "Aesthetic Consultations"' : 'has no "Aesthetic Consultations"');
      test.info().annotations.push({ type: 'account', description: `${role.env}: user ${token.id} · doctor: ${isDoctor} · "Aesthetic Consultations": ${canConsult}` });
      test.skip(reasons.length > 0, `${role.env} account (user ${token.id}) ${reasons.join(' and ')} – this test needs ${role.what}`);
      return await fn({ page: p2, call: mkCall(p2, () => h2), token });
    } finally {
      await ctx2.close();
    }
  }

  // ------------------------------------------------------------------ lifecycle
  test.beforeAll(async ({ browser, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'EMR-236 runs on desktop Chromium only (creates QA data + desktop Schedule UI)');
    test.setTimeout(150000);
    context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1366, height: 900 } });
    page = await context.newPage();
    page.on('request', (req) => {
      const h = req.headers();
      if (!headers.authorization && h.authorization && req.url().includes('/aesthetic/')) {
        headers = { authorization: h.authorization };
        apiBase = new URL(req.url()).origin;
      }
      if (req.method() === 'POST' && /\/aesthetic\/consultations$/.test(req.url())) consultationPosts.push({ url: req.url(), body: req.postData() || '', at: Date.now() });
    });
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(process.env.QA_USERNAME || 'parami', process.env.QA_PASSWORD || 'parami');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 40000 });
    await page.goto('/admin/aesthetic-appointments', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => !!headers.authorization, { timeout: 20000 }).toBe(true);

    const token = await page.evaluate(() => JSON.parse(atob(String(localStorage.getItem('token')).split('.')[1])));
    const perm = String(token?.permissions?.['Aesthetic Consultations'] || '');
    const doctors = (await call('GET', '/aesthetic/doctors')).body?.payload || [];
    ctx.doctors = doctors;
    ctx.me = doctors.find((d) => d.id === token.id) || null;
    ctx.other = doctors.find((d) => d.id !== token.id) || null;
    test.skip(!ctx.me || perm.replace(/-/g, '').length === 0,
      `QA_USERNAME must be a doctor with "Aesthetic Consultations" (in doctor list: ${!!ctx.me}, permission: "${perm}")`);
    test.skip(!ctx.other, 'needs a second aesthetic doctor on QA');
    const types = (await call('GET', '/aesthetic/appointment-types')).body?.payload || [];
    ctx.typeId = (types.find((t) => t.active !== false) || types[0])?.id;
  });

  test.afterAll(async () => {
    for (const id of created.appointments) {
      const rows = (await call('GET', `/aesthetic/appointments/${id}/scheduling`).catch(() => null))?.body?.payload || [];
      for (const t of Array.isArray(rows) ? rows : []) await call('DELETE', `/aesthetic/appointments/${id}/treatments/${t.id}`).catch(() => null);
      const r = await call('DELETE', `/aesthetic/appointments/${id}`).catch(() => null);
      // an appointment with a consultation can't be deleted – soft-delete it instead (consultations can't be deleted at all)
      if (!r || r.status >= 400) await call('PUT', `/aesthetic/appointments/${id}`, { status: 'deleted' }).catch(() => null);
    }
    await context?.close();
  });

  test.beforeEach(() => {
    test.skip(READONLY, 'EMR236_READONLY=1 – data-creating tests skipped');
  });

  // ======================================================== A. Button visibility (AC 1, AC 4)
  test('TC-001: own appointment → Consultation button shown, other buttons unchanged (AC 4, TC-039)', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(day(2028, 2, 2), { label: 'TC-001', doctor: 'me' });
    const buttons = await dialogButtons(await openFromSchedule(appt));
    test.info().annotations.push({ type: 'observed', description: `buttons: ${buttons.join(', ')}` });
    expect(buttons).toEqual(ACTION_BUTTONS);
  });

  test('TC-002: another doctor\'s appointment → Consultation button shown (AC 1)', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(day(2028, 2, 3), { label: 'TC-002', doctor: 'other' });
    const buttons = await dialogButtons(await openFromSchedule(appt));
    test.info().annotations.push({ type: 'observed', description: `buttons: ${buttons.join(', ')}` });
    expect(buttons, 'same buttons as on own appointments').toEqual(ACTION_BUTTONS);
  });

  test('TC-003: another doctor\'s appointment with a DRAFT → button shown, draft content visible', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(day(2028, 2, 4), { label: 'TC-003', doctor: 'other' });
    const note = 'Continue SPF 50 daily; review pigmentation in 2 weeks.';
    expect((await saveConsultation(appt, { followup: { notes: note } })).status).toBe(200);
    const buttons = await dialogButtons(await openFromSchedule(appt));
    expect(buttons).toContain('Consultation');
    await detailsDialog().getByRole('button', { name: 'Consultation' }).click();
    await expect(page.getByRole('heading', { name: 'Consultation Notes' })).toBeVisible({ timeout: 30000 });
    await expect(notesBox(), 'the draft is opened, not a new blank consultation').toHaveValue(note);
  });

  test('TC-004: another doctor\'s appointment, COMPLETED → button shown, opens read-only', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(day(2028, 2, 7), { label: 'TC-004', doctor: 'other' });
    expect((await saveConsultation(appt, { status: 'completed', followup: { notes: 'Completed – follow up in 1 month.' } })).status).toBe(200);
    const buttons = await dialogButtons(await openFromSchedule(appt));
    expect(buttons).toContain('Consultation');
    await detailsDialog().getByRole('button', { name: 'Consultation' }).click();
    await expect(completedBanner(), 'completed banner').toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'End Consultation' }), 'read-only: no End Consultation').toHaveCount(0);
    await expect(notesBox(), 'read-only: notes not editable').toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
  });

  test('TC-005: appointment with NO doctor – Appointment Details still works (records the button state)', async () => {
    test.setTimeout(90000);
    test.info().annotations.push({ type: 'question', description: 'PO: should the Consultation button show when no doctor is booked?' });
    const appt = await createAppt(day(2028, 2, 8), { label: 'TC-005', doctor: 'none' });
    const buttons = await dialogButtons(await openFromClientProfile(appt));
    test.info().annotations.push({ type: 'observed', description: `buttons: ${buttons.join(', ')}` });
    expect(buttons, 'dialog works').toContain('History');
  });

  test('TC-006: "No Patient Needed" appointment – opening the consultation must not save anything or crash', async () => {
    test.setTimeout(90000);
    test.info().annotations.push({ type: 'question', description: 'PO (BP-11): hide the Consultation button for appointments without a client, or show a clear message?' });
    const appt = await createAppt(day(2028, 2, 9), { label: 'TC-006', doctor: 'other', patient: false });
    const errors = [];
    const onErr = (e) => errors.push(e.message);
    page.on('pageerror', onErr);
    try {
      const buttons = await dialogButtons(await openFromSchedule(appt));
      test.info().annotations.push({ type: 'observed', description: `buttons: ${buttons.join(', ')}` });
      if (buttons.includes('Consultation')) {
        const before = consultationPosts.length;
        await detailsDialog().getByRole('button', { name: 'Consultation' }).click();
        await page.waitForURL(new RegExp(`/appointments/${appt.id}\\?tab=emr`), { timeout: 20000 });
        await page.waitForTimeout(5000);
        test.info().annotations.push({ type: 'observed', description: `consultation form opened for an appointment without a client; saves sent: ${consultationPosts.length - before}` });
        expect(consultationPosts.length - before, 'nothing saved').toBe(0);
        expect(await consultationOf(appt.id), 'no consultation record').toBeNull();
      }
      expect(errors, 'no JavaScript errors').toEqual([]);
    } finally {
      page.off('pageerror', onErr);
    }
  });

  test('TC-007: CANCELLED appointment – records the button state', async () => {
    test.setTimeout(90000);
    test.info().annotations.push({ type: 'question', description: 'PO (BP-11): should consultations open on cancelled / no-show appointments?' });
    const appt = await createAppt(day(2028, 2, 10), { label: 'TC-007', doctor: 'other', status: 'cancelled' });
    const buttons = await dialogButtons(await openFromClientProfile(appt));
    test.info().annotations.push({ type: 'observed', description: `buttons on a cancelled appointment: ${buttons.join(', ')}` });
    expect(buttons, 'dialog works').toContain('History');
  });

  test('TC-008: same rule from other entry points – client profile and History tab', async () => {
    test.setTimeout(120000);
    const appt = await createAppt(day(2028, 2, 11), { label: 'TC-008', doctor: 'other' });
    // a) Client profile → Appointments
    const fromClient = await dialogButtons(await openFromClientProfile(appt));
    await page.keyboard.press('Escape');
    // b) History tab of the same appointment (lists the client's appointments)
    await page.goto(`/admin/aesthetic-schedule/appointments/${appt.id}?tab=past-history`, { waitUntil: 'domcontentloaded' });
    const item = page.locator('div')
      .filter({ has: page.getByRole('heading', { level: 6 }) })
      .filter({ hasText: new RegExp(`${appt.when.long}\\s*Scheduled`) })
      .last();
    await expect(item, 'appointment in the History list').toBeVisible({ timeout: 30000 });
    await item.click();
    const fromHistory = await dialogButtons(detailsDialog());
    test.info().annotations.push({ type: 'observed', description: `client profile: ${fromClient.join(', ')} | History tab: ${fromHistory.join(', ')}` });
    expect.soft(fromClient, 'client profile → Appointment Details').toContain('Consultation');
    expect.soft(fromHistory, 'History tab → Appointment Details').toContain('Consultation');
  });

  // ======================================================== B. Opening and working on a colleague's consultation (AC 2)
  test('TC-010: Consultation button opens that appointment\'s consultation (tab shown, no block message) – TC-013/014', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(day(2028, 2, 14), { label: 'TC-010', doctor: 'other' });
    await openFromSchedule(appt);
    await detailsDialog().getByRole('button', { name: 'Consultation' }).click();
    await page.waitForURL(new RegExp(`/appointments/${appt.id}\\?tab=emr`), { timeout: 20000 });
    await expect(consultationTab(), 'Consultation tab is shown and active').toHaveAttribute('aria-selected', 'true', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Consultation Notes' })).toBeVisible();
    await expect(page.getByText(BLOCK_MESSAGE)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: appt.client.name }), 'right client loaded').toBeVisible();
  });

  test('TC-011: a colleague can work on the consultation – change is saved and comes back after reload', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(day(2028, 2, 15), { label: 'TC-011', doctor: 'other' });
    await openConsultation(appt.id);
    const note = 'Covering Dr Kavini: review in 2 weeks, continue SPF 50.';
    const saved = waitForSave(note);
    await notesBox().fill(note);
    expect((await saved).status(), 'autosave accepted').toBe(200);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(notesBox(), 'value back after reload').toHaveValue(note, { timeout: 30000 });
    expect((await consultationOf(appt.id))?.followup?.notes).toBe(note);
  });

  test('TC-012: a colleague can complete the consultation – read-only afterwards, "completed by" the colleague', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(day(2028, 2, 16), { label: 'TC-012', doctor: 'other' });
    await openConsultation(appt.id);
    expect((await endConsultation()).status()).toBe(200);
    await expect(completedBanner()).toBeVisible({ timeout: 15000 });
    await expect(completedBanner()).toContainText(ctx.me.first_name);
    await expect(page.getByRole('button', { name: 'End Consultation' })).toHaveCount(0);
    const c = await consultationOf(appt.id);
    test.info().annotations.push({ type: 'observed', description: `consultation #${c?.id} status=${c?.status} doctor_id=${c?.doctor_id} (appointment doctor ${ctx.other.id})` });
    expect(c?.status).toBe('completed');
  });

  test('TC-021: own appointment opened without ?tab → lands on Consultation, as before (AC 4)', async () => {
    test.setTimeout(90000);
    const appt = await createAppt(day(2028, 2, 17), { label: 'TC-021', doctor: 'me' });
    await page.goto(`/admin/aesthetic-schedule/appointments/${appt.id}`, { waitUntil: 'domcontentloaded' });
    await expect(consultationTab()).toHaveAttribute('aria-selected', 'true', { timeout: 30000 });
  });

  // ======================================================== C. Break points that EMR-236 makes worse
  test('TC-027: just VIEWING a colleague\'s Consultation tab must not create a consultation (BP-1)', async () => {
    test.setTimeout(90000);
    test.info().annotations.push({ type: 'breakpoint', description: 'BP-1: opening the tab sends POST /aesthetic/consultations without any input; the backend sets doctor_id = the viewer' });
    test.fail(true, 'Known defect BP-1 (QA 2026-11-12): viewing a colleague\'s Consultation tab creates a draft under the viewer and the appointment can no longer be deleted. This test turns red once it is fixed – then remove this line.');
    const appt = await createAppt(day(2028, 2, 18), { label: 'TC-027', doctor: 'other' });
    const before = consultationPosts.length;
    await openConsultation(appt.id);
    await page.waitForTimeout(5000); // longer than the 800 ms autosave debounce
    const sent = consultationPosts.slice(before);
    const c = await consultationOf(appt.id);
    test.info().annotations.push({ type: 'observed', description: `saves sent without typing: ${sent.length}${sent[0] ? ` (body keys: ${Object.keys(JSON.parse(sent[0].body || '{}')).join(',')})` : ''}; consultation: ${c ? `#${c.id} ${c.status} doctor_id=${c.doctor_id}` : 'none'}` });
    expect.soft(sent.length, 'no save without user input').toBe(0);
    expect.soft(c, 'no consultation record after only viewing').toBeNull();
    if (c) expect.soft(c.doctor_id, 'the viewer must not become the consultation doctor').not.toBe(ctx.me.id);
    const del = await call('DELETE', `/aesthetic/appointments/${appt.id}`);
    test.info().annotations.push({ type: 'observed', description: `DELETE after viewing → ${del.status} ${JSON.stringify(del.body)}` });
    expect.soft(del.status, 'viewing must not make the appointment undeletable (TC-033)').toBe(200);
  });

  test('TC-028: opening a colleague\'s appointment from a tab-less link must not create a consultation (BP-2)', async () => {
    test.setTimeout(90000);
    test.info().annotations.push({ type: 'breakpoint', description: 'BP-2: page.js defaults to the Consultation tab for every appointment when the user can consult; links from Appointment Log, invoices and Treatment Room carry no ?tab' });
    test.fail(true, 'Known defect BP-2 (QA 2026-11-12): a tab-less appointment link opens the Consultation tab and creates a consultation. This test turns red once it is fixed – then remove this line.');
    const appt = await createAppt(day(2028, 2, 21), { label: 'TC-028', doctor: 'other' });
    const before = consultationPosts.length;
    // Same URL the Appointment Log / invoice / Treatment Room links open
    await page.goto(`/admin/aesthetic-schedule/appointments/${appt.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tablist')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(6000);
    const active = (await page.getByRole('tab', { selected: true }).allInnerTexts()).map((t) => t.trim()).join(', ');
    const c = await consultationOf(appt.id);
    test.info().annotations.push({ type: 'observed', description: `active tab: ${active}; saves sent: ${consultationPosts.length - before}; consultation: ${c ? `#${c.id} ${c.status} doctor_id=${c.doctor_id}` : 'none'}` });
    expect.soft(consultationPosts.length - before, 'no save from just opening the page').toBe(0);
    expect.soft(c, 'no consultation record').toBeNull();
  });

  test('TC-030: booked doctor only opened it, colleague completed – "completed by" must stay the same after reload (BP-3/BP-4) [EMR236_DRK]', async () => {
    test.setTimeout(150000);
    test.info().annotations.push({ type: 'breakpoint', description: 'BP-3/BP-4: the record keeps the first saver as doctor; End Consultation sends doctor = current user, which the backend ignores' });
    await asRole('drk', async ({ page: p2, token }) => {
      const appt = await createAppt(day(2028, 2, 22), { label: 'TC-030', doctor: token.id });
      // Dr K (the booked doctor) only opens the consultation – BP-1 saves the draft under Dr K
      await openConsultation(appt.id, p2);
      await p2.waitForTimeout(3000);
      const draft = await consultationOf(appt.id);
      // Dr P (colleague) does and completes the consultation
      await openConsultation(appt.id);
      await endConsultation();
      await expect(completedBanner()).toBeVisible({ timeout: 15000 });
      const beforeReload = (await completedBanner().innerText()).replace(/\s+/g, ' ');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(completedBanner()).toBeVisible({ timeout: 30000 });
      const afterReload = (await completedBanner().innerText()).replace(/\s+/g, ' ');
      const who = (s) => (/completed by (.+?) on /.exec(s) || [])[1] || s;
      test.info().annotations.push({ type: 'observed', description: `draft doctor after Dr K only opened it: ${draft?.doctor_id} (Dr K = ${token.id}); completed by (just after) "${who(beforeReload)}" → (after reload) "${who(afterReload)}"` });
      expect.soft(who(afterReload), 'record names the doctor who completed it').toBe(who(beforeReload));
      expect.soft(who(afterReload), 'colleague who completed it').toContain(ctx.me.first_name);
    });
  });

  test('TC-031: two people in the same consultation must not silently overwrite each other (BP-5)', async () => {
    test.setTimeout(120000);
    test.info().annotations.push({ type: 'breakpoint', description: 'BP-5: every autosave sends the whole consultation; no version check → last write wins' });
    test.fail(true, 'Known defect BP-5 (QA 2026-11-12): two people in one draft – the later save silently drops the other person\'s change. This test turns red once it is fixed – then remove this line.');
    const appt = await createAppt(day(2028, 2, 23), { label: 'TC-031', doctor: 'other' });
    const anySave = (p) => p.waitForResponse((r) => r.request().method() === 'POST' && /\/aesthetic\/consultations$/.test(r.url()), { timeout: 10000 }).catch(() => null);
    // Tab A opens; let its opening save (BP-1) finish so it can't interfere below
    const openedA = anySave(page);
    await openConsultation(appt.id);
    await openedA;
    const pageB = await context.newPage(); // tab B – same consultation
    try {
      const openedB = anySave(pageB);
      await openConsultation(appt.id, pageB);
      await openedB; // tab B's opening save, before anyone types
      // Tab A writes a note …
      const note = 'Dr P: patch test done, no reaction.';
      const savedA = waitForSave(note);
      await notesBox().fill(note);
      expect((await savedA).status()).toBe(200);
      // … then tab B (still holding the older copy) records a weight
      const weight = '68';
      const savedB = waitForSave(weight, pageB);
      await pageB.getByPlaceholder('kg', { exact: true }).fill(weight); // "(kg)" is Ideal Body Weight
      expect((await savedB).status()).toBe(200);
      const c = await consultationOf(appt.id);
      const weightKept = new RegExp(`"?${weight}"?`).test(JSON.stringify(c?.consultation_data || []));
      test.info().annotations.push({ type: 'observed', description: `after both saves: follow-up note = ${JSON.stringify(c?.followup?.notes ?? null)}; weight saved: ${weightKept}` });
      expect.soft(weightKept, 'tab B\'s change saved').toBe(true);
      expect.soft(c?.followup?.notes, 'tab A\'s note must survive tab B\'s save').toBe(note);
    } finally {
      await pageB.close();
    }
  });

  // ======================================================== D. Known backend gaps (not part of EMR-236 – marked as expected failures)
  test('TC-032: a COMPLETED consultation cannot be changed through the API (BP-7)', async () => {
    test.fail(true, 'Known gap BP-7: POST /aesthetic/consultations updates a completed consultation (UI is read-only only)');
    const appt = await createAppt(day(2028, 2, 24), { label: 'TC-032', doctor: 'other' });
    await saveConsultation(appt, { status: 'completed', followup: { notes: 'Signed off.' } });
    const r = await saveConsultation(appt, { status: 'completed', followup: { notes: 'Changed after sign-off.' } });
    const c = await consultationOf(appt.id);
    test.info().annotations.push({ type: 'observed', description: `update after completion → HTTP ${r.status}; note now "${c?.followup?.notes}"` });
    expect(r.status, 'completed consultation is locked').toBeGreaterThanOrEqual(400);
  });

  test('TC-034: completing twice does not duplicate planned sessions (BP-13)', async () => {
    test.fail(true, 'Known gap BP-13: every save with status "completed" adds the treatments for scheduling again');
    const appt = await createAppt(day(2028, 2, 25), { label: 'TC-034', doctor: 'other' });
    const list = (await call('GET', '/aesthetic/treatments')).body?.payload || [];
    test.skip(!list.length, 'no treatments configured');
    const treatments = [{ originalId: list[0].id, name: list[0].name, sessions: 1 }];
    await saveConsultation(appt, { status: 'completed', treatments });
    await saveConsultation(appt, { status: 'completed', treatments });
    const rows = (await call('GET', `/aesthetic/appointments/${appt.id}/scheduling`)).body?.payload || [];
    test.info().annotations.push({ type: 'observed', description: `planned sessions after two completions: ${rows.length} (expected 1)` });
    expect(rows.length).toBe(1);
  });

  test('TC-042: the consultation\'s doctor cannot be rewritten through the API', async () => {
    // The local emr-backend copy would copy doctor_id onto the record (update(data)); the QA backend ignores it.
    // Kept as a regression check.
    const appt = await createAppt(day(2028, 2, 28), { label: 'TC-042', doctor: 'other' });
    await saveConsultation(appt);
    const before = (await consultationOf(appt.id))?.doctor_id;
    await saveConsultation(appt, { doctor_id: ctx.other.id });
    const after = (await consultationOf(appt.id))?.doctor_id;
    test.info().annotations.push({ type: 'observed', description: `doctor_id ${before} → ${after} after a plain save request` });
    expect(after, 'doctor on the record unchanged').toBe(before);
  });

  // ======================================================== E. Roles (need extra QA accounts – skipped until set in .env)
  test('TC-016: the booked doctor sees a consultation a colleague completed (AC 3) [EMR236_DRK]', async () => {
    test.setTimeout(120000);
    await asRole('drk', async ({ page: p2, token }) => {
      const appt = await createAppt(day(2028, 3, 1), { label: 'TC-016', doctor: token.id });
      await openConsultation(appt.id);
      await endConsultation(); // completed by Dr P
      await openFromSchedule(appt, p2);
      await detailsDialog(p2).getByRole('button', { name: 'Consultation' }).click();
      await expect(completedBanner(p2)).toBeVisible({ timeout: 30000 });
      await expect(completedBanner(p2), 'names the colleague who did it').toContainText(ctx.me.first_name);
    });
  });

  test('TC-022: doctor WITHOUT "Aesthetic Consultations" – own appointment (AC 4 question) [EMR236_NOPERM]', async () => {
    test.setTimeout(120000);
    test.info().annotations.push({ type: 'question', description: 'BP-10: before EMR-236 the button showed for them (only "Aesthetic Module" was checked); now hidden – confirm with PO' });
    await asRole('noperm', async ({ page: p2, token }) => {
      const appt = await createAppt(day(2028, 3, 2), { label: 'TC-022', doctor: token.id });
      const buttons = await dialogButtons(await openFromSchedule(appt, p2));
      test.info().annotations.push({ type: 'observed', description: `buttons: ${buttons.join(', ')}` });
      expect(buttons, 'current rule: hidden without the permission').not.toContain('Consultation');
      // TC-015: direct link must not open the form or create a record
      await p2.goto(`/admin/aesthetic-schedule/appointments/${appt.id}?tab=emr`, { waitUntil: 'domcontentloaded' });
      await p2.waitForTimeout(5000);
      expect(await consultationOf(appt.id), 'no record created by a user without access').toBeNull();
    });
  });

  test('TC-023 / TC-017: front desk – hidden for a draft, read-only view once completed [EMR236_FRONTDESK]', async () => {
    test.setTimeout(150000);
    test.info().annotations.push({ type: 'question', description: 'PO: the business value mentions front-desk workflows – should front desk see the button for drafts?' });
    await asRole('frontdesk', async ({ page: p2 }) => {
      const appt = await createAppt(day(2028, 3, 3), { label: 'TC-023', doctor: 'other' });
      await saveConsultation(appt, { followup: { notes: 'Draft in progress.' } });
      expect(await dialogButtons(await openFromSchedule(appt, p2)), 'draft: hidden (needs a doctor profile)').not.toContain('Consultation');
      await saveConsultation(appt, { status: 'completed' });
      const buttons = await dialogButtons(await openFromSchedule(appt, p2));
      expect(buttons, 'completed: shown').toContain('Consultation');
      await detailsDialog(p2).getByRole('button', { name: 'Consultation' }).click();
      await expect(completedBanner(p2)).toBeVisible({ timeout: 30000 });
      await expect(p2.getByRole('button', { name: 'End Consultation' }), 'read-only').toHaveCount(0);
    });
  });

  test('TC-026: cashier – completed consultations (privacy question) [EMR236_CASHIER]', async () => {
    test.setTimeout(120000);
    test.info().annotations.push({ type: 'question', description: 'BP-9: the "completed" path has no permission check – confirm cashiers may read consultations' });
    await asRole('cashier', async ({ page: p2 }) => {
      const appt = await createAppt(day(2028, 3, 6), { label: 'TC-026', doctor: 'other' });
      await saveConsultation(appt, { status: 'completed', followup: { notes: 'Clinic note for the record.' } });
      const buttons = await dialogButtons(await openFromSchedule(appt, p2));
      test.info().annotations.push({ type: 'observed', description: `cashier sees: ${buttons.join(', ')}` });
      expect(buttons, 'current rule: completed consultations are visible to every user').toContain('Consultation');
      // What the cashier can then read
      await detailsDialog(p2).getByRole('button', { name: 'Consultation' }).click();
      await expect(completedBanner(p2), 'cashier opens the completed consultation').toBeVisible({ timeout: 30000 });
      await expect(p2.getByText('Clinic note for the record.'), 'clinical note readable').toBeVisible();
      await expect(p2.getByRole('button', { name: 'End Consultation' }), 'read-only').toHaveCount(0);
      test.info().annotations.push({ type: 'observed', description: 'a user without "Aesthetic Consultations" can open and read a completed consultation (BP-9)' });
    });
  });

  test('TC-036: API refuses to READ a consultation for a user without the permission (BP-6) [EMR236_CASHIER]', async () => {
    test.setTimeout(120000);
    test.fail(true, 'Known gap BP-6: GET /aesthetic/appointments/:id/consultations has no access check');
    await asRole('cashier', async ({ call: call2 }) => {
      const appt = await createAppt(day(2028, 3, 7), { label: 'TC-036', doctor: 'other' });
      await saveConsultation(appt, { followup: { notes: 'Clinical note.' } });
      const read = await call2('GET', `/aesthetic/appointments/${appt.id}/consultations`);
      test.info().annotations.push({ type: 'observed', description: `cashier GET → ${read.status}; clinical note returned: ${read.body?.payload?.followup?.notes === 'Clinical note.'}` });
      expect(read.status, 'read refused').toBe(403);
    });
  });

  test('TC-037: API refuses to SAVE a consultation for a user without the permission [EMR236_CASHIER]', async () => {
    test.setTimeout(120000);
    await asRole('cashier', async ({ call: call2 }) => {
      const appt = await createAppt(day(2028, 3, 8), { label: 'TC-037', doctor: 'other' });
      await saveConsultation(appt, { followup: { notes: 'Clinical note.' } });
      const write = await call2('POST', '/aesthetic/consultations', { patient_id: appt.patient_id, appointment_id: appt.id, followup: { notes: 'Changed by cashier.' } });
      test.info().annotations.push({ type: 'observed', description: `cashier POST → ${write.status} ${JSON.stringify(write.body).slice(0, 120)}` });
      expect(write.status, 'save refused').toBe(403);
      expect((await consultationOf(appt.id))?.followup?.notes, 'note unchanged').toBe('Clinical note.');
    });
  });
});
