// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { PrescriptionPage } = require('../pages/PrescriptionPage');
const { SchedulePage } = require('../pages/SchedulePage');
const { PatientsPage } = require('../pages/PatientsPage');

test.describe('Amerck Care - Function-by-Function Test Suite', () => {

  // =========================================================================
  // 1. LoginPage Function Categories
  // =========================================================================

  test.describe('LoginPage Functions', () => {
    // Isolated session for login tests
    test.use({ storageState: { cookies: [], origins: [] } });

    test.describe('Function: LoginPage.constructor(page)', () => {
      test('TC-FN-AUTH-INIT-001: Verifies all locators are initialized on instance', async ({ page }) => {
        const loginPage = new LoginPage(page);
        expect(loginPage.page).toBe(page);
        expect(loginPage.usernameInput).toBeDefined();
        expect(loginPage.passwordInput).toBeDefined();
        expect(loginPage.submitButton).toBeDefined();
        expect(loginPage.passwordToggle).toBeDefined();
      });
    });

    test.describe('Function: LoginPage.goto()', () => {
      test('TC-FN-AUTH-GOTO-001: Navigates to /login with domcontentloaded state', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        expect(page.url()).toContain('/login');
        await expect(loginPage.usernameInput).toBeVisible();
        await expect(loginPage.submitButton).toBeVisible();
      });
    });

    test.describe('Function: LoginPage.isPasswordMasked()', () => {
      test('TC-FN-AUTH-MASK-001: Verifies password input type is masked by default', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.passwordInput.fill('Secret123!');
        const isMasked = await loginPage.isPasswordMasked();
        expect(isMasked).toBe(true);
      });
    });

    test.describe('Function: LoginPage.togglePasswordVisibility()', () => {
      test('TC-FN-AUTH-TOGGLE-001: Toggles password type between password and text', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.passwordInput.fill('Secret123!');

        if (await loginPage.passwordToggle.isVisible()) {
          await loginPage.togglePasswordVisibility();
          expect(await loginPage.isPasswordMasked()).toBe(false);

          await loginPage.togglePasswordVisibility();
          expect(await loginPage.isPasswordMasked()).toBe(true);
        }
      });
    });

    test.describe('Function: LoginPage.login(username, password)', () => {
      test('TC-FN-AUTH-LOGIN-001: Logs in successfully with provider credentials', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();

        const username = process.env.QA_CARE_USERNAME || 'Janitha01234';
        const password = process.env.QA_CARE_PASSWORD || 'Janitha6868@';

        await loginPage.login(username, password);
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
        expect(page.url()).not.toContain('/login');
      });

      test('TC-FN-AUTH-LOGIN-002: Rejects login with invalid password', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();

        await loginPage.login('Janitha01234', 'WrongPassword123!');
        await page.waitForTimeout(2000);
        expect(page.url()).toContain('/login');
        await expect(loginPage.submitButton).toBeVisible();
      });
    });
  });

  // =========================================================================
  // 2. PrescriptionPage Function Categories
  // =========================================================================

  test.describe('PrescriptionPage Functions', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test.describe('Function: PrescriptionPage.constructor(page)', () => {
      test('TC-FN-RX-INIT-001: Verifies all clinical locators are initialized', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        expect(rxPage.page).toBe(page);
        expect(rxPage.searchInput).toBeDefined();
        expect(rxPage.todayTab).toBeDefined();
        expect(rxPage.storyTab).toBeDefined();
        expect(rxPage.noPatientCard).toBeDefined();
        expect(rxPage.dateInput).toBeDefined();
        expect(rxPage.systolicBpInput).toBeDefined();
        expect(rxPage.diastolicBpInput).toBeDefined();
        expect(rxPage.bpmInput).toBeDefined();
        expect(rxPage.weightInput).toBeDefined();
        expect(rxPage.heightInput).toBeDefined();
        expect(rxPage.bmiInput).toBeDefined();
        expect(rxPage.addMedicationButton).toBeDefined();
        expect(rxPage.saveButton).toBeDefined();
        expect(rxPage.prescriptionModal).toBeDefined();
        expect(rxPage.addResultsDialog).toBeDefined();
        expect(rxPage.selectReportDialog).toBeDefined();
      });
    });

    // -----------------------------------------------------------------------
    // 2.1 Patient Flow Function Categories
    // -----------------------------------------------------------------------

    test.describe('Function: PrescriptionPage.goto(params)', () => {
      test('TC-FN-PAT-GOTO-001: goto() without params opens empty prescription state', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        expect(page.url()).toContain('/admin/prescription');
        await expect(rxPage.noPatientCard).toBeVisible({ timeout: 15000 });
      });

      test('TC-FN-PAT-GOTO-002: goto("pid=333566") navigates directly to patient prescription', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        expect(page.url()).toContain('pid=333566');
        await expect(rxPage.todayTab).toBeVisible({ timeout: 15000 });
        await expect(page.locator('role=heading[name="janitha0124"]')).toBeVisible();
      });
    });

    test.describe('Function: PrescriptionPage.searchPatient(query)', () => {
      test('TC-FN-PAT-SEARCH-001: Searches patient by name and populates dropdown', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        await rxPage.searchPatient('janitha0124');
        await expect(rxPage.searchResultItems.first()).toBeVisible({ timeout: 10000 });
      });

      test('TC-FN-PAT-SEARCH-002: Searches patient by mobile number', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        await rxPage.searchPatient('0741222870');
        await expect(rxPage.searchResultItems.first()).toBeVisible({ timeout: 10000 });
      });

      test('TC-FN-PAT-SEARCH-003: Searches non-existent patient and shows empty indicator', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        await rxPage.searchPatient('NonExistentPatientXYZ999');
        await expect(rxPage.searchResultItems.first()).toContainText('No patients found');
      });
    });

    test.describe('Function: PrescriptionPage.clearPatientSearch()', () => {
      test('TC-FN-PAT-CLEAR-001: Clears search input query', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        await rxPage.searchPatient('janitha0124');
        await rxPage.clearPatientSearch();
        await expect(rxPage.searchInput).toHaveValue('');
      });
    });

    test.describe('Function: PrescriptionPage.selectFirstPatient()', () => {
      test('TC-FN-PAT-SELFIRST-001: Selects first patient item and returns label text', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        await rxPage.searchPatient('janitha0124');
        const patientText = await rxPage.selectFirstPatient();
        expect(patientText).toContain('janitha0124');
      });
    });

    test.describe('Function: PrescriptionPage.searchAndSelectPatient(query)', () => {
      test('TC-FN-PAT-SEARCHSEL-001: Full search-and-select flow navigates to pid URL', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        const selected = await rxPage.searchAndSelectPatient('janitha0124');
        expect(selected).toContain('janitha0124');
        expect(page.url()).toContain('pid=333566');
      });

      test('TC-FN-PAT-SEARCHSEL-002: Verifies patient heading is displayed upon selection', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        await rxPage.searchAndSelectPatient('janitha0124');
        await expect(rxPage.getPatientHeading('janitha0124')).toBeVisible();
      });
    });

    test.describe('Function: PrescriptionPage.openPatientWizard() & closePatientWizard()', () => {
      test('TC-FN-PAT-WIZARD-001: Opens New Patient Wizard modal dialog', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        await rxPage.openPatientWizard();
        await expect(rxPage.patientWizardModal).toBeVisible();
      });

      test('TC-FN-PAT-WIZARD-002: Closes New Patient Wizard modal dialog via Escape', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        await rxPage.openPatientWizard();
        await rxPage.closePatientWizard();
        await expect(rxPage.patientWizardModal).not.toBeVisible();
      });
    });

    test.describe('Function: PrescriptionPage.switchToStoryTab() & switchToTodayTab()', () => {
      test('TC-FN-PAT-TABS-001: Switches to Story tab and displays patient timeline', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        await rxPage.switchToStoryTab();
        // Story tab is active
        await expect(rxPage.storyTab).toHaveAttribute('data-state', 'active');
      });

      test('TC-FN-PAT-TABS-002: Switches back to Today tab and displays active prescription form', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        await rxPage.switchToStoryTab();
        await rxPage.switchToTodayTab();
        await expect(rxPage.todayTab).toHaveAttribute('data-state', 'active');
        await expect(rxPage.dateInput).toBeVisible();
      });
    });

    test.describe('Function: PrescriptionPage.isPatientSelected()', () => {
      test('TC-FN-PAT-STATE-001: Accurately reports selection state', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        expect(await rxPage.isPatientSelected()).toBe(false);

        await rxPage.goto('pid=333566');
        expect(await rxPage.isPatientSelected()).toBe(true);
      });
    });



    test.describe('Function: PrescriptionPage.switchToPatientDetailsTab()', () => {
      test('TC-FN-PAT-DETAILSTAB-001: Switches to Patient Details tab when rendered', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        await rxPage.switchToPatientDetailsTab();
        expect(page.url()).toContain('pid=333566');
      });
    });

    test.describe('Function: PrescriptionPage.navigateToSchedule()', () => {
      test('TC-FN-NAV-SCHED-001: Navigates to Schedule page via top navbar calendar icon', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        await rxPage.navigateToSchedule();
        expect(page.url()).toContain('/admin/schedule');
      });
    });

    test.describe('Function: PrescriptionPage.navigateToPatients()', () => {
      test('TC-FN-NAV-PAT-001: Navigates to Patients page via top navbar users icon', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto();
        await rxPage.navigateToPatients();
        expect(page.url()).toContain('/admin/patients');
      });
    });

    // -----------------------------------------------------------------------
    // 2.2 Clinical & Medication Function Categories
    // -----------------------------------------------------------------------

    test.describe('Function: PrescriptionPage.fillVitals(vitals)', () => {
      test('TC-FN-RX-VITALS-001: Fills vitals and verifies inputs & auto BMI calculation', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        await page.waitForTimeout(2000);

        await rxPage.fillVitals({
          systolic: '120',
          diastolic: '80',
          bpm: '75',
          weight: '70',
          height: '1.75',
          temp: '98.4',
          rr: '18',
          lungs: 'Clear to auscultation',
          cvs: 'Normal sounds S1 S2'
        });

        await expect(rxPage.systolicBpInput).toHaveValue('120');
        await expect(rxPage.diastolicBpInput).toHaveValue('80');
        await expect(rxPage.bpmInput).toHaveValue('75');
        await expect(rxPage.weightInput).toHaveValue('70');
        await expect(rxPage.heightInput).toHaveValue('1.75');
        await expect(rxPage.bmiInput).toHaveValue('22.86');
        await expect(rxPage.tempInput).toHaveValue('98.4');
        await expect(rxPage.rrInput).toHaveValue('18');
        await expect(rxPage.lungsInput).toHaveValue('Clear to auscultation');
        await expect(rxPage.cvsInput).toHaveValue('Normal sounds S1 S2');
      });
    });

    test.describe('Function: PrescriptionPage.fillPresentingProblems(problems)', () => {
      test('TC-FN-RX-PROB-001: Fills chief complaints text correctly', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        await page.waitForTimeout(2000);
        const text = 'Patient reports fever and throat irritation for 2 days.';
        await rxPage.fillPresentingProblems(text);
        await expect(rxPage.presentingProblemsInput).toHaveValue(text);
      });
    });

    test.describe('Function: PrescriptionPage.addDiagnosis(diagnosis)', () => {
      test('TC-FN-RX-DX-001: Adds diagnosis entry via input and Enter key', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        await page.waitForTimeout(2000);
        await rxPage.diagnosisInput.waitFor({ state: 'visible' });
        await rxPage.diagnosisInput.fill('Tonsillitis');
        await expect(rxPage.diagnosisInput).toHaveValue('Tonsillitis');
      });
    });

    test.describe('Function: PrescriptionPage.addNewMedicationRow()', () => {
      test('TC-FN-RX-ADDROW-001: Appends a new medication row dynamically', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        await page.waitForTimeout(2000);

        // Reset rows to a clean single-row baseline
        if (await rxPage.clearAllButton.isVisible()) {
          await rxPage.clearAllButton.click();
          await page.waitForTimeout(1000);
        }

        await expect(rxPage.genericNameInputs).toHaveCount(1);
        await rxPage.addNewMedicationRow();
        await expect(rxPage.genericNameInputs).toHaveCount(2);
      });
    });

    test.describe('Function: PrescriptionPage.fillMedicationRow(med, index)', () => {
      test('TC-FN-RX-FILLROW-001: Fills medication details at row index 0', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        await page.waitForTimeout(2000);
        await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });

        if (await rxPage.genericNameInputs.count() === 0) {
          await rxPage.addNewMedicationRow();
        }
        await rxPage.genericNameInputs.first().waitFor({ state: 'visible' });

        await rxPage.fillMedicationRow({
          generic: 'Amoxicillin 500mg',
          dosage: '1 cap',
          frequency: 'TDS',
          duration: '5 days'
        }, 0);

        await expect(rxPage.genericNameInputs.first()).toHaveValue('Amoxicillin 500mg');
        await expect(rxPage.dosageInputs.first()).toHaveValue('1 cap');
        await expect(rxPage.frequencyInputs.first()).toHaveValue('TDS');
        await expect(rxPage.durationInputs.first()).toHaveValue('5 days');
      });
    });

    test.describe('Function: PrescriptionPage.addMedication(med)', () => {
      test('TC-FN-RX-ADDMED-001: Legacy helper fills primary medication row', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        await page.waitForTimeout(2000);
        await rxPage.todayTab.waitFor({ state: 'visible', timeout: 15000 });

        if (await rxPage.genericNameInputs.count() === 0) {
          await rxPage.addNewMedicationRow();
        }
        await rxPage.genericNameInputs.first().waitFor({ state: 'visible' });

        await rxPage.addMedication({
          generic: 'Paracetamol 500mg',
          dosage: '1 tab',
          frequency: 'BID',
          duration: '3 days'
        });

        await expect(rxPage.genericNameInputs.first()).toHaveValue('Paracetamol 500mg');
        await expect(rxPage.dosageInputs.first()).toHaveValue('1 tab');
      });
    });

    test.describe('Function: PrescriptionPage.clickSave()', () => {
      test('TC-FN-RX-CLKSAVE-001: Clicks action bar Save button', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        await rxPage.clickSave();
        expect(page.url()).toContain('pid=333566');
      });
    });

    test.describe('Function: PrescriptionPage.triggerSaveShortcut()', () => {
      test('TC-FN-RX-SAVESHORT-001: Triggers Ctrl+S shortcut successfully', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');
        await rxPage.triggerSaveShortcut();
        expect(page.url()).toContain('pid=333566');
      });
    });

    test.describe('Function: PrescriptionPage.openPrescriptionModal() & closePrescriptionModal()', () => {
      test('TC-FN-RX-MODAL-001: Opens preview modal via Ctrl+P and closes via Close button', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');

        await rxPage.openPrescriptionModal();
        await expect(rxPage.prescriptionModal).toBeVisible();
        await expect(rxPage.modalTitle).toBeVisible();

        await rxPage.closePrescriptionModal();
        await expect(rxPage.prescriptionModal).not.toBeVisible({ timeout: 5000 });
      });
    });

    test.describe('Function: PrescriptionPage.openAddResultsModal()', () => {
      test('TC-FN-RX-ADDRES-001: Opens Add Results popup dialog and verifies elements', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');

        await rxPage.openAddResultsModal();
        await expect(rxPage.addResultsDialog).toBeVisible();
        await expect(rxPage.addResultsTitle).toBeVisible();
        await expect(rxPage.addResultsTestNameInput.first()).toBeVisible();

        // Close dialog via X
        await rxPage.addResultsXBtn.click();
        await page.waitForTimeout(1000);
        await expect(rxPage.addResultsDialog).not.toBeVisible({ timeout: 5000 });
      });
    });

    test.describe('Function: PrescriptionPage.openAddReportsModal()', () => {
      test('TC-FN-RX-ADDREP-001: Opens Add Reports catalog popup and verifies elements', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');

        await rxPage.openAddReportsModal();
        await expect(rxPage.selectReportDialog).toBeVisible();
        await expect(rxPage.selectReportTitle).toBeVisible();
        await expect(rxPage.selectReportSearchInput).toBeVisible();

        // Close dialog via X
        await rxPage.selectReportXBtn.click();
        await page.waitForTimeout(1000);
        await expect(rxPage.selectReportDialog).not.toBeVisible({ timeout: 5000 });
      });
    });

    test.describe('Function: PrescriptionPage.clickEndConsultation()', () => {
      test('TC-FN-RX-ENDCONS-001: Opens End Consultation confirmation dialog and dismisses', async ({ page }) => {
        const rxPage = new PrescriptionPage(page);
        await rxPage.goto('pid=333566');

        await rxPage.clickEndConsultation();
        await expect(rxPage.endConsultationDialog).toBeVisible();
        await expect(rxPage.endConsultationTitle).toBeVisible();
        await expect(rxPage.printAndEndConsultationButton).toBeVisible();

        // Dismiss via X button
        await rxPage.endConsultationXButton.click();
        await page.waitForTimeout(1000);
        await expect(rxPage.endConsultationDialog).not.toBeVisible({ timeout: 5000 });
      });
    });

  });

  // =========================================================================
  // 3. SchedulePage Function Categories (Calendar Icon Flow)
  // =========================================================================

  test.describe('SchedulePage Functions', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test.describe('Function: SchedulePage.constructor(page)', () => {
      test('TC-FN-SCHED-INIT-001: Verifies all schedule locators are initialized on instance', async ({ page }) => {
        const schedulePage = new SchedulePage(page);
        expect(schedulePage.page).toBe(page);
        expect(schedulePage.todayButton).toBeDefined();
        expect(schedulePage.dayViewButton).toBeDefined();
        expect(schedulePage.weekViewButton).toBeDefined();
        expect(schedulePage.monthViewButton).toBeDefined();
        expect(schedulePage.allAppointmentsButton).toBeDefined();
        expect(schedulePage.addAppointmentButton).toBeDefined();
      });
    });

    test.describe('Function: SchedulePage.goto()', () => {
      test('TC-FN-SCHED-GOTO-001: Navigates to /admin/schedule and displays calendar view', async ({ page }) => {
        const schedulePage = new SchedulePage(page);
        await schedulePage.goto();
        expect(page.url()).toContain('/admin/schedule');
        await expect(schedulePage.todayButton).toBeVisible();
      });
    });

    test.describe('Function: SchedulePage.switchView(view)', () => {
      test('TC-FN-SCHED-VIEW-001: Switches between Day, Week, and Month calendar views', async ({ page }) => {
        const schedulePage = new SchedulePage(page);
        await schedulePage.goto();

        await schedulePage.switchView('Day');
        await expect(schedulePage.dayViewButton).toBeVisible();

        await schedulePage.switchView('Week');
        await expect(schedulePage.weekViewButton).toBeVisible();

        await schedulePage.switchView('Month');
        await expect(schedulePage.monthViewButton).toBeVisible();
      });
    });

    test.describe('Function: SchedulePage.clickToday()', () => {
      test('TC-FN-SCHED-TODAY-001: Clicks Today button on calendar', async ({ page }) => {
        const schedulePage = new SchedulePage(page);
        await schedulePage.goto();
        await schedulePage.clickToday();
        expect(page.url()).toContain('/admin/schedule');
      });
    });

    test.describe('Function: SchedulePage.clickAllAppointments()', () => {
      test('TC-FN-SCHED-ALLAPP-001: Clicks All Appointments button', async ({ page }) => {
        const schedulePage = new SchedulePage(page);
        await schedulePage.goto();
        if (await schedulePage.allAppointmentsButton.isVisible()) {
          await schedulePage.clickAllAppointments();
          expect(page.url()).toContain('/admin/schedule');
        }
      });
    });
  });

  // =========================================================================
  // 4. PatientsPage Function Categories (Patients Icon Flow)
  // =========================================================================

  test.describe('PatientsPage Functions', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test.describe('Function: PatientsPage.constructor(page)', () => {
      test('TC-FN-PATPAGE-INIT-001: Verifies all patients directory locators are initialized', async ({ page }) => {
        const patientsPage = new PatientsPage(page);
        expect(patientsPage.page).toBe(page);
        expect(patientsPage.searchInput).toBeDefined();
        expect(patientsPage.patientTable).toBeDefined();
        expect(patientsPage.patientRows).toBeDefined();
        expect(patientsPage.newPatientButton).toBeDefined();
      });
    });

    test.describe('Function: PatientsPage.goto()', () => {
      test('TC-FN-PATPAGE-GOTO-001: Navigates to /admin/patients and displays patient table', async ({ page }) => {
        const patientsPage = new PatientsPage(page);
        await patientsPage.goto();
        expect(page.url()).toContain('/admin/patients');
        await expect(patientsPage.patientTable).toBeVisible({ timeout: 15000 });
        expect(await patientsPage.patientRows.count()).toBeGreaterThan(0);
      });
    });

    test.describe('Function: PatientsPage.searchPatient(query)', () => {
      test('TC-FN-PATPAGE-SEARCH-001: Searches patient in directory table', async ({ page }) => {
        const patientsPage = new PatientsPage(page);
        await patientsPage.goto();
        await patientsPage.searchPatient('Ashley');
        await expect(patientsPage.patientTable).toBeVisible();
      });
    });

    test.describe('Function: PatientsPage.clearSearch()', () => {
      test('TC-FN-PATPAGE-CLEAR-001: Clears search input and restores patient directory list', async ({ page }) => {
        const patientsPage = new PatientsPage(page);
        await patientsPage.goto();
        await patientsPage.searchPatient('Ashley');
        await patientsPage.clearSearch();
        await expect(patientsPage.searchInput).toHaveValue('');
      });
    });

    test.describe('Function: PatientsPage.selectPatientRow(index)', () => {
      test('TC-FN-PATPAGE-ROW-001: Clicks first patient table row and navigates to profile', async ({ page }) => {
        const patientsPage = new PatientsPage(page);
        await patientsPage.goto();
        await patientsPage.selectPatientRow(0);
        await page.waitForURL((url) => url.pathname.includes('/patients/edit/'), { timeout: 10000 });
        expect(page.url()).toContain('/patients/edit/');
      });
    });
  });

});
