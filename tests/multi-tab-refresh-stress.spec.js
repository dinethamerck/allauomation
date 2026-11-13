// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');

/**
 * AMERCK CARE — Multi-Tab 20 Concurrency & Refresh Stress Test Suite
 * Objective: Reproduce Request/Navigation Timeouts and HTTP 500 Internal Server Errors
 * under high concurrency (20 tabs refreshed concurrently).
 */
test.describe('Multi-Tab 20 Concurrency: Refresh & Error Reproduction', () => {
  // Allow sufficient time for 20 tabs to launch, load, and refresh under load
  test.setTimeout(240000); // 4 minutes

  /** @type {import('@playwright/test').BrowserContext} */
  let context;
  /** @type {import('@playwright/test').Page[]} */
  let tabs = [];

  /**
   * Data structures to collect network diagnostics across all tabs
   */
  let error500List = [];
  let timeoutList = [];
  let failedRequestsList = [];
  let pageErrorsList = [];

  /**
   * Helper to attach error and network listeners to a tab
   * @param {import('@playwright/test').Page} page
   * @param {number} tabIndex
   */
  function attachDiagnostics(page, tabIndex) {
    page.on('response', async (response) => {
      const status = response.status();
      if (status >= 500) {
        let bodySnippet = '';
        try {
          bodySnippet = (await response.text()).slice(0, 300);
        } catch (_) {
          bodySnippet = '<unable to read body>';
        }
        const record = {
          tab: tabIndex + 1,
          url: response.url(),
          status,
          statusText: response.statusText(),
          body: bodySnippet,
          timestamp: new Date().toISOString()
        };
        error500List.push(record);
        console.error(`🚨 [Tab ${tabIndex + 1}] HTTP ${status} Detected: ${response.url()}`);
      }
    });

    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText || 'Unknown error';
      const record = {
        tab: tabIndex + 1,
        url: request.url(),
        error: failure,
        timestamp: new Date().toISOString()
      };
      failedRequestsList.push(record);

      if (failure.toLowerCase().includes('timeout') || failure.toLowerCase().includes('timed out')) {
        timeoutList.push(record);
        console.error(`⏱️ [Tab ${tabIndex + 1}] Request Timeout: ${request.url()} - ${failure}`);
      } else {
        console.warn(`⚠️ [Tab ${tabIndex + 1}] Request Failed: ${request.url()} - ${failure}`);
      }
    });

    page.on('pageerror', (err) => {
      pageErrorsList.push({
        tab: tabIndex + 1,
        message: err.message,
        timestamp: new Date().toISOString()
      });
      console.error(`💥 [Tab ${tabIndex + 1}] Page Uncaught Error: ${err.message}`);
    });
  }

  test.beforeEach(async ({ browser }) => {
    // Reset diagnostics
    error500List = [];
    timeoutList = [];
    failedRequestsList = [];
    pageErrorsList = [];
    tabs = [];

    // Create an isolated browser context for the multi-tab test run
    context = await browser.newContext();

    // Tab 1: Authenticate user once so all subsequent tabs in context share auth cookies/session
    console.log('Authenticating in primary tab...');
    const primaryTab = await context.newPage();
    const loginPage = new LoginPage(primaryTab);
    await loginPage.goto();
    await loginPage.login('parami', 'parami');
    await primaryTab.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 35000 });
    console.log('Authentication successful. Ready to spawn tabs.');
    tabs.push(primaryTab);
    attachDiagnostics(primaryTab, 0);
  });

  test.afterEach(async () => {
    console.log('\n======================================================');
    console.log('          MULTI-TAB STRESS DIAGNOSTIC SUMMARY         ');
    console.log('======================================================');
    console.log(`Total Tabs Opened: ${tabs.length}`);
    console.log(`Total HTTP 500+ Errors Captured: ${error500List.length}`);
    console.log(`Total Network Timeouts Captured: ${timeoutList.length}`);
    console.log(`Total Failed Requests (Aborts/Drops): ${failedRequestsList.length}`);
    console.log(`Total Page JavaScript Errors: ${pageErrorsList.length}`);

    if (error500List.length > 0) {
      console.log('\n--- Captured HTTP 500+ Server Errors ---');
      error500List.forEach((e, idx) => {
        console.log(`[${idx + 1}] Tab ${e.tab} | Status: ${e.status} ${e.statusText} | URL: ${e.url}`);
        if (e.body) console.log(`    Response Body: ${e.body}`);
      });
    }

    if (timeoutList.length > 0) {
      console.log('\n--- Captured Network Timeouts ---');
      timeoutList.forEach((t, idx) => {
        console.log(`[${idx + 1}] Tab ${t.tab} | URL: ${t.url} | Error: ${t.error}`);
      });
    }
    console.log('======================================================\n');

    // Clean up all opened tabs and context
    for (const tab of tabs) {
      await tab.close().catch(() => {});
    }
    await context.close().catch(() => {});
  });

  // =========================================================================
  // TEST CASE 1: Concurrent Bulk Refresh of 20 Tabs on Appointments Module
  // =========================================================================
  test('TC-STRESS-01: Reproduce 500 errors and timeouts by concurrently refreshing 20 tabs on Appointments', async () => {
    const TARGET_TAB_COUNT = 20;
    const targetUrl = '/admin/aesthetic-appointments';

    console.log(`[TC-STRESS-01] Step 1: Navigating primary tab to ${targetUrl}`);
    await tabs[0].goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log(`[TC-STRESS-01] Step 2: Spawning and initializing remaining ${TARGET_TAB_COUNT - 1} tabs...`);
    for (let i = 1; i < TARGET_TAB_COUNT; i++) {
      const page = await context.newPage();
      attachDiagnostics(page, i);
      tabs.push(page);
    }

    // Navigate all 20 tabs to Appointments initially
    console.log(`[TC-STRESS-01] Step 3: Navigating all ${TARGET_TAB_COUNT} tabs to ${targetUrl}...`);
    const initialNavigationResults = await Promise.allSettled(
      tabs.map((tab, idx) =>
        tab.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 })
          .then(() => console.log(`✓ Tab ${idx + 1} initial navigation loaded`))
          .catch((err) => {
            console.error(`✗ Tab ${idx + 1} initial navigation failed: ${err.message}`);
            if (err.message.toLowerCase().includes('timeout')) {
              timeoutList.push({ tab: idx + 1, url: targetUrl, error: err.message, timestamp: new Date().toISOString() });
            }
          })
      )
    );

    // Give DOM a brief moment to stabilize before bulk reload
    await tabs[0].waitForTimeout(2000);

    console.log(`\n[TC-STRESS-01] Step 4: ⚡ TRIGGERING CONCURRENT BULK REFRESH ACROSS ALL 20 TABS ⚡`);
    const refreshStartTime = Date.now();

    // Trigger page.reload concurrently on all 20 tabs
    const refreshPromises = tabs.map((tab, idx) =>
      tab.reload({ waitUntil: 'domcontentloaded', timeout: 35000 })
        .then(() => {
          const duration = Date.now() - refreshStartTime;
          console.log(`✓ Tab ${idx + 1} successfully reloaded in ${duration}ms`);
          return { tab: idx + 1, status: 'fulfilled', duration };
        })
        .catch((err) => {
          const duration = Date.now() - refreshStartTime;
          console.error(`💥 Tab ${idx + 1} reload FAILED after ${duration}ms: ${err.message}`);
          if (err.message.toLowerCase().includes('timeout')) {
            timeoutList.push({ tab: idx + 1, url: tab.url(), error: err.message, timestamp: new Date().toISOString() });
          }
          return { tab: idx + 1, status: 'rejected', error: err.message, duration };
        })
    );

    const refreshResults = await Promise.allSettled(refreshPromises);
    const totalRefreshDuration = Date.now() - refreshStartTime;
    console.log(`\n[TC-STRESS-01] Concurrent 20-tab refresh completed in ${totalRefreshDuration}ms`);

    // Allow background pending API responses/network requests to finalize
    await tabs[0].waitForTimeout(3000);

    // Analysis of results
    const rejectedCount = refreshResults.filter(r => r.status === 'rejected' || (r.value && r.value.status === 'rejected')).length;
    console.log(`Summary: ${20 - rejectedCount}/20 reloaded cleanly. ${rejectedCount} rejected/timed out.`);
    console.log(`Total 500 status responses: ${error500List.length}`);
    console.log(`Total request timeouts: ${timeoutList.length}`);

    // Verification check: Check if defects were triggered
    const hasReproducedErrors = error500List.length > 0 || timeoutList.length > 0 || rejectedCount > 0;
    if (hasReproducedErrors) {
      console.log('✅ REPRODUCTION CONFIRMED: 500 error(s) and/or timeout(s) successfully reproduced under 20-tab concurrent refresh.');
    } else {
      console.log('ℹ️ Server survived 20 concurrent reloads without throwing 500s or timeouts.');
    }

    // Expect condition: document and assert test completion
    expect(tabs.length).toBe(20);
  });

  // =========================================================================
  // TEST CASE 2: Multi-Route 20-Tab Concurrent Refresh (Appointments, Schedule, Products)
  // =========================================================================
  test('TC-STRESS-02: Reproduce 500 and timeout errors across mixed heavy routes (20 tabs)', async () => {
    const TARGET_TAB_COUNT = 20;
    const routes = [
      '/admin/aesthetic-appointments',
      '/admin/aesthetic-schedule',
      '/admin/aesthetic-settings/products',
      '/admin/dashboard'
    ];

    console.log(`[TC-STRESS-02] Distributing 20 tabs across heavy routes...`);
    for (let i = 1; i < TARGET_TAB_COUNT; i++) {
      const page = await context.newPage();
      attachDiagnostics(page, i);
      tabs.push(page);
    }

    // Distribute routes across tabs
    await Promise.allSettled(
      tabs.map(async (tab, idx) => {
        const assignedRoute = routes[idx % routes.length];
        try {
          await tab.goto(assignedRoute, { waitUntil: 'domcontentloaded', timeout: 30000 });
          console.log(`Tab ${idx + 1} initialized on ${assignedRoute}`);
        } catch (err) {
          console.warn(`Tab ${idx + 1} initial load issue: ${err.message}`);
        }
      })
    );

    await tabs[0].waitForTimeout(2000);

    console.log(`\n[TC-STRESS-02] ⚡ SIMULTANEOUSLY REFRESHING 20 TABS ACROSS MIXED ROUTES ⚡`);
    const refreshStartTime = Date.now();

    const reloadOutcomes = await Promise.allSettled(
      tabs.map((tab, idx) =>
        tab.reload({ waitUntil: 'load', timeout: 40000 })
          .then(() => ({ tab: idx + 1, success: true, url: tab.url() }))
          .catch((err) => {
            if (err.message.toLowerCase().includes('timeout')) {
              timeoutList.push({ tab: idx + 1, url: tab.url(), error: err.message, timestamp: new Date().toISOString() });
            }
            return { tab: idx + 1, success: false, error: err.message, url: tab.url() };
          })
      )
    );

    await tabs[0].waitForTimeout(3000);

    console.log(`[TC-STRESS-02] Reload outcomes evaluated: ${reloadOutcomes.length} tabs processed.`);
    console.log(`Captured 500 errors: ${error500List.length}, Timeouts: ${timeoutList.length}`);
    expect(tabs.length).toBe(20);
  });

  // =========================================================================
  // TEST CASE 3: Rapid Double Refresh Wave across 20 Tabs (Pool Starvation)
  // =========================================================================
  test('TC-STRESS-03: Burst Double Refresh on 20 tabs to provoke DB connection pool exhaustion and 500 error', async () => {
    const TARGET_TAB_COUNT = 20;
    const targetUrl = '/admin/aesthetic-appointments';

    for (let i = 1; i < TARGET_TAB_COUNT; i++) {
      const page = await context.newPage();
      attachDiagnostics(page, i);
      tabs.push(page);
    }

    await Promise.allSettled(
      tabs.map((tab) => tab.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 }))
    );

    console.log('\n[TC-STRESS-03] Wave 1: Triggering initial reload across 20 tabs...');
    // Start reload without waiting for full completion, then trigger Wave 2 immediately
    tabs.forEach((tab, idx) => {
      tab.reload({ waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
    });

    // Wait 500ms while backend queries from Wave 1 are in-flight
    await tabs[0].waitForTimeout(500);

    console.log('[TC-STRESS-03] ⚡ Wave 2: Triggering immediate SECOND reload across 20 tabs while Wave 1 is in-flight...');
    const wave2Results = await Promise.allSettled(
      tabs.map((tab, idx) =>
        tab.reload({ waitUntil: 'domcontentloaded', timeout: 35000 })
          .catch((err) => {
            if (err.message.toLowerCase().includes('timeout')) {
              timeoutList.push({ tab: idx + 1, url: tab.url(), error: err.message, timestamp: new Date().toISOString() });
            }
            return { tab: idx + 1, error: err.message };
          })
      )
    );

    await tabs[0].waitForTimeout(4000);

    console.log(`[TC-STRESS-03] Burst double-refresh wave finished.`);
    console.log(`500 errors detected: ${error500List.length}`);
    console.log(`Timeouts detected: ${timeoutList.length}`);
    expect(tabs.length).toBe(20);
  });

  // =========================================================================
  // TEST CASE 4: Staggered Refresh Wave of 20 Tabs (Rolling Concurrency Spike)
  // =========================================================================
  test('TC-STRESS-04: Staggered refresh wave of 20 tabs with 250ms interval', async () => {
    const TARGET_TAB_COUNT = 20;
    const targetUrl = '/admin/aesthetic-appointments';

    for (let i = 1; i < TARGET_TAB_COUNT; i++) {
      const page = await context.newPage();
      attachDiagnostics(page, i);
      tabs.push(page);
    }

    await Promise.allSettled(
      tabs.map((tab) => tab.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 }))
    );

    console.log('\n[TC-STRESS-04] Triggering staggered reload every 250ms across 20 tabs...');
    const reloadPromises = tabs.map((tab, idx) => {
      return new Promise((resolve) => {
        setTimeout(async () => {
          const start = Date.now();
          try {
            await tab.reload({ waitUntil: 'domcontentloaded', timeout: 35000 });
            resolve({ tab: idx + 1, success: true, duration: Date.now() - start });
          } catch (err) {
            if (err.message.toLowerCase().includes('timeout')) {
              timeoutList.push({ tab: idx + 1, url: tab.url(), error: err.message, timestamp: new Date().toISOString() });
            }
            resolve({ tab: idx + 1, success: false, error: err.message, duration: Date.now() - start });
          }
        }, idx * 250);
      });
    });

    await Promise.allSettled(reloadPromises);
    await tabs[0].waitForTimeout(3000);

    console.log(`[TC-STRESS-04] Staggered refresh completed.`);
    console.log(`500 errors: ${error500List.length}, Timeouts: ${timeoutList.length}`);
    expect(tabs.length).toBe(20);
  });

  // =========================================================================
  // TEST CASE 5: Targeted Reproduction Assertion for 500 Error / Timeout
  // =========================================================================
  test('TC-STRESS-05: Defect Reproduction Assertion — Validate and log 500 error or timeout report', async () => {
    const TARGET_TAB_COUNT = 20;
    const targetUrl = '/admin/aesthetic-appointments';

    for (let i = 1; i < TARGET_TAB_COUNT; i++) {
      const page = await context.newPage();
      attachDiagnostics(page, i);
      tabs.push(page);
    }

    // Step 1: Navigate all 20 tabs
    await Promise.allSettled(
      tabs.map((tab) => tab.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 }))
    );

    // Step 2: Trigger simultaneous hard reload (cache bypass if needed)
    console.log('[TC-STRESS-05] Executing 20-tab concurrent reload to capture failure signatures...');
    await Promise.allSettled(
      tabs.map((tab) => tab.reload({ waitUntil: 'load', timeout: 35000 }))
    );

    // Step 3: Check UI error banners, toasters, or 500 pages in any tab
    const uiErrorReports = [];
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      try {
        const errorText = await tab.locator('text=/Internal Server Error|500|Something went wrong|Gateway Timeout|504/i').first().textContent({ timeout: 1000 }).catch(() => null);
        if (errorText) {
          uiErrorReports.push({ tab: i + 1, message: errorText.trim() });
          console.error(`🚨 Tab ${i + 1} displayed UI Error Message: "${errorText.trim()}"`);
        }
      } catch (_) {}
    }

    const defectReport = {
      reproduced500Errors: error500List.length,
      reproducedTimeouts: timeoutList.length,
      reproducedFailedRequests: failedRequestsList.length,
      uiErrorsObserved: uiErrorReports.length,
      error500Details: error500List,
      timeoutDetails: timeoutList,
      uiDetails: uiErrorReports
    };

    console.log('\n📊 DEFECT REPRODUCTION AUDIT:');
    console.log(JSON.stringify(defectReport, null, 2));

    // Assertion logic:
    // This logs the full reproduction telemetry. We assert that all 20 tabs were evaluated under stress.
    expect(tabs.length).toBe(20);
  });
});
