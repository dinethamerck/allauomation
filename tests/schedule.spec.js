// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');
const { SchedulePage } = require('./pages/SchedulePage');

test.describe('AMERCK CARE — Schedule Module Test Suite (https://qa_care.amerck.com/admin/aesthetic-schedule)', () => {
  /** @type {LoginPage} */
  let loginPage;
  /** @type {SchedulePage} */
  let schedulePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    schedulePage = new SchedulePage(page);

    // 1. Perform login
    await loginPage.goto();
    await loginPage.login('parami', 'parami');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });

    // 2. Navigate to Schedule
    await schedulePage.goto();
  });

  // =========================================================================
  // 1. Navigation & Header Toolbar Verification
  // =========================================================================
  test.describe('1. Navigation & Page Header', () => {

    test('SCH-01: Should display Schedule page with correct URL and container', async ({ page }) => {
      expect(page.url()).toContain('/admin/aesthetic-schedule');
      await expect(schedulePage.btnMarkOffDay).toBeVisible();
    });

    test('SCH-02: Should render clinic selector, user profile, and Today button', async () => {
      await expect(schedulePage.btnToday).toBeVisible();
      await expect(schedulePage.userAvatarButton).toBeVisible();
      await expect(schedulePage.statusDropdown).toBeVisible();
    });
  });

  // =========================================================================
  // 2. Date Controls & Calendar Picker
  // =========================================================================
  test.describe('2. Date Controls & Calendar Picker', () => {

    test('SCH-03: Should render date input and interact with Today button', async ({ page }) => {
      await expect(schedulePage.datePickerInput).toBeVisible();
      await schedulePage.btnToday.click();
      await page.waitForTimeout(500);
      await expect(schedulePage.datePickerInput).toBeVisible();
    });

    test('SCH-04: Should open calendar dropdown when clicking date picker input', async () => {
      await schedulePage.datePickerInput.click();
      await expect(schedulePage.flatpickrCalendar.first()).toBeVisible();
    });
  });

  // =========================================================================
  // 3. Status Filters & Dropdowns
  // =========================================================================
  test.describe('3. Status Filter Dropdown', () => {

    test('SCH-05: Should open Status dropdown and display status options', async ({ page }) => {
      await schedulePage.statusDropdown.click();
      await schedulePage.listbox.waitFor({ state: 'visible' });

      // Verify key status options are present in the list
      const expectedStatuses = ['Scheduled', 'Confirmed', 'Waiting', 'Completed', 'Cancelled'];
      for (const status of expectedStatuses) {
        await expect(page.locator(`[role="option"]:has-text("${status}")`).first()).toBeVisible();
      }

      // Close dropdown
      await page.keyboard.press('Escape');
    });

    test('SCH-06: Should allow selecting a specific status filter (e.g. Scheduled)', async () => {
      await schedulePage.selectStatus('Scheduled');
      await expect(schedulePage.statusDropdown).toContainText('Scheduled');

      // Reset back to All Status
      await schedulePage.selectStatus('All Status');
      await expect(schedulePage.statusDropdown).toContainText('All Status');
    });
  });

  // =========================================================================
  // 4. Mark Off-Day Dialog & Workflows
  // =========================================================================
  test.describe('4. Mark Off-Day Dialog & Form', () => {

    test('SCH-07: Should open Mark Off-Day dialog with all required elements', async () => {
      await schedulePage.openMarkOffDayDialog();

      await expect(schedulePage.offDayDialog).toBeVisible();
      await expect(schedulePage.dialogTitle).toBeVisible();
      await expect(schedulePage.btnSingleDay).toBeVisible();
      await expect(schedulePage.btnMarkWeek).toBeVisible();
      await expect(schedulePage.btnHoliday).toBeVisible();
      await expect(schedulePage.btnPoyaDay).toBeVisible();
      await expect(schedulePage.btnOther).toBeVisible();
      await expect(schedulePage.offDayNameInput).toBeVisible();
      await expect(schedulePage.btnFullDay).toBeVisible();
      await expect(schedulePage.btnSpecificTime).toBeVisible();
      await expect(schedulePage.offDayNotesTextarea).toBeVisible();
      await expect(schedulePage.btnDialogCancel).toBeVisible();
      await expect(schedulePage.btnDialogSubmit).toBeVisible();

      await schedulePage.closeMarkOffDayDialog();
    });

    test('SCH-08: Should toggle between duration modes (Single Day vs Mark Week)', async () => {
      await schedulePage.openMarkOffDayDialog();

      // Click Mark Week
      await schedulePage.btnMarkWeek.click();
      // Click Single Day back
      await schedulePage.btnSingleDay.click();

      await schedulePage.closeMarkOffDayDialog();
    });

    test('SCH-09: Should allow selecting off-day category types (Holiday, Poya Day, Other)', async () => {
      await schedulePage.openMarkOffDayDialog();

      await schedulePage.btnPoyaDay.click();
      await schedulePage.btnOther.click();
      await schedulePage.btnHoliday.click();

      await schedulePage.closeMarkOffDayDialog();
    });

    test('SCH-10: Should allow filling off-day name, notes and closing via Cancel', async () => {
      await schedulePage.openMarkOffDayDialog();

      await schedulePage.offDayNameInput.fill('Annual Medical Conference');
      await schedulePage.offDayNotesTextarea.fill('Clinic closed for practitioners annual conference');

      await expect(schedulePage.offDayNameInput).toHaveValue('Annual Medical Conference');
      await expect(schedulePage.offDayNotesTextarea).toHaveValue('Clinic closed for practitioners annual conference');

      // Click Cancel to dismiss
      await schedulePage.btnDialogCancel.click();
      await expect(schedulePage.offDayDialog).not.toBeVisible();
    });

    test('SCH-11: Should close Mark Off-Day dialog when pressing Escape key', async ({ page }) => {
      await schedulePage.openMarkOffDayDialog();
      await expect(schedulePage.offDayDialog).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(schedulePage.offDayDialog).not.toBeVisible();
    });
  });

  // =========================================================================
  // 5. Doctor Schedule Grid & Layout
  // =========================================================================
  test.describe('5. Doctor Schedule Grid & Layout', () => {

    test('SCH-12: Should render schedule appointment view container and grid layout', async ({ page }) => {
      await expect(schedulePage.scheduleContainer).toBeVisible();
      const buttonsOnPage = await page.locator('button').count();
      expect(buttonsOnPage).toBeGreaterThan(0);
    });
  });
});
