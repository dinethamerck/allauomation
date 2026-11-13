// @ts-check

class SettingsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Header & Navigation elements
    this.settingsHeader = page.locator('span:has-text("Settings"), h1:has-text("Settings")').first();
    this.practiceSwitcherButton = page.locator('button[role="combobox"]').first();
    this.profileAvatarButton = page.locator('button:has-text("JR"), button[id^="radix-"]').last();

    // Settings Hub Cards (/admin/settings)
    this.organizationsCard = page.locator('a[href*="/admin/settings/organizations"]').first();
    this.usersCard = page.locator('a[href*="/admin/settings/users"]').first();
    this.userRolesCard = page.locator('a[href*="/admin/settings/roles"]').first();
    this.bedManagementCard = page.locator('a[href*="/admin/settings/ward-management"]').first();
    this.consentFormTemplatesCard = page.locator('a[href*="/admin/settings/consent-form-templates"]').first();

    // Organizations Subpage (/admin/settings/organizations)
    this.orgSearchInput = page.locator('input[placeholder="Search…"]').first();
    this.orgTable = page.locator('table').first();
    this.orgTableHeaders = page.locator('table th');
    this.orgTableRows = page.locator('table tbody tr');

    // Users Subpage (/admin/settings/users)
    this.userSearchInput = page.locator('input[placeholder="Search…"]').first();
    this.userTable = page.locator('table').first();
    this.userTableHeaders = page.locator('table th');
    this.userTableRows = page.locator('table tbody tr');

    // User Roles Subpage (/admin/settings/roles)
    this.roleSearchInput = page.locator('input[placeholder="Search…"]').first();
    this.roleTable = page.locator('table').first();
    this.roleTableHeaders = page.locator('table th');
    this.roleTableRows = page.locator('table tbody tr');
    this.addRoleButton = page.locator('button:has-text("Add Role")');
    this.roleDialog = page.locator('[role="dialog"]');
    this.roleNameInput = this.roleDialog.locator('input').first();
    this.roleSubmitButton = this.roleDialog.locator('button:has-text("Create Role")');
    this.roleCancelButton = this.roleDialog.locator('button:has-text("Cancel")');
    this.roleCloseButton = this.roleDialog.locator('button:has-text("Close"), button.absolute').first();

    // Bed Management Subpage (/admin/settings/ward-management)
    this.bedSearchInput = page.locator('input[placeholder*="Search beds by number"]').first();
    this.bedTable = page.locator('table').first();
    this.bedTableHeaders = page.locator('table th');
    this.bedTableRows = page.locator('table tbody tr');
    this.addBedButton = page.locator('button:has-text("Add Bed")');
    this.bedDialog = page.locator('[role="dialog"]');
    this.bedNumberInput = this.bedDialog.locator('input').first();
    this.bedSubmitButton = this.bedDialog.locator('button:has-text("Create Bed")');
    this.bedCloseButton = this.bedDialog.locator('button:has-text("Close"), button.absolute').first();
    this.bedCancelButton = this.bedCloseButton;

    // Consent Form Templates Subpage (/admin/settings/consent-form-templates)
    this.consentHeading = page.locator('text=Consent Form Templates').first();
    this.addConsentTemplateButton = page.locator('button:has-text("Add Template")');
    this.consentDialog = page.locator('[role="dialog"]');
    this.templateTitleInput = this.consentDialog.locator('input').first();
    this.templateVersionInput = this.consentDialog.locator('input').nth(1);
    this.templateContentInput = this.consentDialog.locator('textarea').first();
    this.templateSubmitButton = this.consentDialog.locator('button:has-text("Create Template")');
    this.templateCancelButton = this.consentDialog.locator('button:has-text("Cancel")');
    this.templateCloseButton = this.consentDialog.locator('button:has-text("Close"), button.absolute').first();

    // Sidebar navigation links
    this.navPrescriptionLink = page.locator('a[href*="/admin/prescription"]').first();
    this.navAdmissionsLink = page.locator('a[href*="/admin/admissions"]').first();
    this.navTelemedicineLink = page.locator('a[href*="/admin/telemedicine"]').first();
    this.navPatientsLink = page.locator('a[href*="/admin/patients"]').first();
    this.navScheduleLink = page.locator('a[href*="/admin/schedule"]').first();
  }

  /**
   * Navigate directly to /admin/settings
   */
  async goto() {
    await this.page.goto('/admin/settings', { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('span:has-text("Settings"), h1:has-text("Settings")', { timeout: 20000 });
  }

  /**
   * Navigate to Organizations subpage
   */
  async gotoOrganizations() {
    await this.page.goto('/admin/settings/organizations', { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('table', { timeout: 20000 });
  }

  /**
   * Navigate to Users subpage
   */
  async gotoUsers() {
    await this.page.goto('/admin/settings/users', { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('table', { timeout: 20000 });
  }

  /**
   * Navigate to User Roles subpage
   */
  async gotoRoles() {
    await this.page.goto('/admin/settings/roles', { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('table', { timeout: 20000 });
  }

  /**
   * Navigate to Ward / Bed Management subpage
   */
  async gotoWardManagement() {
    await this.page.goto('/admin/settings/ward-management', { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('table', { timeout: 20000 });
  }

  /**
   * Navigate to Consent Form Templates subpage
   */
  async gotoConsentFormTemplates() {
    await this.page.goto('/admin/settings/consent-form-templates', { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector('button:has-text("Add Template")', { timeout: 20000 });
  }

  /**
   * Create a new bed in Ward Management
   * @param {string} bedNumber
   */
  async createBed(bedNumber) {
    await this.addBedButton.click();
    await this.bedDialog.waitFor({ state: 'visible' });
    await this.bedNumberInput.fill(bedNumber);
    const postPromise = this.page.waitForResponse(
      res => res.url().includes('/beds') && res.request().method() === 'POST',
      { timeout: 15000 }
    );
    await this.bedSubmitButton.click();
    await postPromise;
    await this.page.waitForTimeout(1500);
    if (await this.bedDialog.isVisible()) {
      await this.page.keyboard.press('Escape');
    }
  }

  /**
   * Create a new custom role
   * @param {string} roleName
   */
  async createRole(roleName) {
    await this.addRoleButton.click();
    await this.roleDialog.waitFor({ state: 'visible' });
    await this.roleNameInput.fill(roleName);
    await this.roleSubmitButton.click();
    await this.page.waitForTimeout(1500);
    if (await this.roleDialog.isVisible()) {
      await this.page.keyboard.press('Escape');
    }
  }

  /**
   * Create a new consent form template
   * @param {string} title
   * @param {string} version
   * @param {string} content
   */
  async createConsentTemplate(title, version, content) {
    await this.addConsentTemplateButton.click();
    await this.consentDialog.waitFor({ state: 'visible' });
    await this.templateTitleInput.fill(title);
    if (version) {
      await this.templateVersionInput.fill(version);
    }
    await this.templateContentInput.fill(content);
    const postPromise = this.page.waitForResponse(
      res => res.url().includes('consent-forms/templates') && res.request().method() === 'POST',
      { timeout: 15000 }
    );
    await this.templateSubmitButton.click();
    await postPromise;
    await this.page.waitForTimeout(1500);
    if (await this.consentDialog.isVisible()) {
      await this.page.keyboard.press('Escape');
    }
  }
}

module.exports = { SettingsPage };
