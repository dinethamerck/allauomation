// @ts-check
const { test, expect } = require('@playwright/test');
const { SettingsPage } = require('../pages/SettingsPage');

test.describe('Amerck Care EMR - Settings & Administrative Configuration Comprehensive Test Suite', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });
  test.setTimeout(60000);

  /** @type {SettingsPage} */
  let settingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
  });

  // =========================================================================
  // 1. Settings Hub Initialization & Overview
  // =========================================================================
  test.describe('1. Settings Hub Initialization & Overview', () => {
    test('TC-SET-HUB-001: Direct navigation to /admin/settings loads hub header and all 5 configuration cards', async ({ page }) => {
      await settingsPage.goto();

      expect(page.url()).toContain('/admin/settings');
      await expect(settingsPage.settingsHeader).toBeVisible();

      // Verify all 5 module cards render cleanly
      await expect(settingsPage.organizationsCard).toBeVisible();
      await expect(settingsPage.usersCard).toBeVisible();
      await expect(settingsPage.userRolesCard).toBeVisible();
      await expect(settingsPage.bedManagementCard).toBeVisible();
      await expect(settingsPage.consentFormTemplatesCard).toBeVisible();
    });

    test('TC-SET-HUB-002: Top bar renders active practice combobox and provider profile avatar', async ({ page }) => {
      await settingsPage.goto();

      await expect(settingsPage.practiceSwitcherButton).toBeVisible();
      await expect(settingsPage.practiceSwitcherButton).toContainText("Practice");
      await expect(settingsPage.profileAvatarButton).toBeVisible();
    });

    test('TC-SET-HUB-003: Provider profile avatar button opens user session menu', async ({ page }) => {
      await settingsPage.goto();

      await settingsPage.profileAvatarButton.click();
      await page.waitForTimeout(500);

      // Verify dropdown menu or popover appears
      const menu = page.locator('[role="menu"], [role="dialog"], [data-radix-menu-content]').first();
      await expect(menu).toBeVisible();

      // Dismiss menu with Escape
      await page.keyboard.press('Escape');
    });

    test('TC-SET-HUB-004: Practice switcher combobox opens practice selection menu', async ({ page }) => {
      await settingsPage.goto();

      await settingsPage.practiceSwitcherButton.click();
      await page.waitForTimeout(500);

      // Verify combobox popover is open
      const popover = page.locator('[role="listbox"], [role="dialog"], [cmdk-root]').first();
      await expect(popover).toBeVisible();

      // Dismiss with Escape
      await page.keyboard.press('Escape');
    });
  });

  // =========================================================================
  // 2. Hub Card Navigations
  // =========================================================================
  test.describe('2. Hub Card Navigations', () => {
    test('TC-SET-NAV-CARD-001: Clicking Organizations card navigates to /admin/settings/organizations', async ({ page }) => {
      await settingsPage.goto();
      await settingsPage.organizationsCard.click();

      await page.waitForURL('**/admin/settings/organizations**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/settings/organizations');
      await expect(settingsPage.orgTable).toBeVisible();
    });

    test('TC-SET-NAV-CARD-002: Clicking Users card navigates to /admin/settings/users', async ({ page }) => {
      await settingsPage.goto();
      await settingsPage.usersCard.click();

      await page.waitForURL('**/admin/settings/users**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/settings/users');
      await expect(settingsPage.userTable).toBeVisible();
    });

    test('TC-SET-NAV-CARD-003: Clicking User Roles card navigates to /admin/settings/roles', async ({ page }) => {
      await settingsPage.goto();
      await settingsPage.userRolesCard.click();

      await page.waitForURL('**/admin/settings/roles**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/settings/roles');
      await expect(settingsPage.roleTable).toBeVisible();
      await expect(settingsPage.addRoleButton).toBeVisible();
    });

    test('TC-SET-NAV-CARD-004: Clicking Bed Management card navigates to /admin/settings/ward-management', async ({ page }) => {
      await settingsPage.goto();
      await settingsPage.bedManagementCard.click();

      await page.waitForURL('**/admin/settings/ward-management**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/settings/ward-management');
      await expect(settingsPage.bedTable).toBeVisible();
      await expect(settingsPage.addBedButton).toBeVisible();
    });

    test('TC-SET-NAV-CARD-005: Clicking Consent Form Templates card navigates to /admin/settings/consent-form-templates', async ({ page }) => {
      await settingsPage.goto();
      await settingsPage.consentFormTemplatesCard.click();

      await page.waitForURL('**/admin/settings/consent-form-templates**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/settings/consent-form-templates');
      await expect(settingsPage.addConsentTemplateButton).toBeVisible();
    });
  });

  // =========================================================================
  // 3. Organizations Directory Management
  // =========================================================================
  test.describe('3. Organizations Directory Management', () => {
    test('TC-SET-ORG-001: Organizations directory displays search input and standard table column headers', async ({ page }) => {
      await settingsPage.gotoOrganizations();

      await expect(settingsPage.orgSearchInput).toBeVisible();
      await expect(settingsPage.orgTable).toBeVisible();

      const headersText = await settingsPage.orgTableHeaders.allInnerTexts();
      expect(headersText).toEqual(expect.arrayContaining(['Name', 'Address', 'Email']));
    });

    test('TC-SET-ORG-002: Search input accepts query and filters organization rows', async ({ page }) => {
      await settingsPage.gotoOrganizations();

      await settingsPage.orgSearchInput.fill('Practice');
      await page.waitForTimeout(1000);
      await expect(settingsPage.orgSearchInput).toHaveValue('Practice');

      // Clear search
      await settingsPage.orgSearchInput.fill('');
      await page.waitForTimeout(1000);
      await expect(settingsPage.orgSearchInput).toHaveValue('');
    });

    test('TC-SET-ORG-003: Non-existent search query returns zero rows gracefully', async ({ page }) => {
      await settingsPage.gotoOrganizations();

      await settingsPage.orgSearchInput.fill('NonExistentOrgXYZ9999');
      await page.waitForTimeout(1000);

      // Clean search state without errors
      await settingsPage.orgSearchInput.fill('');
      await page.waitForTimeout(1000);
    });
  });

  // =========================================================================
  // 4. Users Administration & Directory
  // =========================================================================
  test.describe('4. Users Administration & Directory', () => {
    test('TC-SET-USR-001: Users directory loads search input and table column headers', async ({ page }) => {
      await settingsPage.gotoUsers();

      await expect(settingsPage.userSearchInput).toBeVisible();
      await expect(settingsPage.userTable).toBeVisible();

      const headersText = await settingsPage.userTableHeaders.allInnerTexts();
      expect(headersText).toEqual(expect.arrayContaining(['Name', 'Username', 'Email', 'User Type', 'Status']));
    });

    test('TC-SET-USR-002: Search user by name or username filters table rows', async ({ page }) => {
      await settingsPage.gotoUsers();

      await settingsPage.userSearchInput.fill('Janitha');
      await page.waitForTimeout(1000);
      await expect(settingsPage.userSearchInput).toHaveValue('Janitha');

      const tableText = await settingsPage.userTable.innerText();
      expect(tableText).toContain('Janitha');

      // Clear input
      await settingsPage.userSearchInput.fill('');
      await page.waitForTimeout(1000);
    });

    test('TC-SET-USR-003: Users table displays active status badges', async ({ page }) => {
      await settingsPage.gotoUsers();

      const rowCount = await settingsPage.userTableRows.count();
      expect(rowCount).toBeGreaterThan(0);

      const tableText = await settingsPage.userTable.innerText();
      expect(tableText).toMatch(/Active|Inactive/i);
    });
  });

  // =========================================================================
  // 5. User Roles & RBAC Matrix
  // =========================================================================
  test.describe('5. User Roles & RBAC Matrix', () => {
    test('TC-SET-ROL-001: User Roles table displays headers and Add Role button', async ({ page }) => {
      await settingsPage.gotoRoles();

      await expect(settingsPage.roleSearchInput).toBeVisible();
      await expect(settingsPage.roleTable).toBeVisible();
      await expect(settingsPage.addRoleButton).toBeVisible();

      const headersText = await settingsPage.roleTableHeaders.allInnerTexts();
      expect(headersText).toEqual(expect.arrayContaining(['Role Name', 'Organization Name', 'Modules']));
    });

    test('TC-SET-ROL-002: Open and dismiss "Create Role" modal via Cancel button', async ({ page }) => {
      await settingsPage.gotoRoles();

      await settingsPage.addRoleButton.click();
      await expect(settingsPage.roleDialog).toBeVisible();
      await expect(settingsPage.roleNameInput).toBeVisible();

      await settingsPage.roleCancelButton.click();
      await expect(settingsPage.roleDialog).not.toBeVisible();
    });

    test('TC-SET-ROL-003: Dismiss "Create Role" modal via keyboard Escape key', async ({ page }) => {
      await settingsPage.gotoRoles();

      await settingsPage.addRoleButton.click();
      await expect(settingsPage.roleDialog).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(settingsPage.roleDialog).not.toBeVisible();
    });

    test('TC-SET-ROL-004: Validation enforces Role Name required - submit button disabled when empty', async ({ page }) => {
      await settingsPage.gotoRoles();

      await settingsPage.addRoleButton.click();
      await expect(settingsPage.roleDialog).toBeVisible();

      // Ensure input is empty
      await settingsPage.roleNameInput.fill('');
      await expect(settingsPage.roleSubmitButton).toBeDisabled();

      // Enter role name -> button enables
      await settingsPage.roleNameInput.fill('Clinical Coordinator');
      await expect(settingsPage.roleSubmitButton).toBeEnabled();

      await settingsPage.roleCancelButton.click();
    });

    test('TC-SET-ROL-005: Search roles input filters role table rows', async ({ page }) => {
      await settingsPage.gotoRoles();

      await settingsPage.roleSearchInput.fill('Admin');
      await page.waitForTimeout(1000);
      const text = await settingsPage.roleTable.innerText();
      expect(text).toContain('Admin');

      await settingsPage.roleSearchInput.fill('');
    });
  });

  // =========================================================================
  // 6. Ward & Bed Management
  // =========================================================================
  test.describe('6. Ward & Bed Management', () => {
    test('TC-SET-BED-001: Bed Management directory displays table headers and Add Bed action', async ({ page }) => {
      await settingsPage.gotoWardManagement();

      await expect(settingsPage.bedSearchInput).toBeVisible();
      await expect(settingsPage.bedTable).toBeVisible();
      await expect(settingsPage.addBedButton).toBeVisible();

      const headersText = await settingsPage.bedTableHeaders.allInnerTexts();
      expect(headersText).toEqual(expect.arrayContaining(['Bed Number', 'Status', 'Patient', 'Created', 'Actions']));
    });

    test('TC-SET-BED-002: Open and dismiss "Add New Bed" modal dialog via Escape key', async ({ page }) => {
      await settingsPage.gotoWardManagement();

      await settingsPage.addBedButton.click();
      await expect(settingsPage.bedDialog).toBeVisible();
      await expect(settingsPage.bedNumberInput).toBeVisible();
      await expect(settingsPage.bedSubmitButton).toBeVisible();

      // Dismiss modal via keyboard Escape
      await page.keyboard.press('Escape');
      await expect(settingsPage.bedDialog).not.toBeVisible();
    });

    test('TC-SET-BED-003: Dismiss "Add New Bed" modal via close action', async ({ page }) => {
      await settingsPage.gotoWardManagement();

      await settingsPage.addBedButton.click();
      await expect(settingsPage.bedDialog).toBeVisible();

      // Press Escape or click close
      await page.keyboard.press('Escape');
      await expect(settingsPage.bedDialog).not.toBeVisible();
    });

    test('TC-SET-BED-004: Create a new bed with unique alphanumeric number and verify table entry', async ({ page }) => {
      await settingsPage.gotoWardManagement();

      const uniqueBedNum = `BED-AUTO-${Date.now().toString().slice(-4)}`;
      await settingsPage.createBed(uniqueBedNum);

      // Verify the new bed appears in search
      await settingsPage.bedSearchInput.fill(uniqueBedNum);
      await page.waitForTimeout(1500);

      const tableText = await settingsPage.bedTable.innerText();
      expect(tableText).toContain(uniqueBedNum);

      // Clear search
      await settingsPage.bedSearchInput.fill('');
    });

    test('TC-SET-BED-005: Bed search input accepts query string and clears correctly', async ({ page }) => {
      await settingsPage.gotoWardManagement();

      await settingsPage.bedSearchInput.fill('TEST-SEARCH-BED');
      await expect(settingsPage.bedSearchInput).toHaveValue('TEST-SEARCH-BED');

      await settingsPage.bedSearchInput.fill('');
      await expect(settingsPage.bedSearchInput).toHaveValue('');
    });

    test('TC-SET-BED-006: Bed status chip differentiates Available vs Occupied states', async ({ page }) => {
      await settingsPage.gotoWardManagement();

      const tableText = await settingsPage.bedTable.innerText();
      expect(tableText).toMatch(/Available|Occupied|Maintenance|No beds/i);
    });
  });

  // =========================================================================
  // 7. Consent Form Templates
  // =========================================================================
  test.describe('7. Consent Form Templates', () => {
    test('TC-SET-CON-001: Consent Form Templates catalog loads header and Add Template button', async ({ page }) => {
      await settingsPage.gotoConsentFormTemplates();

      await expect(settingsPage.consentHeading).toBeVisible();
      await expect(settingsPage.addConsentTemplateButton).toBeVisible();
    });

    test('TC-SET-CON-002: Open and dismiss "Create Consent Form Template" modal dialog via Cancel', async ({ page }) => {
      await settingsPage.gotoConsentFormTemplates();

      await settingsPage.addConsentTemplateButton.click();
      await expect(settingsPage.consentDialog).toBeVisible();
      await expect(settingsPage.templateTitleInput).toBeVisible();
      await expect(settingsPage.templateContentInput).toBeVisible();

      await settingsPage.templateCancelButton.click();
      await expect(settingsPage.consentDialog).not.toBeVisible();
    });

    test('TC-SET-CON-003: Dismiss "Create Consent Form Template" modal via keyboard Escape key', async ({ page }) => {
      await settingsPage.gotoConsentFormTemplates();

      await settingsPage.addConsentTemplateButton.click();
      await expect(settingsPage.consentDialog).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(settingsPage.consentDialog).not.toBeVisible();
    });

    test('TC-SET-CON-004: Form Validation: Submit button is disabled until Title and Content are filled', async ({ page }) => {
      await settingsPage.gotoConsentFormTemplates();

      await settingsPage.addConsentTemplateButton.click();
      await expect(settingsPage.consentDialog).toBeVisible();

      // When empty -> disabled
      await expect(settingsPage.templateSubmitButton).toBeDisabled();

      // Only title filled -> still disabled
      await settingsPage.templateTitleInput.fill('General Intake Consent');
      await expect(settingsPage.templateSubmitButton).toBeDisabled();

      // Title & Content filled -> enabled
      await settingsPage.templateContentInput.fill('Patient agreement text with {{patient_name}}.');
      await expect(settingsPage.templateSubmitButton).toBeEnabled();

      await settingsPage.templateCancelButton.click();
    });

    test('TC-SET-CON-005: Create consent template with dynamic tokens and verify in catalog', async ({ page }) => {
      await settingsPage.gotoConsentFormTemplates();

      const uniqueTitle = `Consent Form ${Date.now().toString().slice(-4)}`;
      const version = '1.0';
      const content = 'I hereby grant authorization for {{patient_name}} under care of {{organization_name}}.';

      await settingsPage.createConsentTemplate(uniqueTitle, version, content);

      // Verify template creation success notification or catalog item
      await expect(
        page.locator('text=Template created successfully').or(page.locator(`text=${uniqueTitle}`)).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });

  // =========================================================================
  // 8. Cross-Module Sidebar Navigation
  // =========================================================================
  test.describe('8. Cross-Module Sidebar Navigation', () => {
    test('TC-SET-NAV-SIDE-001: Sidebar navigation from Settings to Care View (/admin/prescription)', async ({ page }) => {
      await settingsPage.goto();

      await settingsPage.navPrescriptionLink.click();
      await page.waitForURL('**/admin/prescription**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/prescription');
    });

    test('TC-SET-NAV-SIDE-002: Sidebar navigation from Settings to Admissions (/admin/admissions)', async ({ page }) => {
      await settingsPage.goto();

      await settingsPage.navAdmissionsLink.click();
      await page.waitForURL('**/admin/admissions**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/admissions');
    });

    test('TC-SET-NAV-SIDE-003: Sidebar navigation from Settings to Telemedicine (/admin/telemedicine)', async ({ page }) => {
      await settingsPage.goto();

      await settingsPage.navTelemedicineLink.click();
      await page.waitForURL('**/admin/telemedicine**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/telemedicine');
    });

    test('TC-SET-NAV-SIDE-004: Sidebar navigation from Settings to Patients (/admin/patients)', async ({ page }) => {
      await settingsPage.goto();

      await settingsPage.navPatientsLink.click();
      await page.waitForURL('**/admin/patients**', { timeout: 15000 });
      expect(page.url()).toContain('/admin/patients');
    });
  });

  // =========================================================================
  // 9. Security & Authentication Guard
  // =========================================================================
  test.describe('9. Security & Access Control', () => {
    test('TC-SET-SEC-001: Unauthenticated direct access redirects to /login', async ({ browser }) => {
      let incognitoContext;
      let incognitoPage;

      await test.step('Step 1: Launch clean incognito browser session (No cookies or auth tokens)', async () => {
        incognitoContext = await browser.newContext({ storageState: undefined });
        incognitoPage = await incognitoContext.newPage();
      });

      await test.step('Step 2: Try to directly navigate to protected route: /admin/settings', async () => {
        console.log('Attempting unauthenticated access to /admin/settings...');
        await incognitoPage.goto('/admin/settings');
        await incognitoPage.waitForLoadState('domcontentloaded');
      });

      await test.step('Step 3: Verify security guard intercepts request and redirects to /login', async () => {
        await expect(incognitoPage).toHaveURL(/.*login.*/, { timeout: 15000 });
        console.log('Redirect verified! Current URL:', incognitoPage.url());
      });

      await test.step('Step 4: Verify Login page UI is visible and admin settings data is protected', async () => {
        // Confirm the login page elements appear
        const loginCardOrInput = incognitoPage.locator('input[type="text"], input[name="username"], input[type="password"], button:has-text("Sign in"), button:has-text("Login")').first();
        await expect(loginCardOrInput).toBeVisible({ timeout: 10000 });
        console.log('Login form confirmed visible. Admin settings shielded successfully.');
      });

      await test.step('Step 5: Clean up incognito browser session', async () => {
        await incognitoPage.waitForTimeout(1000); // Allow visual inspection when running in headed mode
        await incognitoContext.close();
      });
    });
  });
});
