// @ts-check

class SchedulePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // View switch buttons
    this.todayButton = page.locator('button:has-text("Today")').first();
    this.dayViewButton = page.locator('button[role="tab"]:has-text("Day")').first();
    this.weekViewButton = page.locator('button[role="tab"]:has-text("Week")').first();
    this.monthViewButton = page.locator('button[role="tab"]:has-text("Month")').first();
    this.allAppointmentsButton = page.locator('button:has-text("All Appointments")');

    // Action buttons
    this.addAppointmentButton = page.locator('button:has-text("Add")');

    // Calendar grid
    this.calendarGrid = page.locator('div.grid, [class*="calendar"]');
  }

  /**
   * Navigates to the schedule page
   */
  async goto() {
    await this.page.goto('/admin/schedule', { waitUntil: 'domcontentloaded' });
    await this.todayButton.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Switches calendar view (Day, Week, Month)
   * @param {'Day' | 'Week' | 'Month'} view
   */
  async switchView(view) {
    const viewButton = this.page.locator(`button[role="tab"]:has-text("${view}")`).first();
    await viewButton.waitFor({ state: 'visible' });
    await viewButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Clicks Today button
   */
  async clickToday() {
    await this.todayButton.waitFor({ state: 'visible' });
    await this.todayButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Clicks All Appointments button
   */
  async clickAllAppointments() {
    await this.allAppointmentsButton.waitFor({ state: 'visible' });
    await this.allAppointmentsButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Opens Add Appointment drawer/modal
   */
  async openAddAppointment() {
    await this.addAppointmentButton.first().waitFor({ state: 'visible' });
    await this.addAppointmentButton.first().click();
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { SchedulePage };
