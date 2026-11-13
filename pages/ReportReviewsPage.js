// @ts-check

/**
 * Page Object Model for the Amerck Care Telemedicine Report Reviews module
 * Covers both the main Report Reviews table (/admin/telemedicine-reports)
 * and the patient report review detail page (/admin/telemedicine-reports/patients/[id])
 */
class ReportReviewsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // =========================================================================
    // 1. Report Reviews Directory Page (/admin/telemedicine-reports)
    // =========================================================================
    this.heading = page.locator('h1, h2, h3, div').filter({ hasText: /^Reports$|^Report Reviews$/ }).first();
    this.uploadReportButton = page.locator('button:has-text("Upload Report")').first();

    // Directory Table
    this.table = page.locator('table');
    this.tableHeaders = page.locator('table thead th, table th');
    this.tableRows = page.locator('table tbody tr');
    this.emptyStateMessage = page.locator('text=No reports found, text=No records found, text=No data');

    // Pagination Controls
    this.paginationIndicator = page.locator('text=/\\d+\\/\\d+/').first();
    this.previousButton = page.locator('button:has-text("Previous"), a:has-text("Previous")').first();
    this.nextButton = page.locator('button:has-text("Next"), a:has-text("Next")').first();

    // =========================================================================
    // 2. Upload Report Patient Search Modal Dialog
    // =========================================================================
    this.uploadDialog = page.locator('div[role="dialog"]');
    this.uploadDialogTitle = this.uploadDialog.locator('text=Enter patient\'s unique identifier');
    this.patientQueryInput = this.uploadDialog.locator('input[name="query"], input[placeholder*="ID Card"]');
    this.searchPatientButton = this.uploadDialog.locator('button:has-text("Search")');
    this.closeDialogButton = this.uploadDialog.locator('button:has-text("Close")').first();
    this.validationErrorMessage = this.uploadDialog.locator('text=Please enter a valid Sri Lankan NIC, or Mobile Number');

    // Search Results Inside Modal
    this.resultsHeading = this.uploadDialog.locator('text=Select Patient to add to your List');
    this.patientResultCards = this.uploadDialog.locator('.border.rounded-lg, div:has(> button:has-text("Add"))');
    this.firstPatientAddButton = this.uploadDialog.locator('button:has-text("Add")').first();
    this.createNewPatientButton = this.uploadDialog.locator('button:has-text("Create New Patient"), a:has-text("Create New Patient")');

    // =========================================================================
    // 3. Patient Report Review Detail Page (/admin/telemedicine-reports/patients/[id])
    // =========================================================================
    this.backLink = page.locator('a:has-text("Back")').first();
    this.detailPatientName = page.locator('h1, h2, h3, div.text-xl, div.font-semibold').filter({ hasText: /^[A-Z][a-z]+ [A-Z]/ }).first();
    this.reportIdBadge = page.locator('text=/Report ID:\\s*RR-[a-zA-Z0-9]+|RR-[a-zA-Z0-9]+/');
    this.statusBadge = page.locator('text=/Status:\\s*(DRAFT|PENDING|COMPLETED)|^(DRAFT|PENDING|COMPLETED)$/i').first();
    this.detailAddReportButton = page.locator('button:has-text("Add Report")').first();
    this.sendToPatientButton = page.locator('button:has-text("Send to Patient")').first();
    this.reviewsSidebarList = page.locator('text=Reviews').locator('..');

    // File Upload Dialog in Detail Page
    this.fileUploadDialog = page.locator('div[role="dialog"]:has-text("Add Report")');
    this.fileInput = this.fileUploadDialog.locator('input[type="file"]');
    this.selectFilesButton = this.fileUploadDialog.locator('button:has-text("Select files")');
    this.confirmUploadsButton = this.fileUploadDialog.locator('button:has-text("Confirm Uploads")');
    this.closeFileUploadButton = this.fileUploadDialog.locator('button:has-text("Close")').first();
    this.fileConstraintsNotice = this.fileUploadDialog.locator('text=Max 10MB per file. Supported: .pdf, .txt, images');

    // =========================================================================
    // 4. Sidebar Navigation Links
    // =========================================================================
    this.sidebarTelemedicineLink = page.locator('nav a[href*="/admin/telemedicine"]:not([href*="reports"]), aside a[href*="/admin/telemedicine"]:not([href*="reports"]), a:has-text("Telemedicine")').first();
    this.sidebarReportReviewsLink = page.locator('a[href*="/admin/telemedicine-reports"], a:has-text("Report Reviews")').first();
    this.sidebarCareViewLink = page.locator('a[href*="/admin/prescription"]').first();
    this.sidebarAdmissionsLink = page.locator('a[href*="/admin/admissions"]').first();
  }

  /**
   * Navigates to the Report Reviews directory page
   */
  async goto() {
    await this.page.goto('/admin/telemedicine-reports', { waitUntil: 'domcontentloaded' });
    await this.page.locator('text=Loading your profile').waitFor({ state: 'detached', timeout: 25000 }).catch(() => null);
    await this.heading.waitFor({ state: 'visible', timeout: 20000 });
  }

  /**
   * Navigates directly to a patient's report review detail view
   * @param {string|number} patientId
   * @param {string|number} [reportId]
   */
  async gotoPatientReport(patientId, reportId) {
    const url = reportId
      ? `/admin/telemedicine-reports/patients/${patientId}?reportId=${reportId}`
      : `/admin/telemedicine-reports/patients/${patientId}`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.locator('text=Loading your profile').waitFor({ state: 'detached', timeout: 25000 }).catch(() => null);
    await this.backLink.waitFor({ state: 'visible', timeout: 20000 });
  }

  /**
   * Opens the Upload Report patient search modal
   */
  async openUploadDialog() {
    await this.uploadReportButton.click();
    await this.uploadDialog.waitFor({ state: 'visible', timeout: 8000 });
    await this.uploadDialogTitle.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Closes the Upload Report patient search modal
   */
  async closeUploadDialog() {
    await this.closeDialogButton.click();
    await this.uploadDialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => null);
  }

  /**
   * Enters a patient identifier query and triggers search
   * @param {string} query
   */
  async searchPatient(query) {
    await this.patientQueryInput.fill(query);
    const searchPromise = this.page.waitForResponse(
      res => res.url().includes('getUniqueIdentifyPatients'),
      { timeout: 10000 }
    ).catch(() => null);

    await this.searchPatientButton.click();
    await searchPromise;
    await this.page.waitForTimeout(500);
  }

  /**
   * Clicks Add button on the first matched patient in search results
   */
  async selectFirstPatient() {
    const addPromise = this.page.waitForResponse(
      res => res.url().includes('addPatientsForLocal'),
      { timeout: 10000 }
    ).catch(() => null);

    await this.firstPatientAddButton.click();
    await addPromise;
    await this.page.waitForURL(url => url.pathname.includes('/admin/telemedicine-reports/patients/'), { timeout: 15000 });
  }

  /**
   * Opens the file upload modal on the patient review detail page
   */
  async openFileUploadModal() {
    await this.detailAddReportButton.click();
    await this.fileUploadDialog.waitFor({ state: 'visible', timeout: 8000 });
  }

  /**
   * Closes the file upload modal on the patient review detail page
   */
  async closeFileUploadModal() {
    await this.closeFileUploadButton.click();
    await this.fileUploadDialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => null);
  }
}

module.exports = { ReportReviewsPage };
