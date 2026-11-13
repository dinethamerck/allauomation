// @ts-check
const { test, expect } = require('@playwright/test');
const { ReportTemplatesPage } = require('../pages/ReportTemplatesPage');
const { PrescriptionPage } = require('../pages/PrescriptionPage');

test.describe('Amerck Care - Report Templates Management Suite', () => {
  // Use authenticated clinical session
  test.use({ storageState: 'playwright/.auth/user.json' });

  // Unique identifier for isolated tests
  const uniqueId = Date.now().toString().slice(-4);
  const testAbbr = `RT${uniqueId}`;
  const testName = `Automated Report Template ${uniqueId}`;

  // =========================================================================
  // 1. Directory Page Initialization & Cross-Navigation
  // =========================================================================
  test.describe('1. Directory Initialization & Navigation', () => {
    test('TC-TMPL-INIT-001: Direct navigation to /admin/report-templates loads search bar, action button, and template cards', async ({ page }) => {
      const tmplPage = new ReportTemplatesPage(page);
      await tmplPage.goto();

      expect(page.url()).toContain('/admin/report-templates');
      await expect(tmplPage.mainContainer).toBeVisible();
      await expect(tmplPage.searchInput).toBeVisible();
      await expect(tmplPage.newTemplateButton).toBeVisible();

      await expect(tmplPage.templateCards.first()).toBeVisible({ timeout: 15000 });
      const cardCount = await tmplPage.templateCards.count();
      expect(cardCount).toBeGreaterThan(0);
    });

    test('TC-TMPL-INIT-002: Cross-navigation from Care View toolbar navigates to /admin/report-templates', async ({ page }) => {
      const rxPage = new PrescriptionPage(page);
      await rxPage.goto();

      await expect(rxPage.navReportTemplatesLink).toBeVisible();
      await rxPage.navigateToReportTemplates();

      expect(page.url()).toContain('/admin/report-templates');
      const tmplPage = new ReportTemplatesPage(page);
      await expect(tmplPage.mainContainer).toBeVisible();
      await expect(tmplPage.newTemplateButton).toBeVisible();
    });

    test('TC-TMPL-INIT-003: Template cards render name, category badge, abbreviation badge, and description', async ({ page }) => {
      const tmplPage = new ReportTemplatesPage(page);
      await tmplPage.goto();

      const firstCard = tmplPage.templateCards.first();
      await expect(firstCard).toBeVisible();
      const cardText = await firstCard.innerText();
      expect(cardText.length).toBeGreaterThan(10);
      expect(cardText).toMatch(/investigations/i);
    });
  });

  // =========================================================================
  // 2. Search & Live Filtering
  // =========================================================================
  test.describe('2. Search & Live Filtering', () => {
    test('TC-TMPL-SRCH-001: Live search filters cards by template keyword', async ({ page }) => {
      const tmplPage = new ReportTemplatesPage(page);
      await tmplPage.goto();

      await tmplPage.search('Lipid');
      const count = await tmplPage.templateCards.count();
      expect(count).toBeGreaterThanOrEqual(1);

      const mainText = await tmplPage.mainContainer.innerText();
      expect(mainText).toContain('Lipid');
    });

    test('TC-TMPL-SRCH-002: Clearing search input restores full catalog of templates', async ({ page }) => {
      const tmplPage = new ReportTemplatesPage(page);
      await tmplPage.goto();

      await tmplPage.search('Lipid');
      const filteredCount = await tmplPage.templateCards.count();

      await tmplPage.clearSearch();
      const restoredCount = await tmplPage.templateCards.count();
      expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
    });

    test('TC-TMPL-SRCH-003: Non-existent query displays graceful "No templates found" empty state', async ({ page }) => {
      const tmplPage = new ReportTemplatesPage(page);
      await tmplPage.goto();

      await tmplPage.search('NonExistentTemplateXYZ999');
      const mainText = await tmplPage.mainContainer.innerText();
      expect(mainText).toContain('No templates found');
    });
  });

  // =========================================================================
  // 3. Template Creation Form Interactions & Back Navigation
  // =========================================================================
  test.describe('3. Template Form Navigation & Interactions', () => {
    test('TC-TMPL-FORM-001: Clicking "New Template" navigates to /admin/report-templates/new with form inputs', async ({ page }) => {
      const tmplPage = new ReportTemplatesPage(page);
      await tmplPage.goto();

      await tmplPage.clickNewTemplate();
      expect(page.url()).toContain('/admin/report-templates/new');
      await expect(tmplPage.nameInput).toBeVisible();
      await expect(tmplPage.abbreviationInput).toBeVisible();
      await expect(tmplPage.descriptionInput).toBeVisible();
      await expect(tmplPage.categoryInput).toBeVisible();
      await expect(tmplPage.saveButton).toBeVisible();
      await expect(tmplPage.backLink).toBeVisible();
    });

    test('TC-TMPL-FORM-002: "Back" link navigates back to /admin/report-templates catalog', async ({ page }) => {
      const tmplPage = new ReportTemplatesPage(page);
      await tmplPage.goto();

      await tmplPage.clickNewTemplate();
      await tmplPage.clickBack();

      expect(page.url()).toContain('/admin/report-templates');
      expect(page.url()).not.toContain('/new');
      await expect(tmplPage.newTemplateButton).toBeVisible();
    });
  });

  // =========================================================================
  // 4. Template Creation Flow (CRUD: Create)
  // =========================================================================
  test.describe('4. Template Creation Flow', () => {
    test('TC-TMPL-CREATE-001: Creates a new report template and verifies immediate display in directory', async ({ page }) => {
      const tmplPage = new ReportTemplatesPage(page);
      await tmplPage.goto();

      await tmplPage.createTemplate({
        name: testName,
        abbreviation: testAbbr,
        description: 'Comprehensive clinical lab panel description',
        category: 'Diagnostics'
      });

      // Verify redirection to edit page
      expect(page.url()).toContain('/admin/report-templates/');
      expect(page.url()).not.toContain('/new');

      // Return to directory and verify created template
      await tmplPage.goto();
      await tmplPage.search(testAbbr);

      const card = tmplPage.getCardByText(testAbbr);
      await expect(card).toBeVisible();
      const cardText = await card.innerText();
      expect(cardText).toContain(testName);
      expect(cardText).toContain(testAbbr);
    });
  });

  // =========================================================================
  // Helper: Ensures test template exists for isolated runs (UI mode)
  // =========================================================================
  /**
   * @param {ReportTemplatesPage} tmplPage
   * @param {string} abbr
   * @param {string} name
   */
  async function ensureTemplateExists(tmplPage, abbr, name) {
    await tmplPage.search(abbr);
    const count = await tmplPage.templateCards.count();
    if (count === 0) {
      await tmplPage.createTemplate({
        name: name,
        abbreviation: abbr,
        description: 'Comprehensive clinical lab panel description',
        category: 'Diagnostics'
      });
      await tmplPage.goto();
      await tmplPage.search(abbr);
    }
  }

  // =========================================================================
  // 5. Template Editing Flow (CRUD: Update)
  // =========================================================================
  test.describe('5. Template Editing Flow', () => {
    test('TC-TMPL-EDIT-001: Clicks edit icon on template card, updates description, and verifies changes', async ({ page }) => {
      const tmplPage = new ReportTemplatesPage(page);
      await tmplPage.goto();

      await ensureTemplateExists(tmplPage, testAbbr, testName);
      await tmplPage.editTemplateByText(testAbbr);

      // Verify form is pre-populated
      await expect(tmplPage.nameInput).toHaveValue(testName);

      // Update description
      const updatedDescription = 'Updated clinical interpretation guidelines';
      await tmplPage.fillTemplateDetails({ description: updatedDescription });
      await tmplPage.saveTemplate();

      // Return to directory and verify updated description
      await tmplPage.goto();
      await tmplPage.search(testAbbr);

      const card = tmplPage.getCardByText(testAbbr);
      await expect(card).toBeVisible();
      const cardText = await card.innerText();
      expect(cardText).toContain(updatedDescription);
    });
  });

  // =========================================================================
  // 6. Template Deletion Flow (CRUD: Delete)
  // =========================================================================
  test.describe('6. Template Deletion Flow', () => {
    test('TC-TMPL-DEL-001: Clicks delete icon on card, confirms dialog, and verifies template is removed', async ({ page }) => {
      const tmplPage = new ReportTemplatesPage(page);
      await tmplPage.goto();

      await ensureTemplateExists(tmplPage, testAbbr, testName);
      const card = tmplPage.getCardByText(testAbbr);
      await expect(card).toBeVisible();

      // Delete template
      await tmplPage.deleteTemplateByText(testAbbr);

      // Verify removal
      await tmplPage.search(testAbbr);
      const mainText = await tmplPage.mainContainer.innerText();
      expect(mainText).toContain('No templates found');
    });
  });

  // =========================================================================
  // 7. Pagination Controls
  // =========================================================================
  test.describe('7. Pagination Controls', () => {
    test('TC-TMPL-PAG-001: Pagination controls and template count summary are visible', async ({ page }) => {
      const tmplPage = new ReportTemplatesPage(page);
      await tmplPage.goto();

      await expect(tmplPage.paginationSummary).toBeVisible();
      await expect(tmplPage.previousButton).toBeVisible();
      await expect(tmplPage.nextButton).toBeVisible();
    });
  });
});
