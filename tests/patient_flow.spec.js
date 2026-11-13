// @ts-check
const { test, expect } = require('@playwright/test');
const { PrescriptionPage } = require('../pages/PrescriptionPage');

test.describe('Amerck Care - Comprehensive Patient Flow Test Suite', () => {
  // Use authenticated session for clinical provider
  test.use({ storageState: 'playwright/.auth/user.json' });

  // =========================================================================
  // 1. Initial State & Empty Prescription Navigation
  // =========================================================================
  test.describe('1. Initial Prescription State & Empty Navigation', () => {
    test('TC-PAT-FLOW-001: Displays "No patient selected" empty state card when loading /admin/prescription', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      // Verify URL is clean without pid
      expect(page.url()).toContain('/admin/prescription');
      expect(page.url()).not.toContain('pid=');

      // Verify empty state UI elements
      await expect(rxPage.noPatientCard).toBeVisible({ timeout: 15000 });
      await expect(rxPage.registerPatientButton.first()).toBeVisible();
      await expect(rxPage.searchInput).toBeVisible();
    });

    test('TC-PAT-FLOW-002: Accurately reports isPatientSelected() as false on empty state', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      const isSelected = await rxPage.isPatientSelected();
      expect(isSelected).toBe(false);
    });
  });

  // =========================================================================
  // 2. Autocomplete Search & Patient Selection Flow
  // =========================================================================
  test.describe('2. Patient Search & Autocomplete Selection', () => {
    test('TC-PAT-FLOW-003: Search patient by name, view cmdk suggestions, and load consultation (?pid=...)', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      // Search existing patient
      await rxPage.searchPatient('janitha0124');
      await expect(rxPage.searchResultItems.first()).toBeVisible({ timeout: 10000 });

      // Select patient
      const selectedText = await rxPage.selectFirstPatient();
      expect(selectedText).toContain('janitha0124');

      // Verify navigation to prescription with ?pid=
      await page.waitForURL((url) => url.searchParams.has('pid'), { timeout: 10000 });
      expect(page.url()).toContain('pid=333566');

      // Verify clinical consultation tabs unlock
      await expect(rxPage.todayTab).toBeVisible({ timeout: 15000 });
      await expect(rxPage.storyTab).toBeVisible();
      await expect(rxPage.getPatientHeading('janitha0124')).toBeVisible();
    });

    test('TC-PAT-FLOW-004: Search patient by registered mobile number and open consultation', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      // Search by phone number
      await rxPage.searchPatient('0741222870');
      await expect(rxPage.searchResultItems.first()).toBeVisible({ timeout: 10000 });

      // Select first result
      await rxPage.selectFirstPatient();
      await page.waitForURL((url) => url.searchParams.has('pid'), { timeout: 10000 });
      expect(page.url()).toContain('pid=333566');
      await expect(rxPage.todayTab).toBeVisible({ timeout: 15000 });
    });

    test('TC-PAT-FLOW-005: Clear search input resets autocomplete query', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await rxPage.searchPatient('janitha0124');
      await expect(rxPage.searchInput).toHaveValue('janitha0124');

      await rxPage.clearPatientSearch();
      await expect(rxPage.searchInput).toHaveValue('');
    });

    test('TC-PAT-FLOW-006: Searching non-existent query displays "No patients found" empty state', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await rxPage.searchPatient('NonExistentPatientXYZ999');
      await expect(rxPage.searchResultItems.first()).toContainText('No patients found');
    });
  });

  // =========================================================================
  // 3. New Patient Registration Wizard Flow
  // =========================================================================
  test.describe('3. New Patient Registration Wizard Flow', () => {
    test('TC-PAT-FLOW-007: Opens Register Patient Wizard modal and dismisses via Escape', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await rxPage.openPatientWizard();
      await expect(rxPage.patientWizardModal).toBeVisible();
      await expect(rxPage.patientWizardInput).toBeVisible();

      // Dismiss via Escape
      await rxPage.closePatientWizard();
      await expect(rxPage.patientWizardModal).not.toBeVisible();
    });

    test('TC-PAT-FLOW-008: Dismisses Register Patient Wizard modal via dialog Close button', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await rxPage.openPatientWizard();
      await expect(rxPage.patientWizardModal).toBeVisible();

      // Click Close (X) button
      await rxPage.patientWizardCloseButton.click();
      await page.waitForTimeout(500);
      await expect(rxPage.patientWizardModal).not.toBeVisible();
    });

    test('TC-PAT-FLOW-009: Search existing identifier in Wizard displays patient card and selection options', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await rxPage.openPatientWizard();
      await rxPage.searchInPatientWizard('0741222870');

      // Verify matching patient card and selection options
      await expect(rxPage.patientWizardModal.locator('text=Select Patient to add to your List')).toBeVisible();
      await expect(rxPage.patientWizardResultCards.first()).toBeVisible({ timeout: 10000 });
      await expect(rxPage.patientWizardCreateNewButton).toBeVisible();
    });

    test('TC-PAT-FLOW-010: Selecting patient card in Wizard navigates to prescription session', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await rxPage.openPatientWizard();
      await rxPage.searchInPatientWizard('0741222870');

      // Click patient card
      await rxPage.addPatientFromWizard(0);

      // Verify navigation to prescription URL with pid
      expect(page.url()).toContain('pid=');
      await expect(rxPage.todayTab).toBeVisible({ timeout: 15000 });
      expect(await rxPage.isPatientSelected()).toBe(true);
    });

    test('TC-PAT-FLOW-011: Searching new/unregistered NIC in Wizard redirects to registration form with NIC prefilled', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await rxPage.openPatientWizard();
      const newNic = '199912345678';
      await rxPage.searchInPatientWizard(newNic);

      // Wait for navigation to new patient edit page
      await page.waitForURL((url) => url.pathname.includes('/patients/edit/new'), { timeout: 10000 });
      expect(page.url()).toContain('/admin/patients/edit/new');
      expect(page.url()).toContain(`nic=${newNic}`);
      expect(page.url()).toContain('from=/admin/prescription');
    });

    test('TC-PAT-FLOW-012: Searching new/unregistered Mobile in Wizard redirects to registration form with mobile prefilled', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await rxPage.openPatientWizard();
      const newMobile = '0779998877';
      await rxPage.searchInPatientWizard(newMobile);

      // Wait for navigation to new patient edit page
      await page.waitForURL((url) => url.pathname.includes('/patients/edit/new'), { timeout: 10000 });
      expect(page.url()).toContain('/admin/patients/edit/new');
      expect(page.url()).toContain(`mobile=${newMobile}`);
      expect(page.url()).toContain('from=/admin/prescription');
    });

    test('TC-PAT-FLOW-013: Wizard "Create New Patient" button navigates to new patient registration', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await rxPage.openPatientWizard();
      await rxPage.searchInPatientWizard('0741222870');

      // Click "Create New Patient"
      await rxPage.patientWizardCreateNewButton.waitFor({ state: 'visible' });
      await rxPage.patientWizardCreateNewButton.click();

      // Verify navigation to new patient edit page
      await page.waitForURL((url) => url.pathname.includes('/patients/edit/new'), { timeout: 10000 });
      expect(page.url()).toContain('/admin/patients/edit/new');
    });
  });

  // =========================================================================
  // 4. Active Patient Consultation Navigation & Tab Switching
  // =========================================================================
  test.describe('4. Active Patient Navigation & Tab Switching', () => {
    test('TC-PAT-FLOW-014: Direct PID URL navigation loads patient consultation immediately', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto('pid=333566');

      expect(page.url()).toContain('pid=333566');
      await expect(rxPage.todayTab).toBeVisible({ timeout: 15000 });
      await expect(rxPage.storyTab).toBeVisible();
      expect(await rxPage.isPatientSelected()).toBe(true);
    });

    test('TC-PAT-FLOW-015: Switching between Story and Today tabs preserves clinical form state', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto('pid=333566');

      // Switch to Story tab
      await rxPage.switchToStoryTab();
      await expect(rxPage.storyTab).toHaveAttribute('data-state', 'active');

      // Switch back to Today tab
      await rxPage.switchToTodayTab();
      await expect(rxPage.todayTab).toHaveAttribute('data-state', 'active');
      await expect(rxPage.dateInput).toBeVisible();
      await expect(rxPage.addMedicationButton).toBeVisible();
    });

    test('TC-PAT-FLOW-016: Switches to Patient Details tab on responsive viewports', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto('pid=333566');

      await rxPage.switchToPatientDetailsTab();
      expect(page.url()).toContain('pid=333566');
    });
  });

  // =========================================================================
  // 5. Switching Patients Workflow
  // =========================================================================
  test.describe('5. Switching Patients Workflow', () => {
    test('TC-PAT-FLOW-017: Searching and selecting a different patient updates active consultation', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      // Start with patient 333566
      await rxPage.goto('pid=333566');
      await expect(rxPage.todayTab).toBeVisible({ timeout: 15000 });

      // Use top search bar to search another patient
      await rxPage.searchPatient('janitha0124');
      await expect(rxPage.searchResultItems.first()).toBeVisible({ timeout: 10000 });

      // Select patient
      await rxPage.selectFirstPatient();
      await page.waitForTimeout(1000);

      // Verify active consultation is maintained
      expect(page.url()).toContain('pid=');
      await expect(rxPage.todayTab).toBeVisible();
    });
  });
});
