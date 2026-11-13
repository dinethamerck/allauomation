// @ts-check

/**
 * Page Object Model for AMERCK CARE Schedule Module
 * Target: https://qa_care.amerck.com/admin/aesthetic-schedule
 */
class SchedulePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Navigation
    this.navScheduleLink = page.locator('a[href="/admin/aesthetic-schedule"]:has-text("Schedule")');
    this.navAppointmentsLink = page.locator('a[href="/admin/aesthetic-appointments"]:has-text("Appointments")');

    // Header & Clinic Controls
    this.clinicButton = page.locator('button:has-text("Amaran Aesthetic Clinic")').first();
    this.userAvatarButton = page.locator('button:has-text("PG")');
    this.btnToday = page.getByRole('button', { name: 'Today', exact: true });

    // Date Picker Inputs & Calendar
    this.datePickerInput = page.locator('input.flatpickr-input, input[placeholder="Required"]').first();
    this.flatpickrCalendar = page.locator('.flatpickr-calendar');

    // Filters (Comboboxes)
    this.statusDropdown = page.locator('button[role="combobox"]').filter({
      hasText: /Status|Scheduled|Confirmed|Waiting|Engaged|Completed|Cancelled|No Show|Not Reachable|Deleted/
    }).first();
    this.typeDropdown = page.locator('button[role="combobox"]').filter({
      hasText: /Types/
    }).first();
    this.listbox = page.locator('[role="listbox"]');

    // Mark Off-Day Button & Dialog
    this.btnMarkOffDay = page.getByRole('button', { name: /Mark Off-Day/i });
    this.offDayDialog = page.locator('[role="dialog"]');
    this.dialogTitle = this.offDayDialog.getByRole('heading', { name: 'Mark Off-Day' });
    this.btnSingleDay = this.offDayDialog.getByRole('button', { name: 'Single Day' });
    this.btnMarkWeek = this.offDayDialog.getByRole('button', { name: 'Mark Week' });
    this.btnHoliday = this.offDayDialog.getByRole('button', { name: 'Holiday' });
    this.btnPoyaDay = this.offDayDialog.getByRole('button', { name: 'Poya Day' });
    this.btnOther = this.offDayDialog.getByRole('button', { name: 'Other' });
    this.offDayNameInput = this.offDayDialog.locator('input[placeholder*="Christmas Day"], input[type="text"]').first();
    this.btnFullDay = this.offDayDialog.getByRole('button', { name: 'Full Day' });
    this.btnSpecificTime = this.offDayDialog.getByRole('button', { name: 'Specific Time' });
    this.offDayNotesTextarea = this.offDayDialog.locator('textarea');
    this.btnDialogCancel = this.offDayDialog.getByRole('button', { name: 'Cancel' });
    this.btnDialogSubmit = this.offDayDialog.getByRole('button', { name: 'Mark Off-Day', exact: true });
    this.btnDialogClose = this.offDayDialog.getByRole('button', { name: 'Close' });

    // Schedule container
    this.scheduleContainer = page.locator('main, .schedule-container, [role="main"]').first();
  }

  /**
   * Navigate directly to Schedule URL
   */
  async goto() {
    await this.page.goto('/admin/aesthetic-schedule', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.btnMarkOffDay.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Open the Mark Off-Day dialog
   */
  async openMarkOffDayDialog() {
    await this.btnMarkOffDay.click();
    await this.offDayDialog.waitFor({ state: 'visible' });
  }

  /**
   * Close the Mark Off-Day dialog via Cancel button
   */
  async closeMarkOffDayDialog() {
    await this.btnDialogCancel.click();
    await this.offDayDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Select a status from Status dropdown
   * @param {string} statusName
   */
  async selectStatus(statusName) {
    await this.statusDropdown.click();
    await this.listbox.waitFor({ state: 'visible', timeout: 10000 });
    const option = this.page.locator(`[role="option"]:has-text("${statusName}")`).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
    await this.listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

module.exports = { SchedulePage };
