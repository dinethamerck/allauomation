/** Settings > Configuration. There is no Save button: every toggle / text blur posts one key. */
class ConfigurationPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByText('Configuration', { exact: true });
  }

  /** Switches render "off" until GET /settings/configuration returns, so always wait for it. */
  async loaded(navigation) {
    const config = this.page.waitForResponse(r => r.url().endsWith('/settings/configuration') && r.request().method() === 'GET', { timeout: 60_000 });
    await navigation();
    await config;
    await this.page.getByRole('switch').first().waitFor();
    await this.page.waitForTimeout(300); // let React apply the response
  }

  goto() {
    return this.loaded(() => this.page.goto('/admin/settings/configuration'));
  }

  reload() {
    return this.loaded(() => this.page.reload());
  }

  label(text) {
    return this.page.locator(`xpath=//label[normalize-space()="${text}"]`);
  }

  switchFor(labelText) {
    return this.label(labelText).locator('xpath=following::*[@role="switch"][1]');
  }

  textFor(labelText) {
    return this.label(labelText).locator('xpath=following::input[1]');
  }

  async isOn(labelText) {
    const sw = this.switchFor(labelText);
    const checked = (await sw.getAttribute('aria-checked')) ?? (await sw.getAttribute('data-state'));
    return checked === 'true' || checked === 'checked';
  }

  waitForSave(key) {
    return this.page.waitForResponse(
      r => r.url().endsWith('/settings/configuration') && r.request().method() === 'POST' && (r.request().postData() || '').includes(`"${key}"`),
    );
  }

  /** Returns the request body that was posted. */
  async setToggle(labelText, key, on) {
    if ((await this.isOn(labelText)) === on) return null;
    const saved = this.waitForSave(key);
    await this.switchFor(labelText).click();
    return (await saved).request().postDataJSON();
  }

  async setText(labelText, key, value) {
    const input = this.textFor(labelText);
    const saved = this.waitForSave(key);
    await input.fill(value);
    await input.blur();
    return (await saved).request().postDataJSON();
  }
}

module.exports = { ConfigurationPage };
