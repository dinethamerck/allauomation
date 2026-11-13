// @ts-check
const { test, expect } = require('@playwright/test');
const { DocumentsPage } = require('../pages/DocumentsPage');
const { PrescriptionPage } = require('../pages/PrescriptionPage');

test.describe('Amerck Care - Medical Documents & Letters Suite', () => {
  // Use authenticated clinical session
  test.use({ storageState: 'playwright/.auth/user.json' });

  // Unique identifier for isolated tests
  const uniqueId = Date.now().toString().slice(-4);
  const testSubject = `Auto Clinical Summary ${uniqueId}`;

  // =========================================================================
  // Helper: Ensures a draft document exists for standalone test runs (UI mode)
  // =========================================================================
  /**
   * @param {DocumentsPage} docPage
   * @param {string} subject
   */
  async function ensureDraftDocumentExists(docPage, subject) {
    await docPage.goto();
    await docPage.switchToRecentTab();
    const count = await docPage.recentLettersList.filter({ hasText: subject }).count();
    if (count === 0) {
      await docPage.switchToCreateTab();
      await docPage.clickCreateCustom();
      await docPage.selectPatient('janitha0124');
      await docPage.fillLetterDetails({
        recipientName: 'Dr. John Watson',
        recipientDesignation: 'Consultant Physician',
        greeting: 'Dear Dr. Watson,',
        subject: subject,
        body: 'Automated test letter initial content.'
      });
      await docPage.saveDraft();
      await docPage.goto();
      await docPage.switchToRecentTab();
    }
  }

  // =========================================================================
  // 1. Documents Hub Initialization & Cross-Navigation
  // =========================================================================
  test.describe('1. Documents Hub Initialization & Navigation', () => {
    test('TC-DOC-INIT-001: Direct navigation to /admin/letters loads Create Document tab and template cards', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      expect(page.url()).toContain('/admin/letters');
      await expect(docPage.mainContainer).toBeVisible();
      await expect(docPage.createTab).toBeVisible();
      await expect(docPage.recentTab).toBeVisible();

      const cardCount = await docPage.templateCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(5);
    });

    test('TC-DOC-INIT-002: Cross-navigation from Care View toolbar navigates to /admin/letters', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await expect(rxPage.navDocumentsLink).toBeVisible({ timeout: 15000 });
      await rxPage.navigateToDocuments();

      expect(page.url()).toContain('/admin/letters');
      const docPage = new DocumentsPage(page);
      await expect(docPage.mainContainer).toBeVisible();
      await expect(docPage.createTab).toBeVisible();
    });

    test('TC-DOC-INIT-003: Hub renders all 5 standard document template cards', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      await expect(docPage.aiWriterCard).toBeVisible();
      await expect(docPage.referralCard).toBeVisible();
      await expect(docPage.medicalLeaveCard).toBeVisible();
      await expect(docPage.deathConfirmationCard).toBeVisible();
      await expect(docPage.customLetterCard).toBeVisible();
    });
  });

  // =========================================================================
  // 2. Tab Switching & Recent Documents Catalog
  // =========================================================================
  test.describe('2. Tab Switching & Catalog View', () => {
    test('TC-DOC-TAB-001: Switches seamlessly between "Create Document" and "Recent Documents" tabs', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      // Switch to Recent
      await docPage.switchToRecentTab();
      await expect(docPage.recentTab).toHaveAttribute('data-state', 'active');

      // Switch back to Create
      await docPage.switchToCreateTab();
      await expect(docPage.createTab).toHaveAttribute('data-state', 'active');
      await expect(docPage.customLetterCard).toBeVisible();
    });

    test('TC-DOC-TAB-002: Recent Documents tab displays document catalog or empty state with pagination', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      await docPage.switchToRecentTab();
      const hasList = await docPage.recentLettersList.count();
      const hasEmpty = await docPage.noLettersFoundMessage.count();

      // Either list of letters or empty state must be rendered
      expect(hasList > 0 || hasEmpty > 0).toBeTruthy();
      if (hasList > 0) {
        await expect(docPage.paginationPreviousButton).toBeVisible();
        await expect(docPage.paginationNextButton).toBeVisible();
      } else {
        await expect(docPage.noLettersFoundMessage).toBeVisible();
      }
    });
  });

  // =========================================================================
  // 3. Template Card Routing & Editor Navigation
  // =========================================================================
  test.describe('3. Template Card Routing & Back Navigation', () => {
    test('TC-DOC-ROUTE-001: "Create with AI" routes to /admin/letters/ai with Back button', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      await docPage.clickCreateWithAi();
      expect(page.url()).toContain('/admin/letters/ai');
      await expect(docPage.aiHeading).toBeVisible();
      await expect(docPage.aiBackButton).toBeVisible();

      // Return back
      await docPage.aiBackButton.click();
      await page.waitForURL((url) => url.pathname.includes('/admin/letters') && !url.pathname.includes('/ai'));
      expect(page.url()).toContain('/admin/letters');
    });

    test('TC-DOC-ROUTE-002: "Create Referral" routes to /admin/letters/edit/new?type=referral and returns via Back', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      await docPage.clickCreateReferral();
      expect(page.url()).toContain('/admin/letters/edit/new');
      expect(page.url()).toContain('type=referral');

      await docPage.clickBack();
      expect(page.url()).toContain('/admin/letters');
      expect(page.url()).not.toContain('/edit');
    });

    test('TC-DOC-ROUTE-003: "Create Certificate" (Medical Leave) routes to /admin/letters/edit/new?type=medical-leave', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      await docPage.clickCreateMedicalLeave();
      expect(page.url()).toContain('/admin/letters/edit/new');
      expect(page.url()).toContain('type=medical-leave');

      await docPage.clickBack();
      expect(page.url()).toContain('/admin/letters');
    });

    test('TC-DOC-ROUTE-004: "Create Certificate" (Death) routes to /admin/letters/edit/new?type=death-confirmation', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      await docPage.clickCreateDeathConfirmation();
      expect(page.url()).toContain('/admin/letters/edit/new');
      expect(page.url()).toContain('type=death-confirmation');

      await docPage.clickBack();
      expect(page.url()).toContain('/admin/letters');
    });

    test('TC-DOC-ROUTE-005: "Create Custom" routes to /admin/letters/edit/new?type=custom', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      await docPage.clickCreateCustom();
      expect(page.url()).toContain('/admin/letters/edit/new');
      expect(page.url()).toContain('type=custom');

      await docPage.clickBack();
      expect(page.url()).toContain('/admin/letters');
    });
  });

  // =========================================================================
  // 4. Letter Editor Form Controls & Validation
  // =========================================================================
  test.describe('4. Letter Editor Controls & Validation', () => {
    test('TC-DOC-FORM-001: Editor loads patient combobox, form inputs, and action buttons', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      await docPage.clickCreateCustom();
      await expect(docPage.patientSearchInput).toBeVisible();
      await expect(docPage.recipientNameInput).toBeVisible();
      await expect(docPage.recipientDesignationInput).toBeVisible();
      await expect(docPage.greetingInput).toBeVisible();
      await expect(docPage.subjectInput).toBeVisible();
      await expect(docPage.bodyInput).toBeVisible();
      await expect(docPage.saveDraftButton).toBeVisible();
      await expect(docPage.printButton).toBeVisible();
      await expect(docPage.finalizePrintButton).toBeVisible();

      await docPage.clickBack();
    });

    test('TC-DOC-FORM-002: Editor view switchers (Form, Split, Preview) are interactive', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      await docPage.clickCreateCustom();
      await expect(docPage.formViewButton).toBeVisible();
      await expect(docPage.splitViewButton).toBeVisible();
      await expect(docPage.previewViewButton).toBeVisible();

      // Switch to Preview
      await docPage.previewViewButton.click();
      await page.waitForTimeout(500);

      // Switch back to Form
      await docPage.formViewButton.click();
      await page.waitForTimeout(500);
      await expect(docPage.subjectInput).toBeVisible();

      await docPage.clickBack();
    });

    test('TC-DOC-FORM-003: "Save Draft" button is disabled until a patient is selected', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      await docPage.clickCreateCustom();
      const isEnabled = await docPage.saveDraftButton.isEnabled();
      expect(isEnabled).toBeFalsy();

      await expect(docPage.statusBadge).toContainText(/No patient selected/i);
      await docPage.clickBack();
    });
  });

  // =========================================================================
  // 5. Document Creation & Draft Persistence (CRUD: Create)
  // =========================================================================
  test.describe('5. Document Creation & Draft Persistence Flow', () => {
    test('TC-DOC-CREATE-001: Selects patient, fills document form, saves draft, and verifies under Recent Documents', async ({ page }) => {
      const docPage = new DocumentsPage(page);
      await docPage.goto();

      await docPage.clickCreateCustom();

      // Select patient via cmdk search
      await docPage.selectPatient('janitha0124');
      await expect(docPage.statusBadge).toContainText(/Patient:/i);
      await expect(docPage.saveDraftButton).toBeEnabled();

      // Fill letter content
      await docPage.fillLetterDetails({
        recipientName: 'Dr. Gregory House',
        recipientDesignation: 'Head of Diagnostics',
        greeting: 'Dear Dr. House,',
        subject: testSubject,
        body: 'Comprehensive clinical evaluation notes for medical assessment.'
      });

      // Save draft
      await docPage.saveDraft();

      // Verify URL updated to edit existing document ID
      expect(page.url()).toMatch(/\/admin\/letters\/edit\/\d+/);

      // Return to Recent Documents and verify saved draft
      await docPage.goto();
      await docPage.switchToRecentTab();

      const recentItem = docPage.getRecentItemBySubject(testSubject);
      await expect(recentItem).toBeVisible();
      const itemText = await recentItem.innerText();
      expect(itemText).toContain(testSubject);
      expect(itemText).toContain('Draft');
    });
  });

  // =========================================================================
  // 6. Existing Draft Viewing & Editing (CRUD: Update)
  // =========================================================================
  test.describe('6. Existing Draft Viewing & Editing Flow', () => {
    test('TC-DOC-EDIT-001: Opens existing draft from Recent Documents, updates content, and verifies persistence', async ({ page }) => {
      const docPage = new DocumentsPage(page);

      await ensureDraftDocumentExists(docPage, testSubject);

      // Open letter
      await docPage.openRecentLetterBySubject(testSubject);

      // Verify form is populated
      await expect(docPage.subjectInput).toHaveValue(testSubject);

      // Update body text
      const updatedBody = 'Updated clinical notes with follow-up recommendations.';
      await docPage.fillLetterDetails({ body: updatedBody });

      // Save draft
      await docPage.saveDraft();

      // Return to Recent Documents and verify
      await docPage.goto();
      await docPage.switchToRecentTab();

      const recentItem = docPage.getRecentItemBySubject(testSubject);
      await expect(recentItem).toBeVisible();
      const itemText = await recentItem.innerText();
      expect(itemText).toContain(testSubject);
    });
  });
});
