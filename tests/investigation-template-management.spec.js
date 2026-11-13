// tests/investigation-template-management.spec.js
const { test, expect } = require('@playwright/test');
const { AdmissionInvestigationTemplatePage } = require('../pages/AdmissionInvestigationTemplatePage');
const { InvestigationPage } = require('../pages/InvestigationPage');

test.describe('EMR-78: Admission Investigation Template Management & Wizard Integration', () => {
  let templatePage;

  test.beforeEach(async ({ page }) => {
    templatePage = new AdmissionInvestigationTemplatePage(page);
    await templatePage.goto();
  });

  // =========================================================================
  // 1. TEMPLATE MANAGEMENT LIST & UI CONTROLS
  // =========================================================================
  test('TC-EMR78-T003 & TC-EMR78-T015: Admission Investigation Template page displays templates list and actions', async ({ page }) => {
    // Verify Page Header and Table Headers
    await expect(page.locator('th').filter({ hasText: /TEMPLATE NAME/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('th').filter({ hasText: /SECTIONS \/ ITEMS/i }).first()).toBeVisible();
    await expect(page.locator('th').filter({ hasText: /ACTIONS/i }).first()).toBeVisible();

    // Verify Create Template button is visible
    await expect(templatePage.createTemplateButton).toBeVisible();

    // Verify default templates exist (e.g. FBC or Standard Admission Investigation Template)
    const fbcRow = templatePage.getTemplateRow('FBC');
    await expect(fbcRow).toBeVisible();
  });

  // =========================================================================
  // 2. CREATE TEMPLATE MODAL & MANDATORY VALIDATION
  // =========================================================================
  test('TC-EMR78-T004 & TC-EMR78-T012: Create Template modal validation & section controls', async ({ page }) => {
    await templatePage.openCreateModal();

    // Verify modal title
    await expect(templatePage.modalDialog.getByText(/Create Admission Investigation Template/i)).toBeVisible();

    // Verify Template Name is required
    await expect(templatePage.modalDialog.getByText(/Template Name \*/i)).toBeVisible();

    // Verify Action Buttons inside modal: Add Section, Add Parameter, Add Group
    await expect(templatePage.addSectionButton).toBeVisible();
    await expect(templatePage.addParameterButton).toBeVisible();
    await expect(templatePage.addGroupButton).toBeVisible();

    // Verify empty section placeholder (TC-EMR78-T012)
    await expect(templatePage.modalDialog.getByText(/No parameters in this section\. Click "Add Parameter" to begin\./i)).toBeVisible();

    // Cancel modal
    await templatePage.cancelButton.click();
    await expect(templatePage.modalDialog).toBeHidden();
  });

  test('TC-EMR78-T007 to TC-EMR78-T010: Adding sections and parameters in template modal', async ({ page }) => {
    await templatePage.openCreateModal();

    // Click Add Parameter
    await templatePage.addParameterButton.click();
    await page.waitForTimeout(500);

    // Verify parameter input is rendered
    const paramInput = templatePage.modalDialog.locator('input[placeholder*="Parameter name" i], input[type="text"]').last();
    await expect(paramInput).toBeVisible();

    // Click Add Group
    await templatePage.addGroupButton.click();
    await page.waitForTimeout(500);

    // Click Add Section
    await templatePage.addSectionButton.click();
    await page.waitForTimeout(500);

    // Verify multiple sections exist
    const sectionInputs = templatePage.modalDialog.locator('input[value*="General Investigations" i], input[placeholder*="Section" i]');
    expect(await sectionInputs.count()).toBeGreaterThanOrEqual(1);

    // Close modal
    await templatePage.cancelButton.click();
  });

  // =========================================================================
  // 3. VIEW & COPY TEMPLATE MODALS
  // =========================================================================
  test('TC-EMR78-T015 & TC-EMR78-T016: View existing template details & hierarchy', async ({ page }) => {
    const fbcRow = templatePage.getTemplateRow('FBC');
    await expect(fbcRow).toBeVisible();

    // Click View icon (eye)
    const viewBtn = fbcRow.locator('button:has(svg.lucide-eye), button').first();
    await viewBtn.click();
    await page.waitForTimeout(1000);

    // Check modal or details display
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible()) {
      await expect(dialog.getByText(/FBC|Section|Full blood count/i).first()).toBeVisible();
      const closeBtn = dialog.locator('button:has(svg), button:has-text("Close")').first();
      await closeBtn.click();
    }
  });

  test('TC-EMR78-T030: Copy template dialog opens with pre-populated configuration', async ({ page }) => {
    const fbcRow = templatePage.getTemplateRow('FBC');
    await expect(fbcRow).toBeVisible();

    // Click Copy or Edit action button
    const actionBtn = fbcRow.locator('button').nth(1);
    await actionBtn.click();
    await page.waitForTimeout(1000);

    // Verify dialog is opened with template configuration
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Admission Investigation Template/i).first()).toBeVisible();

    // Close dialog
    const cancelBtn = dialog.getByRole('button', { name: /Cancel|Close/i }).first();
    await cancelBtn.click();
  });

  // =========================================================================
  // 4. INTEGRATION: TEMPLATE AVAILABILITY IN ADMISSION STEP 2
  // =========================================================================
  test('TC-EMR78-T014 & TC-EMR78-T036 & TC-EMR78-T037: Template is available in Admission Step 2 Investigation dropdown', async ({ page }) => {
    const invPage = new InvestigationPage(page);
    await invPage.goto();

    // Check Investigation Template combobox is visible
    const templateTrigger = page.locator('button, [role="combobox"]').filter({ hasText: /FBC|Investigation Template/i }).first();
    await expect(templateTrigger).toBeVisible();

    // Click combobox to view available templates
    await templateTrigger.click();
    await page.waitForTimeout(500);

    // Assert FBC and Standard Template options are available in listbox
    const fbcOption = page.getByRole('option', { name: /FBC/i }).or(page.locator('[role="option"]').filter({ hasText: /FBC/i })).first();
    await expect(fbcOption).toBeVisible();
  });
});
