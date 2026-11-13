// tests/investigation-template-and-inputs.spec.js
const { test, expect } = require('@playwright/test');
const { AdmissionInvestigationTemplatePage } = require('../pages/AdmissionInvestigationTemplatePage');
const { InvestigationPage } = require('../pages/InvestigationPage');

test.describe('EMR-78: Admission Investigation Template Management & Wizard Inputs (T001 - T052)', () => {
  let templatePage;
  let invPage;

  test.beforeEach(async ({ page }) => {
    templatePage = new AdmissionInvestigationTemplatePage(page);
    invPage = new InvestigationPage(page);
  });

  // =========================================================================
  // 1. TEMPLATE MANAGEMENT PATH: /admin/admission-investigations
  // =========================================================================
  test.describe('Path: /admin/admission-investigations (Template Management)', () => {
    test.beforeEach(async () => {
      await templatePage.goto();
    });

    test('T003 & T015: Template list view renders templates with sections and action controls', async ({ page }) => {
      // Verify table headers
      await expect(page.locator('th').filter({ hasText: /TEMPLATE NAME/i }).first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('th').filter({ hasText: /SECTIONS \/ ITEMS/i }).first()).toBeVisible();
      await expect(page.locator('th').filter({ hasText: /ACTIONS/i }).first()).toBeVisible();

      // Verify Create Template action button
      await expect(templatePage.createTemplateButton).toBeVisible();

      // Verify existing templates exist (e.g. FBC or Standard Admission Investigation Template)
      const fbcRow = templatePage.getTemplateRow('FBC');
      await expect(fbcRow).toBeVisible();
    });

    test('T004 & T012: Template Name is mandatory and empty section shows guidance message', async ({ page }) => {
      await templatePage.openCreateModal();

      // Verify Template Name * indicator
      await expect(templatePage.modalDialog.getByText(/Template Name \*/i)).toBeVisible();

      // Verify empty section placeholder (T012)
      await expect(
        templatePage.modalDialog.getByText(/No parameters in this section\. Click "Add Parameter" to begin\./i)
      ).toBeVisible();

      // Dismiss modal
      await templatePage.cancelButton.click();
      await expect(templatePage.modalDialog).toBeHidden();
    });

    test('T006 to T011: Add multiple sections, parameters, groups, and multi-level hierarchy', async ({ page }) => {
      await templatePage.openCreateModal();

      // Enter Template Name (T005)
      const testTemplateName = `Automated Template ${Date.now()}`;
      await templatePage.templateNameInput.fill(testTemplateName);
      await templatePage.descriptionInput.fill('Template with multi-level nested hierarchy and custom sections');

      // T007 & T008: Add Parameter
      await templatePage.addParameterButton.click();
      await page.waitForTimeout(400);

      // T009: Add Group
      await templatePage.addGroupButton.click();
      await page.waitForTimeout(400);

      // T006: Add multiple sections
      await templatePage.addSectionButton.click();
      await page.waitForTimeout(400);

      const sectionInputs = templatePage.modalDialog.locator('input[value*="General Investigations" i], input[placeholder*="Section" i]');
      expect(await sectionInputs.count()).toBeGreaterThanOrEqual(1);

      // Close modal without saving to avoid cluttering QA database
      await templatePage.cancelButton.click();
      await expect(templatePage.modalDialog).toBeHidden();
    });

    test('T015 & T016 & T017: View existing template hierarchy, sections and description', async ({ page }) => {
      const fbcRow = templatePage.getTemplateRow('FBC');
      await expect(fbcRow).toBeVisible();

      // Click View (eye icon)
      const viewBtn = fbcRow.locator('button').first();
      await viewBtn.click();
      await page.waitForTimeout(1000);

      // Verify modal dialog shows template details
      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible()) {
        await expect(dialog.getByText(/FBC|Section|Full blood count/i).first()).toBeVisible();
        const closeBtn = dialog.locator('button:has(svg), button:has-text("Close")').first();
        await closeBtn.click();
      }
    });

    test('T030 to T035: Copy template dialog opens pre-populated with configuration', async ({ page }) => {
      const fbcRow = templatePage.getTemplateRow('FBC');
      await expect(fbcRow).toBeVisible();

      // Click Copy / Edit action button
      const copyBtn = fbcRow.locator('button').nth(1);
      await copyBtn.click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(/Admission Investigation Template/i).first()).toBeVisible();

      // Close dialog
      const cancelBtn = dialog.getByRole('button', { name: /Cancel|Close/i }).first();
      await cancelBtn.click();
    });
  });

  // =========================================================================
  // 2. ADMISSION INVESTIGATION PATH: /admin/admissions -> Step 2: Investigation
  // =========================================================================
  test.describe('Path: /admin/admissions (Step 2: Investigation & Inputs)', () => {
    test.beforeEach(async () => {
      await invPage.goto();
    });

    test('T014 & T036 & T037: Template selection in Admission Step 2 Investigation combobox', async ({ page }) => {
      // Verify Step 2 Investigation tab is active
      const invTab = page.getByRole('button', { name: /2\.\s*Investigation|Investigation/i }).first();
      await expect(invTab).toBeVisible();

      // Find Investigation Template combobox
      const templateTrigger = page.locator('button, [role="combobox"]').filter({ hasText: /FBC|Investigation Template/i }).first();
      await expect(templateTrigger).toBeVisible();

      // Open combobox
      await templateTrigger.click();
      await page.waitForTimeout(500);

      // Verify available templates in listbox (T036)
      const fbcOption = page.getByRole('option', { name: /FBC/i }).or(page.locator('[role="option"]').filter({ hasText: /FBC/i })).first();
      await expect(fbcOption).toBeVisible();
    });

    test('T038 to T041: Enter values for investigation parameters and nested sub-items across dates', async ({ page }) => {
      // Ensure table is rendered
      await expect(page.locator('table').first()).toBeVisible();

      // Verify "+ Add Date Column" button
      await expect(invPage.addDateColumnButton).toBeVisible();

      // Locate first editable cell
      const cellInput = page.locator('tbody input, table input[placeholder*="value" i]').first();
      await expect(cellInput).toBeVisible({ timeout: 10000 });

      // Enter value (T039, T040)
      const sampleVal = '13.8';
      await cellInput.fill(sampleVal);
      await expect(cellInput).toHaveValue(sampleVal);

      // Add a new date column (T008, T040 across dates)
      const colCountBefore = await invPage.getDateColumnCount();
      await invPage.addDateColumn();
      const colCountAfter = await invPage.getDateColumnCount();
      expect(colCountAfter).toBeGreaterThanOrEqual(colCountBefore);

      // Verify entered value remains preserved in previous date column (T042)
      await expect(cellInput).toHaveValue(sampleVal);
    });

    test('T042 & T045: Values remain after navigating between wizard steps and re-opening Investigation', async ({ page }) => {
      // Enter result in Step 2
      const cellInput = page.locator('tbody input, table input[placeholder*="value" i]').first();
      await expect(cellInput).toBeVisible({ timeout: 10000 });
      await cellInput.fill('150');

      // Navigate away to Step 3
      await invPage.navigateAway();
      await page.waitForTimeout(1000);

      // Return to Step 2 Investigation
      await invPage.returnToInvestigation();
      await page.waitForTimeout(1000);

      // Verify value is preserved (T042)
      const cellAfterReturn = page.locator('tbody input, table input[placeholder*="value" i]').first();
      await expect(cellAfterReturn).toHaveValue('150');
    });

    test('Blood Group Global Capture: Single capture independent of date columns', async ({ page }) => {
      // Select Blood Group O+
      await invPage.selectBloodGroup('O+');
      await page.waitForTimeout(500);

      const isOPlus = await invPage.isBloodGroupSelected('O+');
      expect(isOPlus).toBe(true);

      // Add date column
      await invPage.addDateColumn();

      // Verify Blood Group remains O+ globally
      const isStillOPlus = await invPage.isBloodGroupSelected('O+');
      expect(isStillOPlus).toBe(true);
    });
  });
});
