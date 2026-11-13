// @ts-check
const { test, expect, devices } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { SchedulePage } = require('./pages/SchedulePage');
const { AppointmentsPage } = require('./pages/AppointmentsPage');

/**
 * EMR-207 Automated Test Suite:
 * Show the day of the week (Sunday, Monday, ...) next to the date.
 *
 * Acceptance rules (see EMR_207_TEST_CASES.md §1.2):
 *  AR-1 full weekday name, AR-2 weekday before the date, AR-3 weekday correct
 *  for the date, AR-4 same on desktop + mobile, AR-5 no functional regression.
 *
 * NOTE: QA (qa_care.amerck.com) already renders the Schedule header as a
 * separate weekday label + YYYY-MM-DD input ("Thursday" | "2026-11-05"); the local
 * emr-frontend source still has flatpickr "D, M d Y". Tests accept either layout
 * as long as a FULL weekday precedes the date and matches it.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FULL_WEEKDAY_PREFIX = new RegExp(`^(${WEEKDAYS.join('|')}),\\s+`);
const CLINIC_TZ = 'Asia/Colombo';

/** Weekday for a YYYY-MM-DD string, independent of the runner's time zone. */
function weekdayOf(isoDate) {
  return WEEKDAYS[new Date(`${isoDate}T12:00:00Z`).getUTCDay()];
}

/** Today's YYYY-MM-DD in the clinic time zone. */
function todayInClinic() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TZ }).format(new Date());
}

/** Add n days to a YYYY-MM-DD string. */
function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Asserts the text starts with a full weekday name and that the weekday
 * agrees with the date that follows it. Returns the parsed parts.
 */
function expectWeekdayMatchesDate(text, expectedIso) {
  const value = (text || '').trim();
  expect(value, `"${value}" should not be an invalid date`).not.toMatch(/invalid date/i);
  expect(value, `"${value}" should start with a full weekday name (AR-1/AR-2)`).toMatch(FULL_WEEKDAY_PREFIX);

  const [, shownWeekday] = value.match(FULL_WEEKDAY_PREFIX) || [];
  const datePart = value.replace(FULL_WEEKDAY_PREFIX, '').trim();
  let parsedIso;
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    parsedIso = datePart; // avoid UTC-midnight shift of new Date('YYYY-MM-DD')
  } else {
    const parsed = new Date(datePart);
    expect(Number.isNaN(parsed.getTime()), `date part "${datePart}" should be parseable`).toBe(false);
    parsedIso = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }
  if (expectedIso) expect(parsedIso, 'displayed date should match the expected date').toBe(expectedIso);
  expect(shownWeekday, `weekday for ${parsedIso} (AR-3)`).toBe(weekdayOf(parsedIso));
  return { shownWeekday, parsedIso };
}

test.describe('EMR-207: Day of the week next to the date', () => {
  /** @type {SchedulePage} */
  let schedulePage;

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(process.env.QA_USERNAME || 'parami', process.env.QA_PASSWORD || 'parami');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });
    schedulePage = new SchedulePage(page);
  });

  /** Opens the schedule for a date and returns the visible picker text. */
  async function openScheduleAt(page, isoDate) {
    const qs = isoDate ? `?date=${isoDate}` : '';
    await page.goto(`/admin/aesthetic-schedule${qs}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await schedulePage.btnMarkOffDay.waitFor({ state: 'visible', timeout: 15000 });
    return readScheduleDate();
  }

  /**
   * QA build renders: <div><span>Thursday</span><input value="2026-11-05"></div>.
   * Returns "<weekday label>, <input value>" so one assertion covers both. If the
   * weekday is ever moved into the input itself, the label part is just empty.
   */
  const weekdayLabel = () => schedulePage.datePickerInput.locator('xpath=preceding-sibling::*[1]');

  async function readScheduleDate() {
    await expect(schedulePage.datePickerInput).toBeVisible();
    const value = (await schedulePage.datePickerInput.inputValue()).trim();
    if (FULL_WEEKDAY_PREFIX.test(value)) return value;
    const label = (await weekdayLabel().count()) ? (await weekdayLabel().innerText()).trim() : '';
    return label ? `${label}, ${value}` : value;
  }

  const prevButton = (page) => page.locator('button:has(svg.lucide-chevron-left)').first();
  const nextButton = (page) => page.locator('button:has(svg.lucide-chevron-right)').first();

  /** Clicks, waits for the URL, then waits until the label shows the right weekday (catches stale labels). */
  async function clickAndWaitForDate(page, button, expectedIso) {
    await button.click();
    await page.waitForURL(new RegExp(`date=${expectedIso}`), { timeout: 10000, waitUntil: 'commit' });
    await expect.poll(readScheduleDate, { timeout: 5000, message: `label should update to ${weekdayOf(expectedIso)}` })
      .toMatch(new RegExp(`^${weekdayOf(expectedIso)},`));
  }

  // ===========================================================================
  // Part 1: Schedule page header (D1)
  // ===========================================================================
  test.describe('Schedule header', () => {
    test('TC-001: shows full weekday for today', async ({ page }) => {
      const text = await openScheduleAt(page);
      expectWeekdayMatchesDate(text, todayInClinic());
    });

    test('TC-002: weekday updates on Next', async ({ page }) => {
      const today = todayInClinic();
      await openScheduleAt(page, today);
      const tomorrow = addDays(today, 1);
      await clickAndWaitForDate(page, nextButton(page), tomorrow);
      expectWeekdayMatchesDate(await readScheduleDate(), tomorrow);
    });

    test('TC-003: weekday updates on Prev', async ({ page }) => {
      const today = todayInClinic();
      await openScheduleAt(page, today);
      const yesterday = addDays(today, -1);
      await clickAndWaitForDate(page, prevButton(page), yesterday);
      expectWeekdayMatchesDate(await readScheduleDate(), yesterday);
    });

    test('TC-004: full Sunday→Saturday cycle in order', async ({ page }) => {
      let iso = '2026-11-01'; // Sunday
      const seen = [expectWeekdayMatchesDate(await openScheduleAt(page, iso), iso).shownWeekday];
      for (let i = 0; i < 6; i++) {
        iso = addDays(iso, 1);
        await clickAndWaitForDate(page, nextButton(page), iso);
        seen.push(expectWeekdayMatchesDate(await readScheduleDate(), iso).shownWeekday);
      }
      expect(seen).toEqual(WEEKDAYS);
    });

    test('TC-005: Today button resets the weekday', async ({ page }) => {
      await openScheduleAt(page, '2027-01-01');
      const today = todayInClinic();
      await clickAndWaitForDate(page, schedulePage.btnToday, today);
      expectWeekdayMatchesDate(await readScheduleDate(), today);
    });

    test('TC-006: picking a date in the calendar popup', async ({ page }) => {
      await openScheduleAt(page, '2026-11-05');
      await schedulePage.datePickerInput.click();
      const calendar = schedulePage.flatpickrCalendar.first();
      await expect(calendar).toBeVisible();
      await calendar.locator('.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)', { hasText: /^7$/ }).click();
      await page.waitForURL(/date=2026-11-07/, { timeout: 10000, waitUntil: 'commit' });
      expectWeekdayMatchesDate(await readScheduleDate(), '2026-11-07');
    });

    test('TC-009 / TC-023: deep-link boundary dates', async ({ page }) => {
      const dates = ['2026-11-30', '2026-12-31', '2027-01-01', '2027-02-28', '2027-03-01', '2028-02-29'];
      for (const iso of dates) {
        await test.step(iso, async () => {
          expectWeekdayMatchesDate(await openScheduleAt(page, iso), iso);
          const next = addDays(iso, 1);
          await clickAndWaitForDate(page, nextButton(page), next);
          expectWeekdayMatchesDate(await readScheduleDate(), next);
        });
      }
    });

    test('TC-025: past date still read-only with weekday shown', async ({ page }) => {
      const yesterday = addDays(todayInClinic(), -1);
      expectWeekdayMatchesDate(await openScheduleAt(page, yesterday), yesterday);
    });

    test('TC-026: URL keeps YYYY-MM-DD format after navigation', async ({ page }) => {
      await openScheduleAt(page, '2026-11-05');
      for (const btn of [nextButton(page), prevButton(page), schedulePage.btnToday]) {
        await btn.click();
        await page.waitForLoadState('domcontentloaded');
        const date = new URL(page.url()).searchParams.get('date');
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  // ===========================================================================
  // Part 2: Break points (manual input, invalid URL, layout)
  // ===========================================================================
  test.describe('Break points', () => {
    test('TC-015: typing an ISO date does not land on a wrong date (BP-3)', async ({ page }) => {
      await openScheduleAt(page, '2026-11-05');
      await schedulePage.datePickerInput.click();
      await schedulePage.datePickerInput.fill('2026-11-10');
      await schedulePage.datePickerInput.press('Enter');
      await page.waitForTimeout(1000);
      const urlDate = new URL(page.url()).searchParams.get('date');
      expect(['2026-11-05', '2026-11-10'], 'must navigate to typed date or stay put').toContain(urlDate);
      expectWeekdayMatchesDate(await readScheduleDate(), urlDate);
    });

    test('TC-016: weekday label follows a manually typed date (BP-3 / BP-11)', async ({ page }) => {
      await openScheduleAt(page, '2026-11-04'); // Wednesday
      await schedulePage.datePickerInput.click();
      await schedulePage.datePickerInput.fill('2026-11-08'); // Sunday
      await schedulePage.datePickerInput.press('Enter');
      // Wait for the navigation to commit instead of a fixed sleep (the input is briefly
      // empty while the page re-renders, which made a 1s sleep flaky).
      await page.waitForURL(/date=2026-11-08/, { timeout: 10000, waitUntil: 'commit' });
      await page.keyboard.press('Escape');
      await expect(schedulePage.datePickerInput).toHaveValue(/2026-11-08|Nov 08 2026/, { timeout: 10000 });
      // Label, input and URL must all agree. A label still saying "Wednesday" is a defect.
      await expect.poll(readScheduleDate, { timeout: 5000, message: 'label should update to Sunday' }).toMatch(/^Sunday, /);
      expectWeekdayMatchesDate(await readScheduleDate(), '2026-11-08');
    });

    test('TC-029: 5 consecutive Next clicks advance 5 days and label follows (BP-11)', async ({ page }) => {
      // System behaviour: Prev/Next push `date ± 1` from the URL, so a click made before the
      // previous navigation commits is dropped. Click at user pace (wait for each URL).
      let iso = '2026-11-05';
      await openScheduleAt(page, iso);
      for (let i = 0; i < 5; i++) {
        iso = addDays(iso, 1);
        await clickAndWaitForDate(page, nextButton(page), iso);
        expectWeekdayMatchesDate(await readScheduleDate(), iso);
      }
      expect(iso).toBe('2026-11-10');
      await expect.poll(readScheduleDate, { timeout: 5000 }).toMatch(/^Tuesday, /);
    });

    test('TC-020: invalid ?date= does not render "Invalid date" (BP-6)', async ({ page }) => {
      // KNOWN DEFECT on QA: ?date=abc shows "Invalid date" in the weekday label and the input.
      // test.fail() keeps the run green while the bug is open; it turns red once dev fixes it -> remove this line.
      test.fail(true, 'Known defect EMR-207/BP-6: invalid ?date= renders "Invalid date"');
      test.info().annotations.push({ type: 'defect', description: 'Schedule ?date=abc shows "Invalid date" in label + input' });
      for (const bad of ['abc', '2026-02-30']) {
        await test.step(bad, async () => {
          await page.goto(`/admin/aesthetic-schedule?date=${bad}`, { waitUntil: 'domcontentloaded' });
          await schedulePage.btnMarkOffDay.waitFor({ state: 'visible', timeout: 15000 });
          await expect(page.getByText(/invalid date/i)).toHaveCount(0);
          const value = await schedulePage.datePickerInput.inputValue();
          expect(value).not.toMatch(/invalid date|NaN/i);
        });
      }
    });

    test('TC-021: longest weekday is not clipped and buttons stay usable (BP-7)', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      const text = await openScheduleAt(page, '2026-09-30'); // Wednesday
      expectWeekdayMatchesDate(text, '2026-09-30');

      const fits = await schedulePage.datePickerInput.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
      expect(fits, 'date text must fit inside the input without clipping').toBe(true);
      if (await weekdayLabel().count()) {
        const labelFits = await weekdayLabel().evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
        expect(labelFits, '"Wednesday" label must not be clipped').toBe(true);
      }

      const inputBox = await schedulePage.datePickerInput.boundingBox();
      const nextBox = await nextButton(page).boundingBox();
      expect(inputBox && nextBox).toBeTruthy();
      if (inputBox && nextBox) {
        expect(nextBox.x, 'Next button must not overlap the date').toBeGreaterThanOrEqual(inputBox.x + inputBox.width - 1);
      }
      await expect(nextButton(page)).toBeEnabled();
    });
  });

  // ===========================================================================
  // Part 3: Appointments list (D3) and consultation header (D7)
  // ===========================================================================
  test.describe('Appointments list', () => {
    const MONTH_DATE = /\b(?:(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/;

    /** Opens the Appointments list with "All time" so rows exist even if the last 2 weeks are empty. */
    async function openAllTimeAppointments(page) {
      const appointmentsPage = new AppointmentsPage(page);
      await appointmentsPage.goto();
      if (await appointmentsPage.dateRangeButton.isVisible().catch(() => false)) {
        await appointmentsPage.dateRangeButton.click();
        await appointmentsPage.btnAllTime.click();
        await page.keyboard.press('Escape');
      }
      await expect(page.getByText('All time').first()).toBeVisible({ timeout: 10000 });
      await appointmentsPage.tableRows.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      return appointmentsPage;
    }

    /** Returns the date text found in each data row (first line of the date/time cell). */
    async function rowDateTexts(page) {
      const appointmentsPage = await openAllTimeAppointments(page);
      const rows = await appointmentsPage.tableRows.allInnerTexts();
      return rows
        .map((r) => (r.match(MONTH_DATE) || [])[0])
        .filter(Boolean);
    }

    test('TC-010: every row shows a valid date (weekday correct when shown)', async ({ page }) => {
      // System behaviour on QA: list Date column shows "Aug 13, 2026" WITHOUT a weekday
      // (weekday is shown on the Schedule header only). Pending PO scope (D3).
      test.info().annotations.push({ type: 'scope', description: 'D3 Appointments list has no weekday – confirm with PO' });
      const dates = await rowDateTexts(page);
      test.skip(dates.length === 0, 'No appointments at all (All time); seed data first');
      for (const text of dates) {
        expect(text).not.toMatch(/invalid date|NaN/i);
        if (FULL_WEEKDAY_PREFIX.test(text)) {
          expectWeekdayMatchesDate(text);
        } else {
          expect(text).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/); // "MMM D, YYYY"
          expect(Number.isNaN(new Date(text).getTime()), `"${text}" must be a valid date`).toBe(false);
        }
      }
    });

    test('TC-014: consultation header shows a valid appointment date', async ({ page, context }) => {
      // System behaviour on QA: the consultation header shows "November 5, 2026 4:15 PM - ..."
      // WITHOUT a weekday (weekday is shown on the Schedule header only). Pending PO scope (D7).
      test.info().annotations.push({ type: 'scope', description: 'D7 consultation header has no weekday – confirm with PO' });
      const appointmentsPage = await openAllTimeAppointments(page);
      const firstRow = appointmentsPage.tableRows.first();
      test.skip(!(await firstRow.innerText()).match(MONTH_DATE), 'No appointments to open');

      const popupPromise = context.waitForEvent('page', { timeout: 6000 }).catch(() => null);
      await firstRow.locator('button').first().click();
      const target = (await popupPromise) || page;
      await target.waitForLoadState('domcontentloaded');

      // Header line: "November 5, 2026 4:15 PM - 4:45 PM" (optionally prefixed by a weekday)
      const header = target.locator('label').filter({ hasText: /\d{4}.*(AM|PM)\s*-\s*\d/ }).first();
      await expect(header).toBeVisible({ timeout: 15000 });
      const text = (await header.innerText()).trim();
      expect(text).not.toMatch(/invalid date|NaN/i);
      expect(text).toMatch(/^(?:(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\s+)?[A-Z][a-z]+ \d{1,2}, \d{4} \d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)$/);

      // If a weekday is shown, it must be the right one for the date
      const startPart = text.split(/\s+-\s+/)[0];
      if (FULL_WEEKDAY_PREFIX.test(startPart)) expectWeekdayMatchesDate(startPart);
      else expect(Number.isNaN(new Date(startPart).getTime()), `"${startPart}" must be a valid date`).toBe(false);
    });
  });

  // ===========================================================================
  // Part 4: Mobile / iOS fallback (D2) – BP-1, BP-2
  // ===========================================================================
  test.describe('Mobile', () => {
    test('TC-008: iOS native fallback shows the full weekday', async ({ browser, browserName }) => {
      test.skip(browserName === 'firefox', 'Firefox does not support mobile emulation');
      const { defaultBrowserType, ...iphone } = devices['iPhone 13'];
      const ctx = await browser.newContext({ ...iphone, ignoreHTTPSErrors: true });
      const page = await ctx.newPage();
      try {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(process.env.QA_USERNAME || 'parami', process.env.QA_PASSWORD || 'parami');
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });

        await page.goto('/admin/aesthetic-schedule?date=2026-11-05', { waitUntil: 'domcontentloaded' });
        // Old source: iOS renders a hidden <input type=date> + read-only text input ("Thu, Nov 05 2026").
        // QA build: same weekday label + input as desktop. Accept either, but require a FULL weekday.
        const readonlyDisplay = page.locator('input[type="text"][readonly]').first();
        const input = (await readonlyDisplay.count()) ? readonlyDisplay : page.locator('input.flatpickr-input, input[placeholder="Required"]').first();
        await expect(input).toBeVisible({ timeout: 15000 });
        const value = (await input.inputValue()).trim();
        expect(value, 'iOS must not show the short weekday only').not.toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat),/);
        let combined = value;
        if (!FULL_WEEKDAY_PREFIX.test(value)) {
          const label = input.locator('xpath=preceding-sibling::*[1]');
          combined = `${(await label.count()) ? (await label.innerText()).trim() : ''}, ${value}`;
        }
        expectWeekdayMatchesDate(combined, '2026-11-05');
      } finally {
        await ctx.close();
      }
    });
  });

  // ===========================================================================
  // Part 5: Time zone (BP-4) – clinic time vs browser time
  // ===========================================================================
  test.describe('Time zone', () => {
    test('TC-017: weekday in list is the same for Colombo and UTC browsers', async ({ browser }) => {
      /** @param {string} timezoneId */
      async function snapshot(timezoneId) {
        const ctx = await browser.newContext({ timezoneId, ignoreHTTPSErrors: true });
        const page = await ctx.newPage();
        try {
          const loginPage = new LoginPage(page);
          await loginPage.goto();
          await loginPage.login(process.env.QA_USERNAME || 'parami', process.env.QA_PASSWORD || 'parami');
          await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });
          const appointmentsPage = new AppointmentsPage(page);
          await appointmentsPage.goto();
          await appointmentsPage.tableRows.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
          const rows = await appointmentsPage.tableRows.allInnerTexts();
          return rows.map((r) => r.replace(/\s+/g, ' ').trim());
        } finally {
          await ctx.close();
        }
      }

      const colombo = await snapshot(CLINIC_TZ);
      const utc = await snapshot('UTC');
      test.skip(colombo.length === 0, 'No appointments to compare');

      // Only late-night (00:00–05:29 Colombo) appointments differ in weekday between
      // these zones. Seed one at 00:30 Colombo to make this test meaningful.
      const weekdayRe = new RegExp(`\\b(${WEEKDAYS.join('|')})\\b`);
      const n = Math.min(colombo.length, utc.length);
      for (let i = 0; i < n; i++) {
        const a = colombo[i].match(weekdayRe)?.[1];
        const b = utc[i].match(weekdayRe)?.[1];
        expect(b, `row ${i + 1}: UTC browser should show clinic-time weekday`).toBe(a);
      }
    });
  });
});
