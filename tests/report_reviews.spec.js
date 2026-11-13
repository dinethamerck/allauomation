// @ts-check
const { test, expect } = require('@playwright/test');
const { ReportReviewsPage } = require('../pages/ReportReviewsPage');

test.describe('Amerck Care - Telemedicine Report Reviews Suite', () => {
  // Use authenticated clinical provider session
  test.use({ storageState: 'playwright/.auth/user.json' });

  // Standard timeout for network-bound portal interactions
  test.setTimeout(45000);

  // =========================================================================
  // 1. Directory Page Initialization & Layout Verification
  // =========================================================================
  test.describe('1. Directory Page Initialization & Layout Verification', () => {
    test('TC-RR-INIT-001: Direct navigation to /admin/telemedicine-reports loads header, Upload button, and table', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.goto();

      expect(page.url()).toContain('/admin/telemedicine-reports');
      await expect(reportsPage.heading).toBeVisible();
      await expect(reportsPage.uploadReportButton).toBeVisible();
      await expect(reportsPage.table).toBeVisible();
    });

    test('TC-RR-INIT-002: Directory table renders standard clinical report review column headers', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.goto();

      const headers = await reportsPage.tableHeaders.allInnerTexts();
      const headersJoined = headers.join(' ');
      expect(headersJoined).toContain('Report ID');
      expect(headersJoined).toContain('Patient ID');
      expect(headersJoined).toContain('Patient');
      expect(headersJoined).toContain('Doctor');
      expect(headersJoined).toContain('Status');
      expect(headersJoined).toContain('Date');
    });

    test('TC-RR-INIT-003: Pagination controls and page indicator are rendered in table footer', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.goto();

      await expect(reportsPage.previousButton).toBeVisible();
      await expect(reportsPage.nextButton).toBeVisible();
      await expect(reportsPage.paginationIndicator).toBeVisible();
      const indicatorText = await reportsPage.paginationIndicator.innerText();
      expect(indicatorText).toMatch(/^\d+\/\d+$/);
    });
  });

  // =========================================================================
  // 2. Upload Report Patient Search Modal & Validation
  // =========================================================================
  test.describe('2. Upload Report Patient Search Modal & Validation', () => {
    test('TC-RR-MOD-001: Clicking "Upload Report" opens patient search dialog', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.goto();

      await reportsPage.openUploadDialog();
      await expect(reportsPage.uploadDialog).toBeVisible();
      await expect(reportsPage.uploadDialogTitle).toBeVisible();
      await expect(reportsPage.patientQueryInput).toBeVisible();
      await expect(reportsPage.searchPatientButton).toBeVisible();
    });

    test('TC-RR-MOD-002: Dismisses modal dialog cleanly when clicking Close button', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.goto();

      await reportsPage.openUploadDialog();
      await reportsPage.closeUploadDialog();
      await expect(reportsPage.uploadDialog).toBeHidden();
    });

    test('TC-RR-VAL-001: Displays validation message when query is not a valid NIC or Mobile Number', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.goto();

      await reportsPage.openUploadDialog();
      await reportsPage.patientQueryInput.fill('invalid_input_123');
      await reportsPage.searchPatientButton.click();

      await expect(reportsPage.validationErrorMessage).toBeVisible({ timeout: 5000 });
      await reportsPage.closeUploadDialog();
    });

    test('TC-RR-SRCH-001: Searching with valid 10-digit mobile number returns matching patient results with Add button', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.goto();

      await reportsPage.openUploadDialog();
      await reportsPage.searchPatient('0771234567');

      await expect(reportsPage.resultsHeading).toBeVisible({ timeout: 10000 });
      await expect(reportsPage.firstPatientAddButton).toBeVisible();
      await reportsPage.closeUploadDialog();
    });

    test('TC-RR-SRCH-002: "Create New Patient" option navigates to patient registration with query parameter', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.goto();

      await reportsPage.openUploadDialog();
      await reportsPage.searchPatient('0771234567');

      await expect(reportsPage.createNewPatientButton).toBeVisible();
      await reportsPage.createNewPatientButton.click();
      await page.waitForURL(url => url.pathname.includes('/patients/new'), { timeout: 15000 });

      expect(page.url()).toContain('/admin/telemedicine-reports/patients/new');
      expect(page.url()).toContain('query=0771234567');
    });
  });

  // =========================================================================
  // 3. Patient Report Review Detail View & File Upload Modal
  // =========================================================================
  test.describe('3. Patient Report Review Detail View & Workflow', () => {
    test('TC-RR-DET-001: Direct navigation to patient report review loads patient header, Report ID, and Status', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      // Open existing patient review session
      await reportsPage.gotoPatientReport('332977');

      expect(page.url()).toContain('/admin/telemedicine-reports/patients/332977');
      await expect(reportsPage.backLink).toBeVisible();
      await expect(reportsPage.reportIdBadge.first()).toBeVisible({ timeout: 15000 });
      await expect(reportsPage.detailAddReportButton).toBeVisible();
      await expect(reportsPage.sendToPatientButton).toBeVisible();
    });

    test('TC-RR-FILE-001: "Add Report" button opens file upload modal with file constraints info', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.gotoPatientReport('332977');

      await reportsPage.openFileUploadModal();
      await expect(reportsPage.fileUploadDialog).toBeVisible();
      await expect(reportsPage.fileConstraintsNotice).toBeVisible();
      await expect(reportsPage.selectFilesButton).toBeVisible();
      await expect(reportsPage.confirmUploadsButton).toBeVisible();

      await reportsPage.closeFileUploadModal();
      await expect(reportsPage.fileUploadDialog).toBeHidden();
    });

    test('TC-RR-NAV-001: Clicking "Back" on patient report view returns to Report Reviews directory', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.gotoPatientReport('332977');

      await reportsPage.backLink.click();
      await page.waitForURL(url => url.pathname === '/admin/telemedicine-reports', { timeout: 15000 });
      expect(page.url()).toContain('/admin/telemedicine-reports');
      await expect(reportsPage.uploadReportButton).toBeVisible();
    });
  });

  // =========================================================================
  // 4. Cross-Module Sidebar Navigation
  // =========================================================================
  test.describe('4. Cross-Module Sidebar Navigation', () => {
    test('TC-RR-NAV-002: Navigates from Report Reviews to Telemedicine Kanban board via sidebar', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.goto();

      await reportsPage.sidebarTelemedicineLink.click();
      await page.waitForURL(url => url.pathname === '/admin/telemedicine', { timeout: 15000 });
      expect(page.url()).toContain('/admin/telemedicine');
    });

    test('TC-RR-NAV-003: Navigates from Report Reviews to Prescription (Care View) via sidebar', async ({ page }) => {
      const reportsPage = new ReportReviewsPage(page);
      await reportsPage.goto();

      await reportsPage.sidebarCareViewLink.click();
      await page.waitForURL(url => url.pathname === '/admin/prescription', { timeout: 15000 });
      expect(page.url()).toContain('/admin/prescription');
    });
  });
});
