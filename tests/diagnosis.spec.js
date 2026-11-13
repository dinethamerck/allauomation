// @ts-check
const { test, expect } = require('@playwright/test');
const { DiagnosisPage } = require('../pages/DiagnosisPage');

test.describe('Amerck Care - Diagnosis Catalog & Directory Management Suite', () => {
  // Use authenticated clinical provider session
  test.use({ storageState: 'playwright/.auth/user.json' });

  // Extend test timeout to 60s for full multi-step CRUD lifecycles in UI mode
  test.setTimeout(60000);

  // Generate unique test entity identifiers to prevent race conditions & collisions
  const uniqueId = Date.now().toString().slice(-5);
  const testDxName = `Auto Test Condition ${uniqueId}`;
  const testIcdCode = `DX-${uniqueId}`;
  const updatedDxName = `Auto Test Condition ${uniqueId} Updated`;
  const updatedIcdCode = `DXU-${uniqueId}`;

  // =========================================================================
  // 1. Page Initialization & Layout Verification
  // =========================================================================
  test.describe('1. Page Initialization & Structure', () => {
    test('TC-DX-INIT-001: Direct navigation to /admin/diagnosis loads table, search input, and Add button', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      expect(page.url()).toContain('/admin/diagnosis');
      await expect(dxPage.heading).toBeVisible();
      await expect(dxPage.searchInput).toBeVisible();
      await expect(dxPage.addDiagnosisButton).toBeVisible();
      await expect(dxPage.table).toBeVisible();
    });

    test('TC-DX-INIT-002: Directory table renders essential columns: Diagnosis and ICD Code', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      const headers = await dxPage.tableHeaders.allInnerTexts();
      const headersJoined = headers.join(' ');

      expect(headersJoined).toContain('Diagnosis');
      expect(headersJoined).toContain('ICD Code');
    });

    test('TC-DX-INIT-003: Table rows display source badges (Custom and Global)', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      const rowCount = await dxPage.getRowCount();
      expect(rowCount).toBeGreaterThan(0);

      const tableText = await dxPage.tableBody.innerText();
      expect(tableText).toMatch(/Custom|Global/);
    });

    test('TC-DX-INIT-004: Pagination indicator displays current page and total pages (e.g. 1/1960)', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await expect(dxPage.pageIndicator).toBeVisible();
      const text = await dxPage.getPageIndicatorText();
      expect(text).toMatch(/\d+\/\d+/);
      await expect(dxPage.nextButton).toBeVisible();
      await expect(dxPage.previousButton).toBeVisible();
    });
  });

  // =========================================================================
  // 2. Search & Directory Live Filtering
  // =========================================================================
  test.describe('2. Search & Filtering', () => {
    test('TC-DX-SRCH-001: Live search filters directory by clinical diagnosis name', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await dxPage.search('Pharyngitis');
      const count = await dxPage.getRowCount();
      expect(count).toBeGreaterThanOrEqual(1);

      const tableText = await dxPage.tableBody.innerText();
      expect(tableText.toLowerCase()).toContain('pharyngitis');
    });

    test('TC-DX-SRCH-002: Live search filters directory by ICD Code keyword', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await dxPage.search('CA02');
      const count = await dxPage.getRowCount();
      expect(count).toBeGreaterThanOrEqual(1);

      const tableText = await dxPage.tableBody.innerText();
      expect(tableText).toContain('CA02');
    });

    test('TC-DX-SRCH-003: Empty search query restores default full diagnosis listing', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await dxPage.search('Tonsillitis');
      await dxPage.clearSearch();

      const count = await dxPage.getRowCount();
      expect(count).toBeGreaterThanOrEqual(5);
    });

    test('TC-DX-SRCH-004: Non-existent query gracefully returns zero rows without breaking UI', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await dxPage.search('NonExistentCondition_XYZ_99999');
      const count = await dxPage.getRowCount();
      expect(count).toBe(0);
    });
  });

  // =========================================================================
  // 3. Add Custom Diagnosis (Create)
  // =========================================================================
  test.describe('3. Add Custom Diagnosis Modal & Creation', () => {
    test('TC-DX-ADD-001: Clicking "Add" button opens Add Diagnosis modal with required inputs', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await dxPage.openAddDialog();
      await expect(dxPage.addDialog).toBeVisible();
      await expect(dxPage.addDialogTitle).toBeVisible();
      await expect(dxPage.addDescriptionInput).toBeVisible();
      await expect(dxPage.addCodeInput).toBeVisible();
      await expect(dxPage.addSaveButton).toBeVisible();

      await dxPage.closeDialog();
    });

    test('TC-DX-ADD-002: Dismissing Add Diagnosis dialog via Close button cancels without saving', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await dxPage.openAddDialog();
      await dxPage.addDescriptionInput.fill('Temporary Unsaved Draft Condition');
      await dxPage.closeDialog();

      await expect(dxPage.addDialog).not.toBeVisible();
    });

    test('TC-DX-ADD-003: Successfully creates new custom diagnosis with Name and ICD Code', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await dxPage.createDiagnosis(testDxName, testIcdCode);

      // Verify newly created diagnosis is searchable and displayed with 'Custom' badge
      await dxPage.search(testDxName);
      const rowCount = await dxPage.getRowCount();
      expect(rowCount).toBeGreaterThanOrEqual(1);

      const matchingRow = page.locator('table tbody tr', { hasText: testDxName }).first();
      await expect(matchingRow).toBeVisible();
      await expect(matchingRow).toContainText('Custom');
      await expect(matchingRow).toContainText(testIcdCode);
    });
  });

  // =========================================================================
  // Helper: Ensures test diagnosis exists for isolated test runs (Playwright UI)
  // =========================================================================
  /**
   * @param {DiagnosisPage} dxPage
   * @param {string} name
   * @param {string} [code]
   */
  async function ensureDiagnosisExists(dxPage, name, code = 'DX-AUTO') {
    await dxPage.search(name);
    const matchingRow = dxPage.page.locator('table tbody tr', { hasText: name }).first();
    const isFound = await matchingRow.isVisible().catch(() => false);
    if (!isFound) {
      await dxPage.createDiagnosis(name, code);
      await dxPage.search(name);
    }
  }

  // =========================================================================
  // 4. Edit & Update Custom Diagnosis (Update)
  // =========================================================================
  test.describe('4. Edit & Update Custom Diagnosis', () => {
    test('TC-DX-EDIT-001: Clicking custom diagnosis row opens Edit modal with pre-populated values', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await ensureDiagnosisExists(dxPage, testDxName, testIcdCode);
      await dxPage.openDiagnosisRow(testDxName);

      await expect(dxPage.editDialog).toBeVisible();
      await expect(dxPage.editDialogTitle).toBeVisible();
      await expect(dxPage.editDescriptionInput).toHaveValue(testDxName);
      await expect(dxPage.editCodeInput).toHaveValue(testIcdCode);
      await expect(dxPage.editSaveButton).toBeVisible();
      await expect(dxPage.editDeleteButton).toBeVisible();

      await dxPage.closeDialog();
    });

    test('TC-DX-EDIT-002: Updates custom diagnosis name and ICD code successfully', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await ensureDiagnosisExists(dxPage, testDxName, testIcdCode);
      await dxPage.openDiagnosisRow(testDxName);

      await dxPage.updateDiagnosis(updatedDxName, updatedIcdCode);

      // Verify updated record in search
      await dxPage.search(updatedDxName);
      const updatedRow = page.locator('table tbody tr', { hasText: updatedDxName }).first();
      await expect(updatedRow).toBeVisible();
      await expect(updatedRow).toContainText(updatedIcdCode);
      await expect(updatedRow).toContainText('Custom');
    });
  });

  // =========================================================================
  // 5. Global Reference Diagnosis Handling
  // =========================================================================
  test.describe('5. Global Reference Diagnosis Workflow', () => {
    test('TC-DX-GLOB-001: Clicking a Global reference diagnosis shows custom promotion notice and hides Delete button', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await dxPage.openFirstGlobalDiagnosis();

      await expect(dxPage.editDialog).toBeVisible();
      await expect(dxPage.globalInfoNotice).toBeVisible();
      await expect(dxPage.globalSaveCustomButton).toBeVisible();
      // Ensure global reference entries cannot be deleted by providers
      await expect(dxPage.editDeleteButton).not.toBeVisible();

      await dxPage.closeDialog();
    });
  });

  // =========================================================================
  // 6. Delete Custom Diagnosis (Delete)
  // =========================================================================
  test.describe('6. Delete Custom Diagnosis', () => {
    test('TC-DX-DEL-001: Successfully deletes custom diagnosis and removes it from table', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      // Ensure test record exists (handles isolated execution in UI mode)
      await ensureDiagnosisExists(dxPage, updatedDxName, updatedIcdCode);
      await dxPage.openDiagnosisRow(updatedDxName);

      await dxPage.deleteDiagnosis();

      // Verify record is completely removed from table
      const matchingRow = page.locator('table tbody tr', { hasText: updatedDxName });
      await expect(matchingRow).toHaveCount(0);
    });
  });

  // =========================================================================
  // 7. Pagination Controls
  // =========================================================================
  test.describe('7. Pagination Flow', () => {
    test('TC-DX-PAG-001: Clicking "Next" advances to Page 2 and updates page indicator', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      const initialIndicator = await dxPage.getPageIndicatorText();
      expect(initialIndicator).toMatch(/^1\//);

      await dxPage.nextPage();

      const nextIndicator = await dxPage.getPageIndicatorText();
      expect(nextIndicator).toMatch(/^2\//);
    });

    test('TC-DX-PAG-002: Clicking "Previous" returns to Page 1', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await dxPage.nextPage();
      expect(await dxPage.getPageIndicatorText()).toMatch(/^2\//);

      await dxPage.prevPage();
      expect(await dxPage.getPageIndicatorText()).toMatch(/^1\//);
    });
  });

  // =========================================================================
  // 8. Cross-Module Navigation
  // =========================================================================
  test.describe('8. Cross-Module Sidebar Navigation', () => {
    test('TC-DX-NAV-001: Cross-navigates from /admin/diagnosis to /admin/admissions', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await dxPage.sidebarAdmissionsLink.click();
      await page.waitForURL('**/admin/admissions**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/admissions');
    });

    test('TC-DX-NAV-002: Cross-navigates from /admin/diagnosis to /admin/drugs', async ({ page }) => {
      const dxPage = new DiagnosisPage(page);
      await dxPage.goto();

      await dxPage.sidebarDrugCabinetLink.click();
      await page.waitForURL('**/admin/drugs**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/drugs');
    });
  });
});
