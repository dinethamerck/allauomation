// @ts-check
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('./pages/LoginPage');

/**
 * AMERCK CARE — Multi-Tab 50 Concurrency & Refresh Stress Test Suite
 * Objective: Reproduce Request/Navigation Timeouts (e.g. 504, ERR_TIMED_OUT)
 * and HTTP 500 Internal Server Errors under extreme concurrency (50 tabs refreshed concurrently).
 */
test.describe('Multi-Tab 50 Concurrency: Refresh & Error Reproduction', () => {
  // Allow sufficient time for 50 tabs to initialize, load, and execute under heavy load
  test.setTimeout(480000); // 8 minutes

  /** @type {import('@playwright/test').BrowserContext} */
  let context;
  /** @type {import('@playwright/test').Page[]} */
  let tabs = [];

  /**
   * Network & error telemetry trackers
   */
  let error500List = [];
  let timeoutList = [];
  let failedRequestsList = [];
  let pageErrorsList = [];

  /**
   * Helper to attach error and network listeners to each tab
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
      const failure = request.failure()?.errorText || 'Unknown failure';
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
      console.error(`💥 [Tab ${tabIndex + 1}] Page Error: ${err.message}`);
    });
  }

  /**
   * Helper to spawn tabs in manageable batches to prevent client-side resource exhaustion
   * @param {number} totalCount
   * @param {number} batchSize
   */
  async function spawnTabsBatched(totalCount, batchSize = 10) {
    const existingCount = tabs.length;
    const needed = totalCount - existingCount;
    console.log(`Spawning ${needed} additional tabs in batches of ${batchSize}...`);

    for (let i = 0; i < needed; i += batchSize) {
      const currentBatch = Math.min(batchSize, needed - i);
      const batchPromises = Array.from({ length: currentBatch }, async (_, idx) => {
        const page = await context.newPage();
        const tabNumber = existingCount + i + idx;
        attachDiagnostics(page, tabNumber);
        return page;
      });
      const newPages = await Promise.all(batchPromises);
      tabs.push(...newPages);
      console.log(`✓ Initialized ${tabs.length}/${totalCount} tabs`);
    }
  }

  test.beforeEach(async ({ browser }) => {
    // Reset diagnostics
    error500List = [];
    timeoutList = [];
    failedRequestsList = [];
    pageErrorsList = [];
    tabs = [];

    // Create browser context
    context = await browser.newContext();

    // Authenticate primary tab once; all other 49 tabs will share session cookies/storage
    console.log('Authenticating in primary tab...');
    const primaryTab = await context.newPage();
    const loginPage = new LoginPage(primaryTab);
    await loginPage.goto();
    await loginPage.login('parami', 'parami');
    await primaryTab.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 45000 });
    console.log('Authentication successful. Ready to scale to 50 tabs.');
    tabs.push(primaryTab);
    attachDiagnostics(primaryTab, 0);
  });

  test.afterEach(async () => {
    console.log('\n======================================================');
    console.log('       50-TAB MULTI-CONCURRENCY DIAGNOSTIC SUMMARY    ');
    console.log('======================================================');
    console.log(`Total Tabs Tested: ${tabs.length}`);
    console.log(`Total HTTP 500+ Errors Captured: ${error500List.length}`);
    console.log(`Total Network Timeouts Captured: ${timeoutList.length}`);
    console.log(`Total Failed / Aborted Requests: ${failedRequestsList.length}`);
    console.log(`Total JavaScript Uncaught Errors: ${pageErrorsList.length}`);

    if (error500List.length > 0) {
      console.log('\n--- Captured HTTP 500+ Server Errors ---');
      error500List.forEach((e, idx) => {
        console.log(`[${idx + 1}] Tab ${e.tab} | Status: ${e.status} ${e.statusText} | URL: ${e.url}`);
        if (e.body) console.log(`    Body Snippet: ${e.body}`);
      });
    }

    if (timeoutList.length > 0) {
      console.log('\n--- Captured Network Timeouts ---');
      timeoutList.forEach((t, idx) => {
        console.log(`[${idx + 1}] Tab ${t.tab} | URL: ${t.url} | Error: ${t.error}`);
      });
    }
    console.log('======================================================\n');

    // Clean up all 50 tabs
    for (const tab of tabs) {
      await tab.close().catch(() => {});
    }
    await context.close().catch(() => {});
  });

  // =========================================================================
  // TEST CASE 1: Massive 50-Tab Concurrent Refresh on Appointments
  // =========================================================================
  test('TC-STRESS-50-01: Reproduce 500 errors and timeouts by concurrently refreshing 50 tabs on Appointments', async () => {
    const TARGET_TAB_COUNT = 50;
    const targetUrl = '/admin/aesthetic-appointments';

    console.log(`[TC-STRESS-50-01] Step 1: Navigating primary tab to ${targetUrl}`);
    await tabs[0].goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

    console.log(`[TC-STRESS-50-01] Step 2: Spawning remaining 49 tabs...`);
    await spawnTabsBatched(TARGET_TAB_COUNT, 10);
    expect(tabs.length).toBe(TARGET_TAB_COUNT);

    // Initial navigation across all 50 tabs in parallel batches
    console.log(`[TC-STRESS-50-01] Step 3: Navigating all 50 tabs to ${targetUrl}...`);
    const batchSize = 10;
    for (let i = 0; i < tabs.length; i += batchSize) {
      const batch = tabs.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((tab, idx) =>
          tab.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
            .catch((err) => {
              console.warn(`Tab ${i + idx + 1} initial navigation note: ${err.message}`);
              if (err.message.toLowerCase().includes('timeout')) {
                timeoutList.push({ tab: i + idx + 1, url: targetUrl, error: err.message, timestamp: new Date().toISOString() });
              }
            })
        )
      );
      console.log(`✓ Loaded initial page for tabs ${i + 1} through ${Math.min(i + batchSize, tabs.length)}`);
    }

    // Brief stabilization pause before mass refresh
    await tabs[0].waitForTimeout(3000);

    console.log(`\n[TC-STRESS-50-01] ⚡ MASS REFRESH: SIMULTANEOUSLY RELOADING ALL 50 TABS ⚡`);
    const refreshStartTime = Date.now();

    // Trigger page.reload on all 50 tabs concurrently!
    const reloadPromises = tabs.map((tab, idx) =>
      tab.reload({ waitUntil: 'domcontentloaded', timeout: 45000 })
        .then(() => {
          const duration = Date.now() - refreshStartTime;
          console.log(`✓ Tab ${idx + 1} reload finished (${duration}ms)`);
          return { tab: idx + 1, success: true, duration };
        })
        .catch((err) => {
          const duration = Date.now() - refreshStartTime;
          console.error(`💥 Tab ${idx + 1} reload FAILED (${duration}ms): ${err.message}`);
          if (err.message.toLowerCase().includes('timeout')) {
            timeoutList.push({ tab: idx + 1, url: tab.url(), error: err.message, timestamp: new Date().toISOString() });
          }
          return { tab: idx + 1, success: false, error: err.message, duration };
        })
    );

    const reloadResults = await Promise.allSettled(reloadPromises);
    const totalDuration = Date.now() - refreshStartTime;
    console.log(`\n[TC-STRESS-50-01] All 50 reload promises settled in ${totalDuration}ms`);

    // Allow in-flight backend API calls to return responses or fail
    await tabs[0].waitForTimeout(4000);

    const failures = reloadResults.filter(r => r.status === 'rejected' || (r.value && !r.value.success)).length;
    console.log(`\n📊 50-TAB REFRESH OUTCOME:`);
    console.log(`- Total Tabs: 50`);
    console.log(`- Succeeded: ${50 - failures}`);
    console.log(`- Failed/Timed Out: ${failures}`);
    console.log(`- 500 Errors Logged: ${error500List.length}`);
    console.log(`- Timeouts Logged: ${timeoutList.length}`);

    if (error500List.length > 0 || timeoutList.length > 0 || failures > 0) {
      console.log('✅ REPRODUCTION CONFIRMED: 500 error(s) and/or timeout(s) successfully captured under 50-tab load!');
    }

    expect(tabs.length).toBe(50);
  });

  // =========================================================================
  // TEST CASE 2: 50-Tab Multi-Route Cross-Module Concurrency Stress
  // =========================================================================
  test('TC-STRESS-50-02: Reproduce 500 and timeout errors across mixed heavy routes (50 tabs)', async () => {
    const TARGET_TAB_COUNT = 50;
    const routes = [
      '/admin/aesthetic-appointments',
      '/admin/aesthetic-schedule',
      '/admin/aesthetic-settings/products',
      '/admin/dashboard'
    ];

    console.log(`[TC-STRESS-50-02] Spawning 50 tabs...`);
    await spawnTabsBatched(TARGET_TAB_COUNT, 10);
    expect(tabs.length).toBe(TARGET_TAB_COUNT);

    // Distribute routes: 50 tabs across the 4 major modules
    console.log(`[TC-STRESS-50-02] Distributing 50 tabs across appointments, schedule, products, and dashboard...`);
    const batchSize = 10;
    for (let i = 0; i < tabs.length; i += batchSize) {
      const batch = tabs.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((tab, idx) => {
          const assignedRoute = routes[(i + idx) % routes.length];
          return tab.goto(assignedRoute, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
        })
      );
    }

    await tabs[0].waitForTimeout(3000);

    console.log(`\n[TC-STRESS-50-02] ⚡ SIMULTANEOUSLY RELOADING 50 TABS ACROSS MIXED ROUTES ⚡`);
    const reloadPromises = tabs.map((tab, idx) =>
      tab.reload({ waitUntil: 'load', timeout: 50000 })
        .then(() => ({ tab: idx + 1, success: true, url: tab.url() }))
        .catch((err) => {
          if (err.message.toLowerCase().includes('timeout')) {
            timeoutList.push({ tab: idx + 1, url: tab.url(), error: err.message, timestamp: new Date().toISOString() });
          }
          return { tab: idx + 1, success: false, error: err.message, url: tab.url() };
        })
    );

    await Promise.allSettled(reloadPromises);
    await tabs[0].waitForTimeout(4000);

    console.log(`[TC-STRESS-50-02] Multi-route refresh test complete.`);
    console.log(`HTTP 500+ Count: ${error500List.length}, Timeouts Count: ${timeoutList.length}`);
    expect(tabs.length).toBe(50);
  });

  // =========================================================================
  // TEST CASE 3: Rapid Double-Burst Refresh Wave across 50 Tabs
  // =========================================================================
  test('TC-STRESS-50-03: Burst Double Refresh on 50 tabs to exhaust backend connection pool and trigger 500/timeouts', async () => {
    const TARGET_TAB_COUNT = 50;
    const targetUrl = '/admin/aesthetic-appointments';

    await spawnTabsBatched(TARGET_TAB_COUNT, 10);
    expect(tabs.length).toBe(TARGET_TAB_COUNT);

    // Initial navigation
    for (let i = 0; i < tabs.length; i += 10) {
      const batch = tabs.slice(i, i + 10);
      await Promise.allSettled(
        batch.map(tab => tab.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {}))
      );
    }

    console.log('\n[TC-STRESS-50-03] Wave 1: Triggering reload on all 50 tabs...');
    tabs.forEach((tab) => {
      tab.reload({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    });

    // Wait 400ms while backend DB connection pools are actively handling Wave 1 queries
    await tabs[0].waitForTimeout(400);

    console.log('[TC-STRESS-50-03] ⚡ Wave 2: Triggering immediate SECOND reload across all 50 tabs in-flight...');
    const wave2Promises = tabs.map((tab, idx) =>
      tab.reload({ waitUntil: 'domcontentloaded', timeout: 45000 })
        .catch((err) => {
          if (err.message.toLowerCase().includes('timeout')) {
            timeoutList.push({ tab: idx + 1, url: tab.url(), error: err.message, timestamp: new Date().toISOString() });
          }
          return { tab: idx + 1, error: err.message };
        })
    );

    await Promise.allSettled(wave2Promises);
    await tabs[0].waitForTimeout(4000);

    console.log(`[TC-STRESS-50-03] Burst double-refresh complete.`);
    console.log(`HTTP 500 errors: ${error500List.length}, Timeouts: ${timeoutList.length}`);
    expect(tabs.length).toBe(50);
  });

  // =========================================================================
  // TEST CASE 4: Rolling Concurrency Wave (Staggered Refresh of 50 Tabs)
  // =========================================================================
  test('TC-STRESS-50-04: Staggered rolling reload wave of 50 tabs with 150ms intervals', async () => {
    const TARGET_TAB_COUNT = 50;
    const targetUrl = '/admin/aesthetic-appointments';

    await spawnTabsBatched(TARGET_TAB_COUNT, 10);
    expect(tabs.length).toBe(TARGET_TAB_COUNT);

    for (let i = 0; i < tabs.length; i += 10) {
      const batch = tabs.slice(i, i + 10);
      await Promise.allSettled(
        batch.map(tab => tab.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {}))
      );
    }

    console.log('\n[TC-STRESS-50-04] Staggering reload every 150ms across 50 tabs...');
    const reloadPromises = tabs.map((tab, idx) => {
      return new Promise((resolve) => {
        setTimeout(async () => {
          const start = Date.now();
          try {
            await tab.reload({ waitUntil: 'domcontentloaded', timeout: 40000 });
            resolve({ tab: idx + 1, success: true, duration: Date.now() - start });
          } catch (err) {
            if (err.message.toLowerCase().includes('timeout')) {
              timeoutList.push({ tab: idx + 1, url: tab.url(), error: err.message, timestamp: new Date().toISOString() });
            }
            resolve({ tab: idx + 1, success: false, error: err.message, duration: Date.now() - start });
          }
        }, idx * 150);
      });
    });

    await Promise.allSettled(reloadPromises);
    await tabs[0].waitForTimeout(3000);

    console.log(`[TC-STRESS-50-04] Rolling wave completed.`);
    console.log(`HTTP 500 errors: ${error500List.length}, Timeouts: ${timeoutList.length}`);
    expect(tabs.length).toBe(50);
  });

  // =========================================================================
  // TEST CASE 5: Complete 50-Tab Defect Reproduction Assertion & Audit
  // =========================================================================
  test('TC-STRESS-50-05: 50-Tab Defect Reproduction Audit — Intercept 500 errors, timeouts, and UI error states', async () => {
    const TARGET_TAB_COUNT = 50;
    const targetUrl = '/admin/aesthetic-appointments';

    await spawnTabsBatched(TARGET_TAB_COUNT, 10);
    expect(tabs.length).toBe(TARGET_TAB_COUNT);

    for (let i = 0; i < tabs.length; i += 10) {
      const batch = tabs.slice(i, i + 10);
      await Promise.allSettled(
        batch.map(tab => tab.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {}))
      );
    }

    console.log('[TC-STRESS-50-05] ⚡ Executing 50-tab mass concurrent reload...');
    await Promise.allSettled(
      tabs.map(tab => tab.reload({ waitUntil: 'load', timeout: 45000 }))
    );

    // Inspect each tab for visible UI error messages or crash banners
    const uiErrors = [];
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      try {
        const errorText = await tab.locator('text=/Internal Server Error|500|Something went wrong|Gateway Timeout|504/i').first().textContent({ timeout: 800 }).catch(() => null);
        if (errorText) {
          uiErrors.push({ tab: i + 1, message: errorText.trim() });
          console.error(`🚨 Tab ${i + 1} displayed UI Error Message: "${errorText.trim()}"`);
        }
      } catch (_) {}
    }

    const reproductionSummary = {
      totalTabs: 50,
      reproduced500Errors: error500List.length,
      reproducedTimeouts: timeoutList.length,
      reproducedFailedRequests: failedRequestsList.length,
      uiErrorBannersObserved: uiErrors.length,
      error500Details: error500List,
      timeoutDetails: timeoutList,
      uiDetails: uiErrors
    };

    console.log('\n📊 50-TAB DEFECT REPRODUCTION AUDIT REPORT:');
    console.log(JSON.stringify(reproductionSummary, null, 2));

    expect(tabs.length).toBe(50);
  });
});
