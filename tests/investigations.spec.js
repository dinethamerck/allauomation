// @ts-check
const { test, expect } = require('@playwright/test');
const { InvestigationsPage } = require('../pages/InvestigationsPage');
const { PrescriptionPage } = require('../pages/PrescriptionPage');

test.describe('Amerck Care - Investigations Directory & Report Management Suite', () => {
  // Use authenticated clinical session
  test.use({ storageState: 'playwright/.auth/user.json' });

  // Unique identifier suffix to ensure zero test interference
  const uniqueId = Date.now().toString().slice(-4);
  const testAbbr = `T${uniqueId}`;
  const testName = `Automated Lab Test ${uniqueId}`;

  // =========================================================================
  // 1. Page Initialization & Cross-Navigation
  // =========================================================================
  test.describe('1. Page Initialization & Navigation', () => {
    test('TC-INV-INIT-001: Direct navigation to /admin/investigations loads search box, action button, and table', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      expect(page.url()).toContain('/admin/investigations');
      await expect(invPage.mainContainer).toBeVisible();
      await expect(invPage.searchInput).toBeVisible();
      await expect(invPage.addReportButton).toBeVisible();
      await expect(invPage.table).toBeVisible();
    });

    test('TC-INV-INIT-002: Cross-navigation from Care View toolbar navigates to /admin/investigations', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await expect(rxPage.navInvestigationsLink).toBeVisible({ timeout: 15000 });
      await rxPage.navigateToInvestigations();

      expect(page.url()).toContain('/admin/investigations');
      const invPage = new InvestigationsPage(page);
      await expect(invPage.mainContainer).toBeVisible();
      await expect(invPage.table).toBeVisible();
    });

    test('TC-INV-INIT-003: Directory table displays essential column headers', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      const headerTexts = await invPage.tableHeaders.allInnerTexts();
      const headersJoined = headerTexts.join(' ');

      expect(headersJoined).toContain('Abbreviation');
      expect(headersJoined).toContain('Name');
      expect(headersJoined).toContain('Description');
      expect(headersJoined).toContain('Instructions');
      expect(headersJoined).toContain('Actions');
    });
  });

  // =========================================================================
  // 2. Search & Live Filtering
  // =========================================================================
  test.describe('2. Search & Live Filtering', () => {
    test('TC-INV-SRCH-001: Live search filters table by investigation name or keyword', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      await invPage.search('CBC');
      const count = await invPage.tableRows.count();
      expect(count).toBeGreaterThanOrEqual(1);

      const tableText = await invPage.tableBody.innerText();
      expect(tableText).toContain('CBC');
    });

    test('TC-INV-SRCH-002: Clearing search input restores full table records', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      await invPage.search('CBC');
      const filteredCount = await invPage.tableRows.count();

      await invPage.clearSearch();
      const restoredCount = await invPage.tableRows.count();
      expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
    });

    test('TC-INV-SRCH-003: Non-existent query shows zero results gracefully', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      await invPage.search('NonExistentLabTestXYZ999');
      const count = await invPage.tableRows.count();
      if (count > 0) {
        const text = await invPage.tableBody.innerText();
        expect(text).not.toContain('CBC');
      } else {
        expect(count).toBe(0);
      }
    });
  });

  // =========================================================================
  // 3. Add New Report Modal Interactions
  // =========================================================================
  test.describe('3. Add New Report Modal Interactions', () => {
    test('TC-INV-MODAL-001: Clicking "Add New Report" opens modal with all required form controls', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      await invPage.openAddReportDialog();
      await expect(invPage.addDialog).toBeVisible();
      await expect(invPage.addDialogTitle).toBeVisible();
      await expect(invPage.addAbbreviationInput).toBeVisible();
      await expect(invPage.addNameInput).toBeVisible();
      await expect(invPage.addDescriptionInput).toBeVisible();
      await expect(invPage.addInstructionsInput).toBeVisible();
      await expect(invPage.addCreateButton).toBeVisible();

      // Clean up modal
      await invPage.closeAddReportDialog();
    });

    test('TC-INV-MODAL-002: Closes "Add New Report" modal cleanly via Close button', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      await invPage.openAddReportDialog();
      await invPage.closeAddReportDialog();
      await expect(invPage.addDialog).toBeHidden();
    });
  });

  // =========================================================================
  // 4. Report Creation & End-to-End Persistence (Create)
  // =========================================================================
  test.describe('4. Report Creation Flow', () => {
    test('TC-INV-CREATE-001: Creates a new investigation report and verifies immediate display in table', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      await invPage.createReport({
        abbreviation: testAbbr,
        name: testName,
        description: 'Standard venous blood draw analysis',
        instructions: 'Fast for 8 hours prior to test'
      });

      // Search for created report
      await invPage.search(testAbbr);
      const rowCount = await invPage.tableRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(1);

      const rowText = await invPage.tableBody.innerText();
      expect(rowText).toContain(testAbbr);
      expect(rowText).toContain(testName);
    });
  });

  // =========================================================================
  // Helper: Ensures test report exists for isolated test runs (UI mode)
  // =========================================================================
  /**
   * @param {InvestigationsPage} invPage
   * @param {string} abbr
   * @param {string} name
   */
  async function ensureReportExists(invPage, abbr, name) {
    await invPage.search(abbr);
    const count = await invPage.tableRows.count();
    if (count === 0) {
      await invPage.clearSearch();
      await invPage.createReport({
        abbreviation: abbr,
        name: name,
        description: 'Standard venous blood draw analysis',
        instructions: 'Fast for 8 hours prior to test'
      });
      await invPage.search(abbr);
    }
  }

  // =========================================================================
  // 5. Edit Report Modal & Updates (Update)
  // =========================================================================
  test.describe('5. Edit Report Modal & Updates', () => {
    test('TC-INV-EDIT-001: Clicking "Edit" opens modal with populated report details', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      await ensureReportExists(invPage, testAbbr, testName);
      await invPage.openEditDialog(0);

      await expect(invPage.editDialog).toBeVisible();
      await expect(invPage.editDialogTitle).toBeVisible();
      await expect(invPage.editNameInput).toHaveValue(testName);
      await expect(invPage.editUpdateButton).toBeVisible();
      await expect(invPage.editDeleteButton).toBeVisible();

      // Close modal
      await invPage.closeEditDialog();
    });

    test('TC-INV-EDIT-002: Closes Edit Report modal via Close button without persisting changes', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      await ensureReportExists(invPage, testAbbr, testName);
      await invPage.openEditDialog(0);
      await invPage.closeEditDialog();

      await expect(invPage.editDialog).toBeHidden();
    });

    test('TC-INV-EDIT-003: Updates existing report description/instructions and verifies updated text', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      await ensureReportExists(invPage, testAbbr, testName);
      await invPage.openEditDialog(0);

      const updatedDesc = 'Updated protocol details for patient';
      await invPage.updateReport({ description: updatedDesc });

      // Verify updated content in table
      await invPage.search(testAbbr);
      const tableText = await invPage.tableBody.innerText();
      expect(tableText).toContain(updatedDesc);
    });
  });

  // =========================================================================
  // 6. Report Deletion & Cleanup (Delete)
  // =========================================================================
  test.describe('6. Report Deletion & Cleanup', () => {
    test('TC-INV-DEL-001: Deletes test investigation report and verifies removal from directory', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      await ensureReportExists(invPage, testAbbr, testName);
      const initialCount = await invPage.tableRows.count();
      expect(initialCount).toBeGreaterThanOrEqual(1);

      await invPage.openEditDialog(0);
      await invPage.deleteReport();

      // Search again to confirm deletion
      await invPage.search(testAbbr);
      const rowCount = await invPage.tableRows.count();
      if (rowCount > 0) {
        const text = await invPage.tableBody.innerText();
        expect(text).not.toContain(testAbbr);
      } else {
        expect(rowCount).toBe(0);
      }
    });
  });

  // =========================================================================
  // 7. Table Controls & Pagination
  // =========================================================================
  test.describe('7. Table Controls & Pagination', () => {
    test('TC-INV-ROW-001: Table rows display Edit and Create Template action buttons', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      const rowCount = await invPage.tableRows.count();
      expect(rowCount).toBeGreaterThan(0);

      await expect(invPage.editButtons.first()).toBeVisible();
      await expect(invPage.createTemplateButtons.first()).toBeVisible();
    });

    test('TC-INV-PAG-001: Pagination controls are present and rendered on directory page', async ({ page }) => {
      const invPage = new InvestigationsPage(page);
      await invPage.goto();

      await expect(invPage.previousButton).toBeVisible();
      await expect(invPage.nextButton).toBeVisible();
    });
  });
});
