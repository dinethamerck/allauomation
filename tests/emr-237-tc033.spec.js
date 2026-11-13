// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');

/**
 * EMR-237 · TC-033 / TC-033b (break point BP-12) – the follow-up status race, one browser tab per test,
 * with on-screen captions, step screenshots, video and a measured timeline.
 *
 * WHAT THE USER DOES (Quick Schedule follow-up, added by commit 8a0c677)
 *   Appointment Details of a CONFIRMED appointment → Quick Schedule Follow-up "2 Weeks" → pick a date
 *   → Schedule page → empty slot → New Appointment form.
 *   While the form opens, it looks up the SOURCE appointment in the background and, when that one is
 *   Confirmed, sets the new appointment's status to Confirmed (create-form.jsx:345-361 on qa_release/1.1.11.1).
 *
 * THE PROBLEM
 *   The lookup is asynchronous and nothing checks whether the user already chose a status. If the user picks a
 *   status before the lookup returns, the lookup overwrites the choice with "Confirmed"
 *   (formik.setFieldValue("status", "confirmed") at create-form.jsx:355).
 *   → Breaks acceptance criterion 2: "The status changes only when the user updates it directly."
 *
 * WHY YOU DON'T SEE IT BY HAND ON A NORMAL CONNECTION
 *   The lookup answers in a fraction of a second – before anyone can open the Status dropdown. The status
 *   simply turns Confirmed as the form opens, and whatever the user picks afterwards stays.
 *
 * TWO WAYS THE TESTS MAKE THE LOOKUP SLOW
 *   TC-033  holds back ONLY the lookup's answer for 8 s (page.route). Precise: shows the exact cause.
 *   TC-033b slows the WHOLE network with Chrome's own throttling (same as DevTools → Network → custom
 *           profile, 6000 ms latency), switched on just before the slot click. This is the manual reproduction.
 *
 * DATA: fictional client Kasun Herath <kasun.herath@example.com>. Each test books its own Confirmed source
 *       appointment (deleted afterwards); the follow-up form is never saved.
 *
 * RUN:  npx playwright test tests/emr-237-tc033.spec.js --project=chromium --headed   (watch both, one tab each)
 *       npx playwright test tests/emr-237-tc033.spec.js --project=chromium -g "TC-033b" --headed   (manual repro only)
 *       npm run test:report                                                            (steps, screenshots, video, trace)
 */

const READ_PAUSE_MS = 600; // short pause after each caption so it can be read in the video
const CLIENT = { name: 'Kasun Herath', email: 'kasun.herath@example.com', mobile: '0763456703', gender: 'Male', dob: [1988, 11, 5] };

test.use({ video: 'on', trace: 'on', viewport: { width: 1280, height: 800 } });

/**
 * The whole user path + the check. `mode`:
 *   'hold-lookup' – only the source lookup's answer is held back `delayMs` (TC-033)
 *   'throttle'    – Chrome network throttling with `delayMs` latency for every request (TC-033b, = DevTools)
 * `source` is the Confirmed appointment's day; the follow-up date is `source + 2 weeks` (`followUp`).
 * @param {import('@playwright/test').Page} page
 * @param {{ mode: 'hold-lookup'|'throttle', delayMs: number, source: [number, number, number], followUp: { date: string, day: string } }} o
 */
async function runFollowUpRace(page, o) {
  const throttled = o.mode === 'throttle';
  test.info().annotations.push({
    type: 'breakpoint',
    description: 'BP-12: create-form.jsx:347-358 sets status "confirmed" when the async source lookup returns – even if the user already picked a status',
  });

  // ------------------------------------------------------------------ helpers
  /** @type {Record<string,string>} */ let headers = {};
  let apiBase = '';
  page.on('request', (req) => {
    const h = req.headers();
    if (!headers.authorization && h.authorization && req.url().includes('/aesthetic/')) {
      headers = { authorization: h.authorization };
      apiBase = new URL(req.url()).origin;
    }
  });
  // API calls go through Playwright's own request context – not slowed by the browser throttling
  const call = async (method, p, data) => {
    const r = await page.request.fetch(apiBase + p, { method, headers, data });
    let body = null;
    try { body = await r.json(); } catch {}
    return { status: r.status(), body };
  };

  /** Caption shown at the bottom of the page – visible in the video, the screenshots and in --headed mode. */
  const caption = async (text, tone = 'info') => {
    await page.evaluate(([t, c]) => {
      let el = document.getElementById('qa-caption');
      if (!el) { el = document.createElement('div'); el.id = 'qa-caption'; document.documentElement.appendChild(el); }
      el.textContent = t;
      const bg = c === 'bad' ? '#b42318' : c === 'good' ? '#067647' : '#1e40af';
      el.setAttribute('style', `position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483647;max-width:88vw;` +
        `padding:10px 18px;border-radius:10px;font:600 15px/1.45 system-ui,Segoe UI,sans-serif;color:#fff;background:${bg};` +
        `box-shadow:0 6px 20px rgba(0,0,0,.28);pointer-events:none;text-align:center`);
    }, [text, tone]).catch(() => {});
    await page.waitForTimeout(READ_PAUSE_MS);
  };

  /** Full-tab screenshot attached to the report (+ a close-up of one element). */
  const evidence = async (name, closeUp) => {
    await test.info().attach(`${name}.png`, { body: await page.screenshot(), contentType: 'image/png' });
    if (closeUp) await test.info().attach(`${name}-closeup.png`, { body: await closeUp.screenshot(), contentType: 'image/png' });
  };

  const statusField = () => page.locator('div.space-y-2').filter({ has: page.getByText('Appointment Status', { exact: true }) });
  const statusCombo = () => statusField().getByRole('combobox');

  const createdIds = [];
  let lookupRe = /$^/;
  const holdLookup = async (route) => {
    if (route.request().method() === 'GET') await new Promise((r) => setTimeout(r, o.delayMs));
    await route.continue().catch(() => {});
  };
  /** @type {import('@playwright/test').CDPSession | null} */ let cdp = null;
  const [sy, sm, sd] = o.source;
  const sourceDate = `${sy}-${String(sm).padStart(2, '0')}-${String(sd).padStart(2, '0')}`;

  try {
    // ---------------------------------------------------------------- 1
    await test.step('1. Log in', async () => {
      const lp = new LoginPage(page);
      await lp.goto();
      await lp.login(process.env.QA_USERNAME || 'parami', process.env.QA_PASSWORD || 'parami');
      await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 40000 });
      await page.goto('/admin/aesthetic-appointments', { waitUntil: 'domcontentloaded' });
      await expect.poll(() => !!headers.authorization, { timeout: 20000 }).toBe(true);
    });

    // ---------------------------------------------------------------- 2
    const setup = await test.step(`2. Prepare: client Kasun Herath + a CONFIRMED appointment on ${sourceDate} 10:00`, async () => {
      const doctors = (await call('GET', '/aesthetic/doctors')).body?.payload || [];
      expect(doctors.length, 'at least one aesthetic doctor').toBeGreaterThan(0);
      const types = (await call('GET', '/aesthetic/appointment-types')).body?.payload || [];
      const type = types.find((t) => t.active !== false) || types[0];
      expect(type?.id, 'an appointment type').toBeTruthy();

      const found = (await call('GET', `/aesthetic/patients?page=1&limit=10&search=${encodeURIComponent(CLIENT.email)}`)).body?.payload;
      const list = Array.isArray(found) ? found : found?.patients || found?.rows || found?.data || [];
      let client = list.find((x) => String(x.email || '').toLowerCase() === CLIENT.email);
      if (!client) {
        const [y, m, d] = CLIENT.dob;
        const r = await call('POST', '/aesthetic/patients', {
          name: CLIENT.name, email: CLIENT.email, mobile: CLIENT.mobile, gender: CLIENT.gender, dob: new Date(y, m - 1, d).toISOString(),
        });
        expect(r.status, `create client: ${JSON.stringify(r.body)}`).toBe(200);
        client = r.body?.payload;
      }

      const r = await call('POST', '/aesthetic/appointments', {
        start_time: new Date(sy, sm - 1, sd, 10, 0).toISOString(), end_time: new Date(sy, sm - 1, sd, 10, 30).toISOString(),
        status: 'scheduled', notes: 'Follow-up to be booked at reception.',
        patient_id: client.id, doctor_id: doctors[0].id, appointment_type_id: type.id,
      });
      expect(r.status, JSON.stringify(r.body)).toBeLessThan(400);
      const appt = r.body?.payload?.appointment;
      createdIds.push(appt.id);
      // Same call the status menu in Appointment Details makes
      const s = await call('PUT', `/aesthetic/appointments/${appt.id}`, { status: 'confirmed' });
      expect(s.status).toBe(200);
      test.info().annotations.push({ type: 'data', description: `source appointment #${appt.id} · ${CLIENT.name} <${CLIENT.email}> · confirmed · ${sourceDate} 10:00` });
      return { appt };
    });
    lookupRe = new RegExp(`/aesthetic/appointments/${setup.appt.id}$`);

    // ---------------------------------------------------------------- 3
    await test.step('3. Schedule → open the CONFIRMED appointment → Quick Schedule Follow-up "2 Weeks"', async () => {
      await page.goto(`/admin/aesthetic-schedule?date=${sourceDate}`, { waitUntil: 'domcontentloaded' });
      const card = page.getByText(CLIENT.name).first();
      await expect(card).toBeVisible({ timeout: 30000 });
      await card.click();
      const dlg = page.locator('[role="dialog"]').filter({ hasText: 'Appointment Details' });
      await expect(dlg).toBeVisible({ timeout: 15000 });
      await expect(dlg.getByText('Patient confirmed attendance')).toBeVisible();
      await caption('Step 3 · The source appointment is CONFIRMED. The user books a follow-up: Quick Schedule Follow-up → "2 Weeks".');
      await evidence('01-source-appointment-confirmed',
        dlg.locator('div.space-y-2').filter({ has: page.getByText('Appointment Status', { exact: true }) }).first());
      await dlg.getByRole('button', { name: '2 Weeks', exact: true }).click();
      await page.waitForURL(new RegExp(`/appointments/${setup.appt.id}\\?tab=scheduling&jump=2`), { timeout: 20000 });
    });

    // ---------------------------------------------------------------- 4
    await test.step(`4. Pick the follow-up date (${o.followUp.date}) → Schedule page`, async () => {
      // the calendar jumps to source + 2 weeks and highlights that day (#dbeafe)
      await expect(page.locator('.rbc-month-view .rbc-day-bg[style*="219, 234, 254"]').first()).toBeVisible({ timeout: 30000 });
      await caption(`Step 4 · The calendar jumped 2 weeks ahead. The user picks ${o.followUp.date}.`);
      await page.locator('.rbc-month-view .rbc-date-cell:not(.rbc-off-range) button').filter({ hasText: new RegExp(`^0?${o.followUp.day}$`) }).first().click();
      await page.waitForURL(new RegExp(`/admin/aesthetic-schedule\\?date=${o.followUp.date}`), { timeout: 20000 });
      const ls = await page.evaluate(() => ({ npid: localStorage.getItem('npid'), nsrc: localStorage.getItem('nsrc') }));
      test.info().annotations.push({ type: 'observed', description: `browser storage after picking the date: ${JSON.stringify(ls)} (npid = client, nsrc = source appointment)` });
      expect(ls.nsrc, 'the source appointment id is remembered for the new booking').toBe(String(setup.appt.id));
    });

    // ---------------------------------------------------------------- 5
    const timing = { click: 0, form: 0, request: 0, pick: 0, response: 0, flip: 0 };
    const slowWhat = throttled
      ? `slow network: Chrome throttling, ${o.delayMs / 1000} s latency on every request (= DevTools custom profile)`
      : `source lookup held back ${o.delayMs / 1000} s`;
    await test.step(`5. Click the empty 11:00 slot → New Appointment form (${slowWhat})`, async () => {
      page.on('request', (r) => { if (!timing.request && r.method() === 'GET' && lookupRe.test(r.url())) timing.request = Date.now(); });
      page.on('response', (r) => { if (!timing.response && r.request().method() === 'GET' && lookupRe.test(r.url())) timing.response = Date.now(); });
      // Real empty-slot click on the Schedule page. Slot rows are plain divs (doctor-calendar.jsx DroppableSlot,
      // class "h-8 select-none cursor-pointer"); the :00 row carries the hour label ("11 AM"). Any doctor's column
      // will do – the status race does not depend on the doctor.
      const emptySlot = page.locator('div.h-8.select-none.cursor-pointer').filter({ has: page.locator('span', { hasText: /^11 AM$/ }) }).first();
      await expect(emptySlot, 'an empty, bookable 11:00 slot').toBeVisible({ timeout: 30000 });
      if (throttled) {
        await caption(`Step 5 · Network throttling ON (${o.delayMs / 1000} s latency, like DevTools). Now the user clicks the empty 11:00 slot.`);
        cdp = await page.context().newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: o.delayMs, downloadThroughput: 2500000, uploadThroughput: 2500000 });
      } else {
        await caption('Step 5 · On the Schedule page the user clicks the empty 11:00 slot to book the follow-up.');
        await page.route(lookupRe, holdLookup);
      }
      timing.click = Date.now();
      await emptySlot.click({ noWaitAfter: true });
      await page.waitForURL(new RegExp(`/appointments/new\\?doctorId=\\d+&start=${o.followUp.date}T11:00`), { timeout: 60000 });
      await expect(statusCombo(), 'the form is open').toBeVisible({ timeout: 60000 });
      timing.form = Date.now();
      await expect(statusCombo()).toHaveText(/Scheduled/, { timeout: 5000 });
      await expect.poll(() => timing.request, { message: 'the form started the source lookup', timeout: 15000 }).toBeGreaterThan(0);
      expect(timing.response, 'the lookup must still be running when the user acts').toBe(0);
      await caption('Step 5 · New appointment form. In the background it is still looking up the source appointment…');
      await evidence('02-form-open-lookup-still-running', statusField());
    });

    // ---------------------------------------------------------------- 6
    await test.step('6. The user picks "Waiting" (lookup still running)', async () => {
      await statusCombo().click();
      await page.getByRole('option', { name: 'Waiting' }).click();
      await expect(statusCombo(), 'the user picked Waiting').toHaveText(/Waiting/);
      timing.pick = Date.now();
      expect(timing.response, 'the user picked before the lookup answered').toBe(0);
      await caption('Step 6 · The user deliberately picks "Waiting". The lookup has not answered yet.');
      await evidence('03-user-picked-waiting', statusField());
    });

    // ---------------------------------------------------------------- 7
    await test.step('7. The slow lookup answers', async () => {
      await expect.poll(() => timing.response, { message: 'the lookup answered', timeout: o.delayMs + 30000 }).toBeGreaterThan(0);
      // watch the field for up to 3 s after the answer
      await expect.poll(async () => (await statusCombo().innerText()).trim(), { timeout: 3000 }).toMatch(/Confirmed/).catch(() => {});
      const shown = (await statusCombo().innerText()).trim();
      if (/Confirmed/.test(shown)) timing.flip = Date.now();
      const rel = (t) => (t ? `+${((t - timing.request) / 1000).toFixed(1)} s` : 'never');
      test.info().annotations.push({
        type: 'timeline',
        description: (throttled ? `slot click → form visible ${((timing.form - timing.click) / 1000).toFixed(1)} s · ` : '') +
          `lookup sent 0.0 s · user picked "Waiting" ${rel(timing.pick)} · lookup answered ${rel(timing.response)} · status became "Confirmed" ${rel(timing.flip)}`,
      });
      if (throttled) await cdp?.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      if (timing.flip) {
        await caption('Step 7 · The lookup answered and replaced the user\'s "Waiting" with "Confirmed". The user\'s choice is lost.', 'bad');
      } else {
        await caption('Step 7 · The lookup answered and the user\'s "Waiting" was kept.', 'good');
      }
      await evidence('04-after-lookup-answered', statusField());
    });

    // ---------------------------------------------------------------- 8
    await test.step('8. Check: the status must still be what the user picked ("Waiting")', async () => {
      const shown = (await statusCombo().innerText()).trim();
      test.info().annotations.push({ type: 'observed', description: `status after the late lookup: "${shown}"` });
      expect(shown,
        'BP-12: the user picked "Waiting", then the late lookup of the CONFIRMED source appointment overwrote it with "Confirmed" ' +
        '(create-form.jsx:355 formik.setFieldValue("status","confirmed") runs without checking whether the user already chose a status). ' +
        'Acceptance criterion 2: "The status changes only when the user updates it directly."').toMatch(/Waiting/);
    });
  } finally {
    if (cdp) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => {});
    await page.unroute(lookupRe, holdLookup).catch(() => {});
    await page.evaluate(() => { localStorage.removeItem('npid'); localStorage.removeItem('nsrc'); }).catch(() => {});
    for (const id of createdIds) {
      const r = await call('DELETE', `/aesthetic/appointments/${id}`).catch(() => null);
      if (!r || r.status >= 400) await call('PUT', `/aesthetic/appointments/${id}`, { status: 'deleted' }).catch(() => null);
    }
  }
}

test('TC-033: late source lookup must NOT overwrite a status the user picked (race in the nsrc flow, 8a0c677)', async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || isMobile, 'Desktop Chromium only (creates QA data + desktop Schedule UI)');
  test.setTimeout(180000);
  await runFollowUpRace(page, { mode: 'hold-lookup', delayMs: 8000, source: [2027, 12, 27], followUp: { date: '2028-01-10', day: '10' } });
});

test('TC-033b: same race on a slow network – Chrome throttling like DevTools (the manual reproduction)', async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || isMobile, 'Desktop Chromium only (creates QA data + desktop Schedule UI)');
  test.setTimeout(240000);
  await runFollowUpRace(page, { mode: 'throttle', delayMs: 6000, source: [2027, 12, 29], followUp: { date: '2028-01-12', day: '12' } });
});
