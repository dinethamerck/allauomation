// @ts-check

/**
 * Page Object Model for AMERCK CARE Appointments Module
 * Target: https://qa_care.amerck.com/admin/aesthetic-appointments
 */
class AppointmentsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Navigation & Heading
    this.navAppointmentsLink = page.locator('a[href="/admin/aesthetic-appointments"]:has-text("Appointments")');
    this.pageHeading = page.locator('h6:has-text("All Appointments")');

    // Top Controls
    this.clinicButton = page.locator('button:has-text("Amaran Aesthetic Clinic")').first();
    this.userAvatarButton = page.locator('button:has-text("PG")');

    // KPI Summary Badges
    this.kpiScheduled = page.locator('text=/Scheduled:\\s*\\d+/i').first();
    this.kpiConfirmed = page.locator('text=/Confirmed:\\s*\\d+/i').first();
    this.kpiWaiting = page.locator('text=/Waiting:\\s*\\d+/i').first();
    this.kpiEngaged = page.locator('text=/Engaged:\\s*\\d+/i').first();
    this.kpiCompleted = page.locator('text=/Completed:\\s*\\d+/i').first();
    this.kpiCancelled = page.locator('text=/Cancelled:\\s*\\d+/i').first();
    this.kpiNoShow = page.locator('text=/No Show:\\s*\\d+/i').first();
    this.kpiNotReachable = page.locator('text=/Not Reachable:\\s*\\d+/i').first();
    this.kpiDeleted = page.locator('text=/Deleted:\\s*\\d+/i').first();

    // Search and Filter Elements
    this.searchInput = page.locator('input[placeholder*="Search patient"]').first();
    this.statusFilterDropdown = page.locator('button[role="combobox"]').filter({
      hasText: /^(All|Scheduled|Confirmed|Waiting|Engaged|Completed|Cancelled|No Show|Not Reachable|Deleted)$/
    }).first();
    this.typeFilterDropdown = page.locator('button[role="combobox"]').filter({
      hasText: /Types/i
    }).first();
    this.listbox = page.locator('[role="listbox"]');

    // Date Range Picker
    this.dateRangeButton = page.locator('button').filter({ hasText: /\d{4}/ }).first();
    this.dateRangePopover = page.locator('[role="dialog"], [data-radix-popper-content-wrapper]').first();
    this.btnTwoWeeks = page.locator('button:has-text("2 weeks")');
    this.btnOneMonth = page.locator('button:has-text("One month")');
    this.btnAllTime = page.locator('button:has-text("All time")');

    // Table & Columns
    this.table = page.locator('main table, table.caption-bottom').first();
    this.tableHeaders = this.table.locator('th');
    this.tableRows = this.table.locator('tbody tr');
    this.emptyStateMessage = page.locator('text="No appointments found for the selected criteria"');

    // Pagination
    this.btnPrevious = page.locator('a[aria-label="Go to previous page"], a:has-text("Previous")').first();
    this.pageIndicator = page.locator('text=/\\d+\\/\\d+/').first();
    this.btnNext = page.locator('a[aria-label="Go to next page"], a:has-text("Next")').first();
  }

  /**
   * Navigate directly to Appointments URL
   */
  async goto() {
    await this.page.goto('/admin/aesthetic-appointments', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.searchInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Select a status from Status filter dropdown
   * @param {string} statusName
   */
  async selectStatus(statusName) {
    await this.statusFilterDropdown.click();
    await this.listbox.waitFor({ state: 'visible', timeout: 10000 });
    const option = this.page.locator(`[role="option"]:has-text("${statusName}")`).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
    await this.listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

module.exports = { AppointmentsPage };
