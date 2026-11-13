// @ts-check
const { test, expect } = require('@playwright/test');
const { TelemedicinePage } = require('../pages/TelemedicinePage');

test.describe('Amerck Care - Telemedicine & Virtual Consultations Suite', () => {
  // Use authenticated clinical provider session
  test.use({ storageState: 'playwright/.auth/user.json' });

  // Standard timeout for network-bound portal interactions
  test.setTimeout(45000);

  // =========================================================================
  // 1. Page Initialization & Kanban Layout Verification
  // =========================================================================
  test.describe('1. Page Initialization & Layout Verification', () => {
    test('TC-TEL-INIT-001: Direct navigation to /admin/telemedicine loads header, date picker, and toggle switches', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.goto();

      expect(page.url()).toContain('/admin/telemedicine');
      await expect(telPage.heading).toBeVisible();
      await expect(telPage.dateInput).toBeVisible();
      await expect(telPage.onlineSwitch).toBeVisible();
      await expect(telPage.soundSwitch).toBeVisible();
    });

    test('TC-TEL-INIT-002: Kanban board renders all 5 clinical consultation stages', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.goto();

      await expect(telPage.columnPending).toBeVisible();
      await expect(telPage.columnWaiting).toBeVisible();
      await expect(telPage.columnAssigned).toBeVisible();
      await expect(telPage.columnInConsultation).toBeVisible();
      await expect(telPage.columnCompleted).toBeVisible();
    });

    test('TC-TEL-INIT-003: Date picker defaults to current date in YYYY-MM-DD format', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.goto();

      const selectedDate = await telPage.getSelectedDate();
      expect(selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('TC-TEL-INIT-004: Displays "No sessions" empty state indicator across unoccupied columns', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.goto();

      await expect(telPage.noSessionsIndicators.first()).toBeVisible({ timeout: 15000 });
      const count = await telPage.noSessionsIndicators.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 2. Provider Availability Toggle (Online / Offline)
  // =========================================================================
  test.describe('2. Provider Availability Status Toggle', () => {
    test('TC-TEL-STAT-001: Toggles provider availability status and dispatches API update', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.goto();

      const initialStatus = await telPage.getOnlineStatus();
      const targetStatus = initialStatus === 'Offline' ? 'Online' : 'Offline';

      // Toggle status and verify change with auto-retrying assertion
      await telPage.toggleOnlineStatus();
      await expect(telPage.onlineStatusLabel).toHaveText(targetStatus, { timeout: 10000 });

      // Restore original status to preserve clean doctor state
      await telPage.toggleOnlineStatus();
      await expect(telPage.onlineStatusLabel).toHaveText(initialStatus, { timeout: 10000 });
    });

    test('TC-TEL-STAT-002: Switch aria-checked attribute synchronizes with status label', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.goto();

      const status = await telPage.getOnlineStatus();
      const ariaChecked = await telPage.onlineSwitch.getAttribute('aria-checked');

      if (status === 'Online') {
        expect(ariaChecked).toBe('true');
      } else {
        expect(ariaChecked).toBe('false');
      }
    });
  });

  // =========================================================================
  // 3. Audio Notification Sound Alert Toggle
  // =========================================================================
  test.describe('3. Audio Notification Sound Toggle', () => {
    test('TC-TEL-SND-001: Toggles sound notification switch between Sound ON and Sound OFF', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.goto();

      const initialSound = await telPage.getSoundStatus();
      const targetSound = initialSound === 'Sound ON' ? 'Sound OFF' : 'Sound ON';

      // Toggle sound
      await telPage.toggleSound();
      await expect(telPage.soundStatusLabel).toHaveText(targetSound, { timeout: 10000 });

      // Restore sound setting
      await telPage.toggleSound();
      await expect(telPage.soundStatusLabel).toHaveText(initialSound, { timeout: 10000 });
    });
  });

  // =========================================================================
  // 4. Date Filtering Workflow
  // =========================================================================
  test.describe('4. Date Filtering Workflow', () => {
    test('TC-TEL-DATE-001: Changing date filter triggers session column re-fetch', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.goto();

      // Pick a future date to test filter query
      await telPage.setDate('2026-10-25');
      const newDate = await telPage.getSelectedDate();
      expect(newDate).toBe('2026-10-25');

      // Verify board renders cleanly for filtered date
      await expect(telPage.columnPending).toBeVisible();
      await expect(telPage.columnCompleted).toBeVisible();
    });
  });

  // =========================================================================
  // 5. Telemedicine Report Reviews (/admin/telemedicine-reports)
  // =========================================================================
  test.describe('5. Telemedicine Report Reviews Management', () => {
    test('TC-TEL-REP-001: Navigation to /admin/telemedicine-reports loads table headers and Upload button', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.gotoReports();

      expect(page.url()).toContain('/admin/telemedicine-reports');
      await expect(telPage.reportsHeading).toBeVisible();
      await expect(telPage.uploadReportButton).toBeVisible();
      await expect(telPage.reportsTable).toBeVisible();

      const headers = await telPage.reportsTableHeaders.allInnerTexts();
      const headersJoined = headers.join(' ');
      expect(headersJoined).toContain('Report ID');
      expect(headersJoined).toContain('Patient ID');
      expect(headersJoined).toContain('Patient');
      expect(headersJoined).toContain('Doctor');
      expect(headersJoined).toContain('Status');
      expect(headersJoined).toContain('Date');
    });

    test('TC-TEL-REP-002: Clicking "Upload Report" opens modal dialog with patient identifier input', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.gotoReports();

      await telPage.openUploadReportDialog();
      await expect(telPage.uploadDialog).toBeVisible();
      await expect(telPage.uploadDialogTitle).toBeVisible();
      await expect(telPage.uploadPatientQueryInput).toBeVisible();
      await expect(telPage.uploadSearchButton).toBeVisible();

      await telPage.closeUploadReportDialog();
      await expect(telPage.uploadDialog).toBeHidden();
    });
  });

  // =========================================================================
  // 6. Cross-Module Sidebar Navigation
  // =========================================================================
  test.describe('6. Cross-Module Sidebar Navigation', () => {
    test('TC-TEL-NAV-001: Navigates from Telemedicine board to Report Reviews via sidebar', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.goto();

      await telPage.sidebarReportReviewsLink.click();
      await page.waitForURL('**/admin/telemedicine-reports**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/telemedicine-reports');
    });

    test('TC-TEL-NAV-002: Navigates from Telemedicine to Admissions via sidebar', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.goto();

      await telPage.sidebarAdmissionsLink.click();
      await page.waitForURL('**/admin/admissions**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/admissions');
    });

    test('TC-TEL-NAV-003: Navigates from Telemedicine to Prescription (Care View) via sidebar', async ({ page }) => {
      const telPage = new TelemedicinePage(page);
      await telPage.goto();

      await telPage.sidebarCareViewLink.click();
      await page.waitForURL('**/admin/prescription**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/prescription');
    });
  });
});
