// @ts-check
const { test, expect } = require('@playwright/test');
const { DrugCabinetPage } = require('../pages/DrugCabinetPage');

/**
 * End-to-end and Functional test suite for the Drug Cabinet admin module (/admin/drugs).
 * Categorized function-by-function and feature-by-feature.
 */

test.describe('Amerck Care - Drug Cabinet Module Test Suite', () => {
  /** @type {DrugCabinetPage} */
  let cabinetPage;

  test.beforeEach(async ({ page }) => {
    cabinetPage = new DrugCabinetPage(page);
    await cabinetPage.goto();
  });

  // =========================================================================
  // 1. Drug Listing & Header Structure
  // =========================================================================

  test.describe('Drug Cabinet Table & Grid Listing', () => {
    test('TC-CAB-LIST-001: Verifies drug table loads with required column headers', async () => {
      // Table should be visible
      await expect(cabinetPage.table).toBeVisible();

      // Headers should contain essential columns
      await expect(cabinetPage.tableHeaders).toContainText(['Generic Name', 'Brand Name', 'Strength', 'Frequency']);

      // Ensure at least one drug row is present
      const rowCount = await cabinetPage.tableRows.count();
      expect(rowCount).toBeGreaterThan(0);
      await expect(cabinetPage.tableRows.first()).toBeVisible();
    });

    test('TC-CAB-TOOLBAR-001: Verifies all toolbar action controls are present', async () => {
      await expect(cabinetPage.searchInput).toBeVisible();
      await expect(cabinetPage.addButton).toBeVisible();
      await expect(cabinetPage.presetsLink).toBeVisible();
      await expect(cabinetPage.populateButton).toBeVisible();
    });
  });

  // =========================================================================
  // 2. Search & Filtering
  // =========================================================================

  test.describe('Search & Filter Functionality', () => {
    test('TC-CAB-SEARCH-001: Filters drug list by generic name', async () => {
      // Search for a known generic drug
      await cabinetPage.searchDrug('Paracetamol');

      // Matching rows should contain search query
      const matchRows = cabinetPage.tableRows;
      await expect(matchRows.first()).toBeVisible();

      // Verify first visible row contains 'Paracetamol'
      await expect(matchRows.first()).toContainText('Paracetamol');
    });

    test('TC-CAB-SEARCH-002: Clearing search filter restores full list of drugs', async () => {
      // Search to filter down
      await cabinetPage.searchDrug('Paracetamol');
      await expect(cabinetPage.tableRows.first()).toContainText('Paracetamol');

      // Clear search input
      await cabinetPage.clearSearch();

      // Full list is restored with initial rows
      await expect(cabinetPage.tableRows.first()).toBeVisible();
      const restoredCount = await cabinetPage.tableRows.count();
      expect(restoredCount).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 3. Drug Addition (CRUD - Create)
  // =========================================================================

  test.describe('Add Drug Modal & Form Creation', () => {
    test('TC-CAB-ADD-001: Opens Add Drug dialog with expected input fields', async () => {
      await cabinetPage.openAddModal();

      await expect(cabinetPage.dialogTitle).toHaveText('Add Drug');
      await expect(cabinetPage.genericNameInput).toBeVisible();
      await expect(cabinetPage.brandNameInput).toBeVisible();
      await expect(cabinetPage.dosageInput).toBeVisible();
      await expect(cabinetPage.methodInput).toBeVisible();
      await expect(cabinetPage.frequencyInput).toBeVisible();
      await expect(cabinetPage.saveButton).toBeVisible();

      // Close dialog
      await cabinetPage.closeDialogButton.click();
      await expect(cabinetPage.dialog).toBeHidden();
    });

    test('TC-CAB-ADD-002: Successfully adds a new drug and displays it in cabinet', async () => {
      const uniqueId = Date.now().toString().slice(-4);
      const testGeneric = `TestDrug_${uniqueId}`;
      const testBrand = `TestBrand_${uniqueId}`;

      await cabinetPage.addDrug({
        genericName: testGeneric,
        brandName: testBrand,
        dosage: '500mg',
        method: 'Oral',
        frequency: 'TDS'
      });

      // Search for newly created drug
      await cabinetPage.searchDrug(testGeneric);

      // Verify it appears in table
      const createdRow = cabinetPage.getRow(testGeneric);
      await expect(createdRow.first()).toBeVisible();
      await expect(createdRow.first()).toContainText(testBrand);

      // Cleanup: delete the created drug
      await cabinetPage.deleteDrug(testGeneric);
    });
  });

  // =========================================================================
  // 4. Drug Editing & Modification (CRUD - Update)
  // =========================================================================

  test.describe('Edit Drug Functionality', () => {
    test('TC-CAB-EDIT-001: Clicking a row opens Edit Drug dialog and persists changes', async () => {
      const uniqueId = Date.now().toString().slice(-4);
      const testGeneric = `EditGen_${uniqueId}`;
      const initialBrand = `InitialBrand_${uniqueId}`;
      const updatedBrand = `UpdatedBrand_${uniqueId}`;

      // Create test drug first
      await cabinetPage.addDrug({
        genericName: testGeneric,
        brandName: initialBrand,
        dosage: '100mg'
      });

      // Search for it
      await cabinetPage.searchDrug(testGeneric);
      await expect(cabinetPage.getRow(testGeneric).first()).toBeVisible();

      // Edit the drug
      await cabinetPage.editDrug(testGeneric, {
        brandName: updatedBrand,
        dosage: '200mg'
      });

      // Verify updated brand is displayed
      await cabinetPage.searchDrug(testGeneric);
      const updatedRow = cabinetPage.getRow(testGeneric);
      await expect(updatedRow.first()).toContainText(updatedBrand);
      await expect(updatedRow.first()).toContainText('200mg');

      // Cleanup
      await cabinetPage.deleteDrug(testGeneric);
    });
  });

  // =========================================================================
  // 5. Drug Deletion (CRUD - Delete)
  // =========================================================================

  test.describe('Delete Drug Functionality', () => {
    test('TC-CAB-DELETE-001: Deletes a drug from the cabinet via the edit modal', async () => {
      const uniqueId = Date.now().toString().slice(-4);
      const testGeneric = `DelGen_${uniqueId}`;

      // Create temporary drug
      await cabinetPage.addDrug({
        genericName: testGeneric,
        brandName: `DelBrand_${uniqueId}`,
        dosage: '50mg'
      });

      // Verify created
      await cabinetPage.searchDrug(testGeneric);
      await expect(cabinetPage.getRow(testGeneric).first()).toBeVisible();

      // Delete it
      await cabinetPage.deleteDrug(testGeneric);

      // Verify deleted from table
      await cabinetPage.searchDrug(testGeneric);
      await expect(cabinetPage.getRow(testGeneric)).toHaveCount(0);
    });
  });

  // =========================================================================
  // 6. Navigation to Presets Page
  // =========================================================================

  test.describe('Presets Navigation', () => {
    test('TC-CAB-PRESETS-001: Navigates to Presets page via Presets link', async ({ page }) => {
      await cabinetPage.presetsLink.click();
      await page.waitForURL('**/admin/drugs/presets', { timeout: 10000 });
      expect(page.url()).toContain('/admin/drugs/presets');
    });
  });
});
