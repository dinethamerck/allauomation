// @ts-check

/**
 * Page Object Model for the Amerck Care Telemedicine & Virtual Consultations module
 * Covers both the Session Kanban Board (/admin/telemedicine) and Report Reviews (/admin/telemedicine-reports)
 */
class TelemedicinePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Header & Controls
    this.heading = page.locator('h1, h2, h3, div').filter({ hasText: /^Telemedicine$/ }).first();
    this.dateInput = page.locator('input.flatpickr-input, input[placeholder="Required"]').first();

    // Toggle Switches
    this.switches = page.locator('button[role="switch"]');
    this.onlineSwitch = this.switches.first();
    this.onlineStatusLabel = page.locator('label').filter({ hasText: /^(Online|Offline)$/ }).first();

    this.soundSwitch = this.switches.nth(1);
    this.soundStatusLabel = page.locator('label').filter({ hasText: /^Sound (ON|OFF)$/ }).first();

    // Kanban Workflow Columns
    this.columnPending = page.locator('text=Pending').first();
    this.columnWaiting = page.locator('text=Waiting').first();
    this.columnAssigned = page.locator('text=Assigned').first();
    this.columnInConsultation = page.locator('text=In Consultation').first();
    this.columnCompleted = page.locator('text=Completed').first();

    this.noSessionsIndicators = page.locator('text=No sessions');

    // Report Reviews Page Controls (/admin/telemedicine-reports)
    this.reportsHeading = page.locator('h1, h2, h3, div').filter({ hasText: /^Reports$|^Report Reviews$/ }).first();
    this.uploadReportButton = page.locator('button:has-text("Upload Report")').first();
    this.reportsTable = page.locator('table');
    this.reportsTableHeaders = page.locator('table thead th, table th');
    this.reportsTableRows = page.locator('table tbody tr');

    // Upload Report Modal
    this.uploadDialog = page.locator('div[role="dialog"]');
    this.uploadDialogTitle = this.uploadDialog.locator('text=Enter patient\'s unique identifier');
    this.uploadPatientQueryInput = this.uploadDialog.locator('input[name="query"], input[placeholder*="ID Card"]');
    this.uploadSearchButton = this.uploadDialog.locator('button:has-text("Search")');
    this.uploadCloseButton = this.uploadDialog.locator('button:has-text("Close"), button.absolute').first();

    // Sidebar navigation links
    this.sidebarTelemedicineLink = page.locator('nav a[href*="/admin/telemedicine"]:not([href*="reports"]), aside a[href*="/admin/telemedicine"]:not([href*="reports"]), a:has-text("Telemedicine")').first();
    this.sidebarReportReviewsLink = page.locator('a[href*="/admin/telemedicine-reports"], a:has-text("Report Reviews")').first();
    this.sidebarCareViewLink = page.locator('a[href*="/admin/prescription"]').first();
    this.sidebarPatientsLink = page.locator('a[href*="/admin/patients"]').first();
    this.sidebarAdmissionsLink = page.locator('a[href*="/admin/admissions"]').first();
  }

  /**
   * Navigates to Telemedicine Kanban board and waits for initial data load
   */
  async goto() {
    await this.page.goto('/admin/telemedicine', { waitUntil: 'domcontentloaded' });
    await this.page.locator('text=Loading your profile').waitFor({ state: 'detached', timeout: 25000 }).catch(() => null);
    await this.heading.waitFor({ state: 'visible', timeout: 20000 });
  }

  /**
   * Navigates to Telemedicine Report Reviews page (/admin/telemedicine-reports)
   */
  async gotoReports() {
    await this.page.goto('/admin/telemedicine-reports', { waitUntil: 'domcontentloaded' });
    await this.page.locator('text=Loading your profile').waitFor({ state: 'detached', timeout: 25000 }).catch(() => null);
    await this.reportsHeading.waitFor({ state: 'visible', timeout: 20000 });
  }

  /**
   * Retrieves the current provider online/offline status text
   * @returns {Promise<string>} e.g. "Online" or "Offline"
   */
  async getOnlineStatus() {
    return (await this.onlineStatusLabel.innerText()).trim();
  }

  /**
   * Toggles the provider online/offline switch and awaits API synchronization
   */
  async toggleOnlineStatus() {
    const postPromise = this.page.waitForResponse(
      resp => resp.url().includes('/telemed/admin/online-status') && resp.request().method() === 'POST' && resp.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    await this.onlineSwitch.click();
    await postPromise;
  }

  /**
   * Sets provider online status to a desired state (true = Online, false = Offline)
   * @param {boolean} targetState
   */
  async setOnlineStatus(targetState) {
    const current = await this.getOnlineStatus();
    const isCurrentlyOnline = current.toLowerCase().includes('online');

    if (isCurrentlyOnline !== targetState) {
      await this.toggleOnlineStatus();
    }
  }

  /**
   * Retrieves the current sound notification state text
   * @returns {Promise<string>} e.g. "Sound ON" or "Sound OFF"
   */
  async getSoundStatus() {
    return (await this.soundStatusLabel.innerText()).trim();
  }

  /**
   * Toggles the audio notification sound switch
   */
  async toggleSound() {
    await this.soundSwitch.click();
  }

  /**
   * Retrieves the current date value from the date picker
   * @returns {Promise<string>}
   */
  async getSelectedDate() {
    return await this.dateInput.inputValue();
  }

  /**
   * Selects a date string (YYYY-MM-DD) and waits for session columns refresh
   * @param {string} dateString
   */
  async setDate(dateString) {
    const sessionsPromise = this.page.waitForResponse(
      resp => resp.url().includes('/telemed/admin/sessions') && resp.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    await this.dateInput.fill(dateString);
    await sessionsPromise;
  }

  /**
   * Opens the Upload Report dialog from the Report Reviews page
   */
  async openUploadReportDialog() {
    await this.uploadReportButton.click();
    await this.uploadDialog.waitFor({ state: 'visible', timeout: 8000 });
  }

  /**
   * Closes the Upload Report dialog
   */
  async closeUploadReportDialog() {
    await this.uploadCloseButton.click();
    await this.uploadDialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => null);
  }
}

module.exports = { TelemedicinePage };
