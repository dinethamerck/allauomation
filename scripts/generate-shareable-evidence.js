// @ts-check
const fs = require('fs');
const path = require('path');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseTestResults() {
  const root = process.cwd();
  const testResultsDir = path.join(root, 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    console.error('test-results folder not found');
    process.exit(1);
  }

  const entries = fs.readdirSync(testResultsDir, { withFileTypes: true });
  const tests = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folderPath = path.join(testResultsDir, entry.name);
    const files = fs.readdirSync(folderPath);

    const isRetry = entry.name.includes('-retry');
    const retryMatch = entry.name.match(/-retry(\d+)/);
    const retry = retryMatch ? parseInt(retryMatch[1], 10) : (isRetry ? 1 : 0);

    const hasFailed = files.some(f => f.includes('failed') || f.includes('error-context'));
    const status = hasFailed ? 'failed' : 'passed';

    // Parse Test ID
    let testId = 'TC-TEST';
    let title = entry.name.replace(/^[a-z0-9_.-]+-Amerck-Care---[A-Za-z0-9_.-]+-/, '').replace(/-chromium.*$/, '').replace(/-/g, ' ');
    let fullTitle = entry.name;
    let errorMessage = null;
    let errorStack = null;
    let testCode = null;

    // Check if error-context.md exists
    const errorContextFile = files.find(f => f === 'error-context.md');
    if (errorContextFile) {
      try {
        const md = fs.readFileSync(path.join(folderPath, errorContextFile), 'utf8');
        const nameMatch = md.match(/Name:\s*(.*)/);
        if (nameMatch) {
          fullTitle = nameMatch[1].trim();
          title = fullTitle;
        }
        const idMatch = md.match(/(TC-[A-Z0-9]+-[0-9]+)/);
        if (idMatch) testId = idMatch[1];

        const errMatch = md.match(/# Error details\s*```([\s\S]*?)```/);
        if (errMatch) errorMessage = errMatch[1].trim();

        const srcMatch = md.match(/# Test source\s*```ts([\s\S]*?)```/);
        if (srcMatch) testCode = srcMatch[1].trim();
      } catch (_) {}
    }

    if (testId === 'TC-TEST') {
      const match = entry.name.match(/(TC-[A-Z0-9]+-[0-9]+)/i);
      if (match) testId = match[1].toUpperCase();
    }

    // Embed screenshots as base64
    const screenshots = [];
    const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    for (const img of imageFiles) {
      try {
        const imgPath = path.join(folderPath, img);
        const data = fs.readFileSync(imgPath);
        const base64 = data.toString('base64');
        const ext = img.endsWith('.jpg') ? 'jpeg' : 'png';
        screenshots.push({
          name: img,
          base64: `data:image/${ext};base64,${base64}`
        });
      } catch (_) {}
    }

    // Video path if present
    const videoFile = files.find(f => f.endsWith('.webm'));
    const videoRelPath = videoFile ? `test-results/${entry.name}/${videoFile}` : null;

    // Determine module
    let module = 'Admissions Module';
    if (testId.startsWith('TC-ADM')) module = 'Admissions Module';
    else if (testId.startsWith('TC-RX') || testId.startsWith('TC-PRE')) module = 'Prescription Module';
    else if (testId.startsWith('TC-DIAG')) module = 'Diagnosis Module';
    else if (testId.startsWith('TC-SET')) module = 'Settings Module';

    tests.push({
      id: testId,
      title: title.replace(/Amerck Care - /, ''),
      fullTitle,
      folder: entry.name,
      status,
      retry,
      module,
      errorMessage,
      errorStack,
      testCode,
      screenshots,
      videoPath: videoRelPath
    });
  }

  // Deduplicate and group by base test case (resolve retries to final outcome)
  const grouped = new Map();
  for (const t of tests) {
    const key = t.id !== 'TC-TEST' ? t.id : t.folder.replace(/-retry\d+/, '');
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(t);
  }

  const finalTests = [];
  for (const [key, attempts] of grouped.entries()) {
    attempts.sort((a, b) => a.retry - b.retry);
    const lastAttempt = attempts[attempts.length - 1];
    const anyPassed = attempts.some(a => a.status === 'passed');
    const allPassed = attempts.every(a => a.status === 'passed');
    const allFailed = attempts.every(a => a.status === 'failed');

    let outcome = 'passed';
    if (allPassed) outcome = 'passed';
    else if (allFailed) outcome = 'failed';
    else outcome = 'flaky'; // failed first, passed on retry

    finalTests.push({
      id: lastAttempt.id,
      title: lastAttempt.title,
      fullTitle: lastAttempt.fullTitle,
      module: lastAttempt.module,
      outcome,
      attempts,
      latestScreenshot: attempts.flatMap(a => a.screenshots)[0]?.base64 || null,
      errorMessage: attempts.find(a => a.errorMessage)?.errorMessage || null,
      testCode: attempts.find(a => a.testCode)?.testCode || null
    });
  }

  return { tests, finalTests };
}

function buildHtml(data) {
  const { finalTests } = data;
  const total = finalTests.length;
  const passed = finalTests.filter(t => t.outcome === 'passed').length;
  const failed = finalTests.filter(t => t.outcome === 'failed').length;
  const flaky = finalTests.filter(t => t.outcome === 'flaky').length;
  const passRate = total > 0 ? Math.round(((passed + flaky) / total) * 100) : 100;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Automation Execution Evidence | Amerck Care EMR</title>
  <style>
    :root {
      --bg: #090d16;
      --surface: #111827;
      --surface-card: #162032;
      --surface-hover: #1e293b;
      --border: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(59, 130, 246, 0.3);
      --primary: #3b82f6;
      --primary-light: #60a5fa;
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.2);
      --danger: #ef4444;
      --danger-glow: rgba(239, 68, 68, 0.2);
      --warning: #f59e0b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --radius: 12px;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 1.5rem;
      min-height: 100vh;
    }
    .container { max-width: 1300px; margin: 0 auto; }
    
    /* Top Banner / Header */
    .header-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.75rem 2rem;
      margin-bottom: 1.5rem;
      box-shadow: var(--shadow);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
    }
    .header-titles h1 {
      font-size: 1.6rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .header-badge {
      display: inline-block;
      font-size: 0.72rem;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      background: rgba(59, 130, 246, 0.2);
      color: var(--primary-light);
      border: 1px solid rgba(59, 130, 246, 0.4);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .header-sub {
      color: var(--text-muted);
      font-size: 0.88rem;
      margin-top: 0.35rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .header-sub span { display: flex; align-items: center; gap: 0.3rem; }
    .header-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
      text-decoration: none;
      color: white;
    }
    .btn-share {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    .btn-share:hover { background: #1d4ed8; transform: translateY(-1px); }
    .btn-print {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border);
      color: var(--text);
    }
    .btn-print:hover { background: rgba(255, 255, 255, 0.15); transform: translateY(-1px); }

    /* KPI Summary Row */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .kpi-card {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem 1rem;
      text-align: center;
      box-shadow: var(--shadow);
      position: relative;
      overflow: hidden;
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
    }
    .kpi-total::before { background: var(--primary); }
    .kpi-passed::before { background: var(--success); }
    .kpi-failed::before { background: var(--danger); }
    .kpi-flaky::before { background: var(--warning); }
    .kpi-rate::before { background: #06b6d4; }

    .kpi-val { font-size: 2.2rem; font-weight: 800; line-height: 1.1; margin: 0.25rem 0; }
    .kpi-lbl { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); font-weight: 600; }
    .val-passed { color: #34d399; }
    .val-failed { color: #f87171; }
    .val-flaky { color: #fbbf24; }
    .val-rate { color: #38bdf8; }

    /* Interactive Filters */
    .filter-bar {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem 1.25rem;
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .filter-buttons { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .filter-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.35rem 0.85rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-btn:hover { color: var(--text); background: rgba(255, 255, 255, 0.05); }
    .filter-btn.active {
      background: rgba(59, 130, 246, 0.2);
      color: var(--primary-light);
      border-color: rgba(59, 130, 246, 0.4);
    }
    .search-box {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.4rem 0.85rem;
      color: var(--text);
      font-size: 0.85rem;
      width: 250px;
    }
    .search-box:focus { outline: none; border-color: var(--primary); }

    /* Test Cards */
    .tests-container { display: flex; flex-direction: column; gap: 1rem; }
    .test-card {
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem 1.5rem;
      box-shadow: var(--shadow);
      transition: border-color 0.2s;
    }
    .test-card.passed { border-left: 5px solid var(--success); }
    .test-card.failed { border-left: 5px solid var(--danger); }
    .test-card.flaky { border-left: 5px solid var(--warning); }

    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .badges { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.4rem; }
    .badge-id {
      background: rgba(255, 255, 255, 0.08);
      color: #93c5fd;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
    }
    .badge-mod {
      background: rgba(147, 51, 234, 0.15);
      color: #c084fc;
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-weight: 500;
    }
    .badge-status {
      font-size: 0.72rem;
      padding: 0.15rem 0.55rem;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status-passed { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-failed { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .status-flaky { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }

    .test-title { font-size: 1.05rem; font-weight: 600; color: #fff; margin-bottom: 0.25rem; }

    /* Failure details */
    .fail-box {
      margin-top: 0.9rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 8px;
      padding: 0.85rem 1rem;
    }
    .fail-header {
      font-size: 0.8rem;
      font-weight: 700;
      color: #f87171;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .fail-pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.82rem;
      color: #fecaca;
      white-space: pre-wrap;
      word-break: break-all;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.6rem;
      border-radius: 6px;
      max-height: 220px;
      overflow-y: auto;
    }

    /* Screenshots gallery */
    .screenshot-box {
      margin-top: 0.9rem;
    }
    .screenshot-thumb {
      max-width: 320px;
      border-radius: 8px;
      border: 1px solid var(--border);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .screenshot-thumb:hover {
      transform: scale(1.02);
      box-shadow: 0 8px 20px rgba(0,0,0,0.5);
    }
    .screenshot-caption {
      font-size: 0.75rem;
      color: var(--text-dim);
      margin-top: 0.25rem;
    }

    /* Attempts breakdown */
    .attempts-list {
      margin-top: 0.75rem;
      font-size: 0.82rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      padding-top: 0.5rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    /* Print styling */
    @media print {
      body { background: white !important; color: black !important; padding: 0.5rem; }
      .header-card, .kpi-card, .test-card, .filter-bar { background: white !important; border: 1px solid #ccc !important; box-shadow: none !important; color: black !important; }
      .header-actions, .filter-bar { display: none !important; }
      .test-title, .header-titles h1 { color: black !important; }
      .kpi-val { color: black !important; }
      .fail-box { background: #fee2e2 !important; border: 1px solid #f87171 !important; }
      .fail-pre { color: #991b1b !important; background: white !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header-card">
      <div class="header-titles">
        <div style="display:flex;align-items:center;gap:0.6rem;">
          <h1>&#127973; Amerck Care EMR &amp; Prescription QA Automation</h1>
          <span class="header-badge">Executive Evidence</span>
        </div>
        <div class="header-sub">
          <span>&#128197; ${dateStr} at ${timeStr}</span>
          <span>&#127760; Environment: <b>QA (qa_pg.amerck.care)</b></span>
          <span>&#128030; Automated Execution with Playwright</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-print" onclick="window.print()">&#128424; Print / PDF</button>
        <button class="btn btn-share" onclick="copyReportSummary()">&#128203; Copy Summary</button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-total">
        <div class="kpi-lbl">Total Scenarios</div>
        <div class="kpi-val">${total}</div>
      </div>
      <div class="kpi-card kpi-passed">
        <div class="kpi-lbl">Passed</div>
        <div class="kpi-val val-passed">${passed}</div>
      </div>
      <div class="kpi-card kpi-failed">
        <div class="kpi-lbl">Failed</div>
        <div class="kpi-val val-failed">${failed}</div>
      </div>
      <div class="kpi-card kpi-flaky">
        <div class="kpi-lbl">Flaky (Passed on Retry)</div>
        <div class="kpi-val val-flaky">${flaky}</div>
      </div>
      <div class="kpi-card kpi-rate">
        <div class="kpi-lbl">Pass Rate</div>
        <div class="kpi-val val-rate">${passRate}%</div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-buttons">
        <button class="filter-btn active" onclick="setFilter('all', this)">All (${total})</button>
        <button class="filter-btn" onclick="setFilter('passed', this)">Passed (${passed})</button>
        <button class="filter-btn" onclick="setFilter('failed', this)">Failed (${failed})</button>
        <button class="filter-btn" onclick="setFilter('flaky', this)">Flaky (${flaky})</button>
      </div>
      <input type="text" class="search-box" placeholder="Search test name or ID..." oninput="handleSearch(this.value)">
    </div>

    <!-- Test List -->
    <div class="tests-container" id="testList">
      ${finalTests.map(t => {
        const statusClass = t.outcome;
        const statusBadgeClass = `status-${t.outcome}`;
        const hasError = !!t.errorMessage;
        const hasScreenshot = !!t.latestScreenshot;

        return `
        <div class="test-card ${statusClass}" data-outcome="${t.outcome}" data-search="${escapeHtml((t.id + ' ' + t.title + ' ' + t.module).toLowerCase())}">
          <div class="test-header">
            <div>
              <div class="badges">
                <span class="badge-id">${escapeHtml(t.id)}</span>
                <span class="badge-mod">${escapeHtml(t.module)}</span>
                <span class="badge-status ${statusBadgeClass}">${t.outcome.toUpperCase()}</span>
              </div>
              <div class="test-title">${escapeHtml(t.title)}</div>
            </div>
          </div>

          ${hasError ? `
            <div class="fail-box">
              <div class="fail-header">&#9888; Execution Failure / Assertion Error:</div>
              <pre class="fail-pre">${escapeHtml(t.errorMessage)}</pre>
            </div>
          ` : ''}

          ${hasScreenshot ? `
            <div class="screenshot-box">
              <a href="${t.latestScreenshot}" target="_blank" title="Click to view full image in new tab">
                <img src="${t.latestScreenshot}" class="screenshot-thumb" alt="Test Screenshot" />
              </a>
              <div class="screenshot-caption">&#128247; Embedded Failure/Evidence Screenshot (Click to expand)</div>
            </div>
          ` : ''}

          <div class="attempts-list">
            <span>&#128260; Attempts: <b>${t.attempts.length}</b></span>
            ${t.attempts.map((a, i) => `
              <span>Attempt ${i + 1}: <b style="color:${a.status === 'passed' ? '#34d399' : '#f87171'}">${a.status.toUpperCase()}</b></span>
            `).join(' &bull; ')}
          </div>
        </div>
        `;
      }).join('')}
    </div>
  </div>

  <script>
    let currentFilter = 'all';
    let searchQuery = '';

    function setFilter(filter, el) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      if (el) el.classList.add('active');
      applyFilters();
    }

    function handleSearch(val) {
      searchQuery = (val || '').toLowerCase().trim();
      applyFilters();
    }

    function applyFilters() {
      const cards = document.querySelectorAll('.test-card');
      cards.forEach(card => {
        const outcome = card.getAttribute('data-outcome');
        const text = card.getAttribute('data-search') || '';
        const matchesFilter = (currentFilter === 'all') || (outcome === currentFilter);
        const matchesSearch = !searchQuery || text.includes(searchQuery);
        card.style.display = (matchesFilter && matchesSearch) ? 'block' : 'none';
      });
    }

    function copyReportSummary() {
      const summaryText = [
        '=============================================',
        'QA AUTOMATION EXECUTION EVIDENCE SUMMARY',
        'Project: Amerck Care EMR & Prescription Suite',
        'Environment: QA (qa_pg.amerck.care)',
        'Timestamp: ' + new Date().toLocaleString(),
        '---------------------------------------------',
        'Total Tests: ${total}',
        'Passed:      ${passed}',
        'Failed:      ${failed}',
        'Flaky:       ${flaky}',
        'Pass Rate:   ${passRate}%',
        '============================================='
      ].join('\\n');

      navigator.clipboard.writeText(summaryText).then(() => {
        alert('Summary copied to clipboard! You can paste it into Slack, Jira, or Teams.');
      }).catch(() => {
        prompt('Copy summary:', summaryText);
      });
    }
  </script>
</body>
</html>`;
}

async function run() {
  console.log('[EvidenceGenerator] Parsing test results...');
  const data = parseTestResults();
  console.log(`[EvidenceGenerator] Parsed ${data.tests.length} attempts, ${data.finalTests.length} scenarios.`);

  const html = buildHtml(data);
  const root = process.cwd();

  // 1. Write standalone HTML file in QA-Automation-Evidence
  const out1 = path.join(root, 'QA-Automation-Evidence', 'QA-Evidence-Report-Standalone.html');
  fs.writeFileSync(out1, html, 'utf8');
  console.log(`✔ Generated Standalone Report: ${out1}`);

  // 2. Also write directly in root for instant 1-click sharing
  const out2 = path.join(root, 'QA-Evidence-Report-Standalone.html');
  fs.writeFileSync(out2, html, 'utf8');
  console.log(`✔ Generated Root Shareable Report: ${out2}`);

  console.log('\nDone! You can share QA-Evidence-Report-Standalone.html directly via Email, Teams, Slack, or Google Drive.');
}

run().catch(console.error);
