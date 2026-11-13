// global-setup.js
require('dotenv').config();
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Checks whether the JWT token in storageState is still valid for targetBaseUrl
 * @param {string} authPath
 * @param {string} targetBaseUrl
 * @returns {boolean}
 */
function isTokenValid(authPath, targetBaseUrl) {
  try {
    if (!fs.existsSync(authPath)) return false;
    const data = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    
    // Check if origin matches targetBaseUrl
    if (targetBaseUrl) {
      try {
        const targetOrigin = new URL(targetBaseUrl).origin;
        const matchingOrigin = (data.origins || []).find(o => o.origin === targetOrigin);
        if (!matchingOrigin) {
          console.log(`[global-setup] Auth state is for a different origin. Needs refresh for ${targetOrigin}`);
          return false;
        }
      } catch (_) {}
    }

    // Check localStorage in origins
    for (const origin of data.origins || []) {
      for (const item of origin.localStorage || []) {
        if (item.name === 'token' && item.value) {
          const parts = item.value.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload.exp) {
              const expiresAtMs = payload.exp * 1000;
              const bufferMs = 15 * 60 * 1000; // 15 minute buffer
              if (expiresAtMs > Date.now() + bufferMs) {
                console.log(`[global-setup] Auth token is valid until ${new Date(expiresAtMs).toISOString()}`);
                return true;
              } else {
                console.log(`[global-setup] Auth token expired or expiring soon at ${new Date(expiresAtMs).toISOString()}`);
                return false;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[global-setup] Error reading existing auth state:', err.message);
  }
  return false;
}

/**
 * Global setup hook for Playwright: guarantees valid auth state
 */
async function globalSetup() {
  const authDir = path.join(__dirname, '.auth');
  const authFile = path.join(authDir, 'user.json');
  const baseUrl = (process.env.BASE_URL || 'https://qa_pg.amerck.care').replace(/\/+$/, '');

  if (isTokenValid(authFile, baseUrl)) {
    return;
  }

  console.log(`[global-setup] Refreshing authentication state for ${baseUrl}...`);
  const username = process.env.QA_CARE_USERNAME;
  const password = process.env.QA_CARE_PASSWORD;

  if (!username || !password) {
    console.warn('[global-setup] QA_CARE_USERNAME or QA_CARE_PASSWORD is not set in .env. Skipping login.');
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: baseUrl,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="user_name"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('input[name="user_name"]').fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
    await page.waitForTimeout(1500);

    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await page.context().storageState({ path: authFile });
    console.log(`[global-setup] Successfully saved authenticated state to ${authFile}`);
  } catch (err) {
    console.error('[global-setup] Failed to perform automated login:', err.message);
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;
module.exports.isTokenValid = isTokenValid;
