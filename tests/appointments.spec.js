// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { AppointmentsPage } = require('./pages/AppointmentsPage');

test.describe('AMERCK CARE — Appointments Module Test Suite (https://qa_care.amerck.com/admin/aesthetic-appointments)', () => {
  /** @type {LoginPage} */
  let loginPage;
  /** @type {AppointmentsPage} */
  let appointmentsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    appointmentsPage = new AppointmentsPage(page);

    // 1. Log in
    await loginPage.goto();
    await loginPage.login('parami', 'parami');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });

    // 2. Navigate to Appointments
    await appointmentsPage.goto();
  });

  // =========================================================================
  // 1. Navigation & Header Verification
  // =========================================================================
  test.describe('1. Navigation & Page Header', () => {

    test('APT-01: Should navigate to Appointments page and verify URL and title', async ({ page }) => {
      expect(page.url()).toContain('/admin/aesthetic-appointments');
      await expect(page).toHaveTitle(/Amerck Care/i);
      await expect(appointmentsPage.pageHeading).toBeVisible();
    });

    test('APT-02: Should render clinic selector and user profile buttons', async () => {
      await expect(appointmentsPage.clinicButton).toBeVisible();
      await expect(appointmentsPage.userAvatarButton).toBeVisible();
    });
  });

  // =========================================================================
  // 2. KPI Summary Metrics
  // =========================================================================
  test.describe('2. Appointment Status KPI Metrics', () => {

    test('APT-03: Should render all appointment status KPI badges correctly', async () => {
      await expect(appointmentsPage.kpiScheduled).toBeVisible();
      await expect(appointmentsPage.kpiConfirmed).toBeVisible();
      await expect(appointmentsPage.kpiWaiting).toBeVisible();
      await expect(appointmentsPage.kpiEngaged).toBeVisible();
      await expect(appointmentsPage.kpiCompleted).toBeVisible();
      await expect(appointmentsPage.kpiCancelled).toBeVisible();
      await expect(appointmentsPage.kpiNoShow).toBeVisible();
      await expect(appointmentsPage.kpiNotReachable).toBeVisible();
      await expect(appointmentsPage.kpiDeleted).toBeVisible();
    });
  });

  // =========================================================================
  // 3. Search & Filter Controls
  // =========================================================================
  test.describe('3. Search and Filters', () => {

    test('APT-04: Should allow typing into patient search input and clear it', async () => {
      await expect(appointmentsPage.searchInput).toBeVisible();
      await appointmentsPage.searchInput.fill('John Doe');
      await expect(appointmentsPage.searchInput).toHaveValue('John Doe');

      await appointmentsPage.searchInput.clear();
      await expect(appointmentsPage.searchInput).toHaveValue('');
    });

    test('APT-05: Should open Status filter dropdown and display status options', async ({ page }) => {
      await appointmentsPage.statusFilterDropdown.click();
      await appointmentsPage.listbox.waitFor({ state: 'visible' });

      const expectedStatuses = ['All', 'Scheduled', 'Confirmed', 'Waiting', 'Completed', 'Cancelled'];
      for (const status of expectedStatuses) {
        await expect(page.locator(`[role="option"]:has-text("${status}")`).first()).toBeVisible();
      }

      await page.keyboard.press('Escape');
    });

    test('APT-06: Should allow selecting a specific status filter option (e.g. Confirmed)', async () => {
      await appointmentsPage.selectStatus('Confirmed');
      await expect(appointmentsPage.statusFilterDropdown).toContainText('Confirmed');

      // Reset back to All
      await appointmentsPage.selectStatus('All');
      await expect(appointmentsPage.statusFilterDropdown).toContainText('All');
    });

    test('APT-07: Should render Type filter dropdown and allow interaction', async () => {
      await expect(appointmentsPage.typeFilterDropdown).toBeVisible();
      await expect(appointmentsPage.typeFilterDropdown).toContainText('All Types');
    });
  });

  // =========================================================================
  // 4. Date Range Picker
  // =========================================================================
  test.describe('4. Date Range Controls', () => {

    test('APT-08: Should open date range calendar popover on date range button click', async () => {
      await expect(appointmentsPage.dateRangeButton).toBeVisible();
      await appointmentsPage.dateRangeButton.click();

      await expect(appointmentsPage.dateRangePopover).toBeVisible();
      await expect(appointmentsPage.btnTwoWeeks).toBeVisible();
      await expect(appointmentsPage.btnOneMonth).toBeVisible();
      await expect(appointmentsPage.btnAllTime).toBeVisible();

      // Dismiss popover
      await appointmentsPage.page.keyboard.press('Escape');
    });

    test('APT-09: Should allow selecting preset date range shortcut (e.g. All time)', async () => {
      await appointmentsPage.dateRangeButton.click();
      await expect(appointmentsPage.btnAllTime).toBeVisible();

      await appointmentsPage.btnAllTime.click();
      await appointmentsPage.page.waitForTimeout(500);

      // Verify table or empty state updates
      await expect(appointmentsPage.table).toBeVisible();
    });
  });

  // =========================================================================
  // 5. Appointments Data Table & Pagination
  // =========================================================================
  test.describe('5. Data Table & Pagination', () => {

    test('APT-10: Should render table with all standard appointment headers', async () => {
      await expect(appointmentsPage.table).toBeVisible();

      const expectedHeaders = ['Patient', 'Contact No.', 'Email', 'Type', 'Doctor', 'Date & Time', 'Status'];
      for (const header of expectedHeaders) {
        await expect(appointmentsPage.tableHeaders.filter({ hasText: header }).first()).toBeVisible();
      }
    });

    test('APT-11: Should render table empty state message or rows', async () => {
      await expect(appointmentsPage.table).toBeVisible();
      // Verify empty state message or appointment data rows
      const rowCount = await appointmentsPage.tableRows.count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('APT-12: Should render pagination controls with page indicators', async () => {
      await expect(appointmentsPage.btnPrevious).toBeVisible();
      await expect(appointmentsPage.pageIndicator.first()).toBeVisible();
      await expect(appointmentsPage.btnNext).toBeVisible();
    });
  });
});
