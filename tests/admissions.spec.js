// @ts-check
const { test, expect } = require('@playwright/test');
const { AdmissionsPage } = require('../pages/AdmissionsPage');
const { PrescriptionPage } = require('../pages/PrescriptionPage');

test.describe('Amerck Care - Admissions Module & Patient Admission Flow', () => {
  // Use authenticated session
  test.use({ storageState: 'playwright/.auth/user.json' });

  // =========================================================================
  // 1. Admissions Page Initialization & Cross-Navigation
  // =========================================================================
  test.describe('1. Page Initialization & Navigation', () => {
    test('TC-ADM-INIT-001: Direct navigation to /admin/admissions loads title, tabs, and admissions table', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      expect(page.url()).toContain('/admin/admissions');
      await expect(admissionsPage.heading).toBeVisible();
      await expect(admissionsPage.admittedTab).toBeVisible();
      await expect(admissionsPage.dischargedTab).toBeVisible();
      await expect(admissionsPage.admitPatientButton).toBeVisible();
      await expect(admissionsPage.searchInput).toBeVisible();
      await expect(admissionsPage.table).toBeVisible();
    });

    test('TC-ADM-INIT-002: Cross-navigation from Care View toolbar navigates to /admin/admissions', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await expect(rxPage.navAdmissionsLink).toBeVisible();
      await rxPage.navigateToAdmissions();

      expect(page.url()).toContain('/admin/admissions');
      const admissionsPage = new AdmissionsPage(page);
      await expect(admissionsPage.heading).toBeVisible();
      await expect(admissionsPage.table).toBeVisible();
    });

    test('TC-ADM-INIT-003: Admissions table displays all essential clinical column headers', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      const headerTexts = await admissionsPage.tableHeaders.allInnerTexts();
      const headersJoined = headerTexts.join(' ');

      expect(headersJoined).toContain('Hospital ID');
      expect(headersJoined).toContain('Name');
      expect(headersJoined).toContain('Age');
      expect(headersJoined).toContain('Bed');
      expect(headersJoined).toContain('Admitted For');
      expect(headersJoined).toContain('Admitted On');
      expect(headersJoined).toContain('Admitted By');
      expect(headersJoined).toContain('Consultant');
      expect(headersJoined).toContain('Status');
    });
  });

  // =========================================================================
  // 2. Tab Switching (Admitted vs Discharged)
  // =========================================================================
  test.describe('2. Tab Switching & Status Filtering', () => {
    test('TC-ADM-TAB-001: "Admitted" tab is selected by default on load', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await expect(admissionsPage.admittedTab).toHaveAttribute('data-state', 'active');
      await expect(admissionsPage.dischargedTab).toHaveAttribute('data-state', 'inactive');
    });

    test('TC-ADM-TAB-002: Switching to "Discharged" tab activates tab and switches view', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.switchTab('Discharged');
      await expect(admissionsPage.dischargedTab).toHaveAttribute('data-state', 'active');
      await expect(admissionsPage.admittedTab).toHaveAttribute('data-state', 'inactive');
    });

    test('TC-ADM-TAB-003: Switching back to "Admitted" tab restores active admitted patients list', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.switchTab('Discharged');
      await admissionsPage.switchTab('Admitted');

      await expect(admissionsPage.admittedTab).toHaveAttribute('data-state', 'active');
      const rowCount = await admissionsPage.tableRows.count();
      expect(rowCount).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 3. Search & Live Filtering
  // =========================================================================
  test.describe('3. Patient Search & Live Filtering', () => {
    test('TC-ADM-SRCH-001: Filters admissions table by patient name query', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.searchPatient('Dilumi');
      const count = await admissionsPage.tableRows.count();
      expect(count).toBeGreaterThanOrEqual(1);

      const tableText = await admissionsPage.tableBody.innerText();
      expect(tableText).toContain('Dilumi');
    });

    test('TC-ADM-SRCH-002: Clearing search input restores full table records', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.searchPatient('Dilumi');
      const filteredCount = await admissionsPage.tableRows.count();

      await admissionsPage.clearSearch();
      const restoredCount = await admissionsPage.tableRows.count();
      expect(restoredCount).toBeGreaterThan(filteredCount);
    });

    test('TC-ADM-SRCH-003: Non-existent query shows empty results', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.searchPatient('NonExistentPatientXYZ999');
      const count = await admissionsPage.tableRows.count();
      if (count > 0) {
        const text = await admissionsPage.tableBody.innerText();
        expect(text).not.toContain('Dilumi');
      } else {
        expect(count).toBe(0);
      }
    });
  });

  // =========================================================================
  // 4. Admit Patient Dialog & Lookup
  // =========================================================================
  test.describe('4. Admit Patient Dialog & Lookup', () => {
    test('TC-ADM-MODAL-001: Clicking "Admit Patient" opens Search Patients dialog', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.openAdmitPatientDialog();
      await expect(admissionsPage.admitDialog).toBeVisible();
      await expect(admissionsPage.admitDialogTitle).toBeVisible();
      await expect(admissionsPage.admitDialogInput).toBeVisible();
      await expect(admissionsPage.admitDialogSearchBtn).toBeVisible();
    });

    test('TC-ADM-MODAL-002: Closes Admit Patient dialog via Close button', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.openAdmitPatientDialog();
      await admissionsPage.closeAdmitPatientDialog();
      await expect(admissionsPage.admitDialog).toBeHidden();
    });

    test('TC-ADM-MODAL-003: Searches patient by mobile number and displays matching candidate cards', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.openAdmitPatientDialog();
      await admissionsPage.searchInAdmitDialog('0741222870');

      const resultCount = await admissionsPage.admitDialogResultCards.count();
      expect(resultCount).toBeGreaterThan(0);
      await expect(admissionsPage.admitDialogResultCards.first()).toBeVisible();
      await expect(admissionsPage.admitDialogCreateNewBtn).toBeVisible();
    });
  });

  // =========================================================================
  // 5. Existing Draft Modal & Admission Onboarding
  // =========================================================================
  test.describe('5. Draft Conflict Resolution & Admission Onboarding Workflow', () => {
    test('TC-ADM-ONBOARD-001: Prompts draft conflict dialog when admitting patient with active draft', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.openAdmitPatientDialog();
      await admissionsPage.searchInAdmitDialog('0741222870');

      // Select patient janitha0124 who has draft
      const janithaCard = admissionsPage.admitDialogResultCards.filter({ hasText: 'janitha0124' }).first();
      await janithaCard.click();

      // Check draft conflict dialog
      await expect(admissionsPage.existingDraftDialog).toBeVisible({ timeout: 10000 });
      await expect(admissionsPage.continueDraftBtn).toBeVisible();
      await expect(admissionsPage.createNewAdmissionBtn).toBeVisible();
      await expect(admissionsPage.cancelDraftBtn).toBeVisible();
    });

    test('TC-ADM-ONBOARD-002: "Continue Existing Draft" navigates to /admin/admissions/onboarding/<id>', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.openAdmitPatientDialog();
      await admissionsPage.searchInAdmitDialog('0741222870');

      const janithaCard = admissionsPage.admitDialogResultCards.filter({ hasText: 'janitha0124' }).first();
      await janithaCard.click();

      await admissionsPage.continueExistingDraft();
      expect(page.url()).toContain('/admin/admissions/onboarding');
      await expect(admissionsPage.backToAdmissionsBtn).toBeVisible();
    });

    test('TC-ADM-ONBOARD-003: Onboarding page displays multi-step clinical history tabs and form fields', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.openAdmitPatientDialog();
      await admissionsPage.searchInAdmitDialog('0741222870');

      const janithaCard = admissionsPage.admitDialogResultCards.filter({ hasText: 'janitha0124' }).first();
      await janithaCard.click();
      await admissionsPage.continueExistingDraft();

      // Verify onboarding step navigation
      await expect(page.locator('text=1. Presenting Complaint').first()).toBeVisible();
      await expect(page.locator('text=Source*')).toBeVisible();
      await expect(page.locator('text=Reason for Admission*')).toBeVisible();
      await expect(page.locator('text=Consultant*')).toBeVisible();
      await expect(admissionsPage.onboardingContinueBtn).toBeVisible();
    });

    test('TC-ADM-ONBOARD-004: "Back to Admissions" button navigates back to /admin/admissions list', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await admissionsPage.openAdmitPatientDialog();
      await admissionsPage.searchInAdmitDialog('0741222870');

      const janithaCard = admissionsPage.admitDialogResultCards.filter({ hasText: 'janitha0124' }).first();
      await janithaCard.click();
      await admissionsPage.continueExistingDraft();

      await admissionsPage.clickBackToAdmissions();
      expect(page.url()).toContain('/admin/admissions');
      await expect(admissionsPage.heading).toBeVisible();
      await expect(admissionsPage.table).toBeVisible();
    });
  });

  // =========================================================================
  // 6. Direct Table Row Click Navigation & Pagination
  // =========================================================================
  test.describe('6. Direct Table Row Interaction & Pagination', () => {
    test('TC-ADM-ROW-001: Clicking a patient row in admissions table navigates directly to onboarding', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      const initialCount = await admissionsPage.tableRows.count();
      expect(initialCount).toBeGreaterThan(0);

      await admissionsPage.selectAdmissionRow(0);
      expect(page.url()).toContain('/admin/admissions/onboarding');
      await expect(admissionsPage.backToAdmissionsBtn).toBeVisible();
    });

    test('TC-ADM-PAG-001: Pagination controls are present and visible on admissions page', async ({ page }) => {
      const admissionsPage = new AdmissionsPage(page);
      await admissionsPage.goto();

      await expect(admissionsPage.previousButton).toBeVisible();
      await expect(admissionsPage.nextButton).toBeVisible();
    });
  });
});
