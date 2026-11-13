// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * Modern HTML Evidence Dashboard Generator
 * Generates interactive, self-contained executive QA reports with playable WebM videos,
 * screenshot galleries, step timelines, and verification manifests.
 */

/**
 * Escapes HTML characters for safe rendering
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates the Execution Evidence Dashboard HTML
 * @param {object} testData
 * @returns {string}
 */
function generateEvidenceDashboardHtml(testData) {
  const {
    executionTimestamp,
    timestampFormatted,
    projectName,
    environment,
    summary,
    tests,
    manifestFiles,
    zipInfo,
    coverage
  } = testData;

  const resultBadge = r => ({
    passed: 'badge-passed', failed: 'badge-failed', flaky: 'badge-flaky'
  }[r] || 'badge-skipped');
  const coverageHtml = coverage ? `
    <section class="manifest-preview" style="margin-bottom:2rem" id="allTestCases">
      <h3>&#128203; All Test Cases (${coverage.rows.length})</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin:0.25rem 0 0.75rem">
        Documented: <b>${coverage.documented}</b> &bull; Automated: <b>${coverage.automated}</b> &bull; Executed: <b>${coverage.executed}</b> &bull;
        <span style="color:#34d399">Passed ${coverage.passed}</span> &bull; <span style="color:#f87171">Failed ${coverage.failed}</span> &bull;
        <span style="color:#fbbf24">Flaky ${coverage.flaky}</span> &bull; Skipped ${coverage.skipped} &bull; Not run ${coverage.notRun} &bull;
        Not automated ${coverage.notAutomated} &bull; <a href="testcase-coverage.csv" style="color:#93c5fd">Download CSV</a>
      </p>
      <input type="text" class="search-input" placeholder="Filter test cases..." oninput="filterCoverage(this.value)" style="margin-bottom:0.75rem">
      <div style="max-height:520px;overflow:auto">
        <table class="manifest-table" id="coverageTable" style="font-family:inherit">
          <thead><tr><th>ID</th><th>Module</th><th>Scenario</th><th>Priority</th><th>Result</th><th>Attempts</th><th>Duration</th><th>Evidence</th></tr></thead>
          <tbody>
            ${coverage.rows.map(r => `
              <tr>
                <td style="font-family:'JetBrains Mono',monospace;white-space:nowrap">${escapeHtml(r.id)}</td>
                <td>${escapeHtml(r.module)}</td>
                <td title="${escapeHtml(r.error || r.expected || '')}">${escapeHtml(r.scenario)}</td>
                <td>${escapeHtml(r.priority)}</td>
                <td><span class="status-badge ${resultBadge(r.result)}">${escapeHtml(String(r.result).toUpperCase())}</span></td>
                <td>${r.attempts || ''}</td>
                <td>${escapeHtml(r.duration || '')}</td>
                <td>${r.videoPath ? `<a class="btn-sm" href="${escapeHtml(r.videoPath)}" target="_blank">&#9658; Video</a>` : ''}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>` : '';

  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;

  const testCardsHtml = tests.map((t, idx) => {
    const outcome = t.outcome || t.status;
    const isFail = (s) => ['failed', 'timedOut', 'interrupted'].includes(s);
    const statusClass = isFail(t.status) ? 'failed' : (t.status === 'passed' ? 'passed' : 'skipped');
    const statusColor = t.status === 'passed' ? 'badge-passed' :
                        isFail(t.status) ? 'badge-failed' : 'badge-skipped';
    const outcomeColor = outcome === 'passed' ? 'badge-passed' :
                         outcome === 'failed' ? 'badge-failed' :
                         outcome === 'flaky' ? 'badge-flaky' : 'badge-skipped';
    const otherAttachments = (t.attachments || []).filter(a => a.type !== 'video');

    // Video section
    let videoHtml = '';
    if (t.videoPath) {
      videoHtml = `
        <div class="evidence-block video-block">
          <div class="evidence-header">
            <span class="icon">&#9658;</span> Screen Recording (Browser Test Execution)
            <span class="format-badge">WebM</span>
          </div>
          <div class="video-container">
            <video controls preload="metadata" playsinline class="test-video">
              <source src="${escapeHtml(t.videoPath)}" type="video/webm">
              Your browser does not support the video tag.
            </video>
          </div>
          <div class="video-footer">
            <a href="${escapeHtml(t.videoPath)}" download class="btn-sm">&#128190; Download Video</a>
            <span class="video-note">Recorded from start to finish</span>
          </div>
        </div>
      `;
    } else {
      videoHtml = `<div class="no-evidence-note">No video file recorded for this test.</div>`;
    }

    // Screenshots section
    let screenshotsHtml = '';
    if (t.screenshots && t.screenshots.length > 0) {
      screenshotsHtml = `
        <div class="evidence-block screenshot-block">
          <div class="evidence-header"><span class="icon">&#128247;</span> Screenshots (${t.screenshots.length})</div>
          <div class="screenshot-gallery">
            ${t.screenshots.map(s => `
              <div class="screenshot-card">
                <a href="${escapeHtml(s.path)}" target="_blank" title="Click to view full image">
                  <img src="${escapeHtml(s.path)}" alt="${escapeHtml(s.name)}" loading="lazy">
                </a>
                <span class="screenshot-caption">${escapeHtml(s.name)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Steps breakdown
    let stepsHtml = '';
    if (t.steps && t.steps.length > 0) {
      stepsHtml = `
        <details class="steps-details">
          <summary class="steps-summary">&#128203; Execution Steps (${t.steps.length} steps)</summary>
          <div class="steps-list">
            ${t.steps.map(s => `
              <div class="step-item ${s.error ? 'step-failed' : 'step-passed'}">
                <span class="step-icon">${s.error ? '&#10060;' : '&#10004;'}</span>
                <span class="step-title">${escapeHtml(s.title)}</span>
                <span class="step-duration">${s.durationMs}ms</span>
                ${s.error ? `<pre class="step-error">${escapeHtml(s.error)}</pre>` : ''}
              </div>
            `).join('')}
          </div>
        </details>
      `;
    }

    // Error section
    let errorHtml = '';
    if (t.error) {
      errorHtml = `
        <div class="error-box">
          <div class="error-header">&#9888; Failure Details</div>
          <pre class="error-content">${escapeHtml(t.error)}</pre>
          ${t.stack ? `<details class="stack-details"><summary>Stack Trace</summary><pre class="stack-content">${escapeHtml(t.stack)}</pre></details>` : ''}
        </div>
      `;
    }

    // Traces section
    let traceHtml = '';
    if (t.tracePath) {
      traceHtml = `
        <div class="trace-link-box">
          <span>&#128269; Playwright Trace Available:</span>
          <a href="${escapeHtml(t.tracePath)}" download class="btn-sm btn-trace">&#128190; Download Trace.zip</a>
          <span class="trace-hint">(Inspect via: <code>npx playwright show-trace ${escapeHtml(t.tracePath)}</code>)</span>
        </div>
      `;
    }

    return `
      <div class="test-card ${statusClass}" data-status="${escapeHtml(outcome)}" data-module="${escapeHtml(t.module || '')}">
        <div class="test-card-header">
          <div class="test-title-col">
            <div class="test-badges">
              <span class="test-id-badge">${escapeHtml(t.id || 'TC-N/A')}</span>
              <span class="module-badge">${escapeHtml(t.module || 'General')}</span>
              <span class="status-badge ${statusColor}" title="Status of this attempt">ATTEMPT: ${escapeHtml(t.status.toUpperCase())}</span>
              <span class="status-badge ${outcomeColor}" title="Final test outcome">FINAL: ${escapeHtml(String(outcome).toUpperCase())}</span>
              <span class="retry-badge">${t.retry > 0 ? `Retry #${t.retry}` : 'First attempt'}</span>
            </div>
            <h3 class="test-title">${escapeHtml(t.title)}</h3>
          </div>
          <div class="test-meta-col">
            <span class="duration-badge">&#9201; ${t.durationFormatted || (t.durationMs + 'ms')}</span>
            <span class="browser-badge">&#127760; ${escapeHtml(t.browser || 'Chromium')}</span>
          </div>
        </div>

        ${errorHtml}

        <div class="test-evidence-grid">
          ${videoHtml}
          ${screenshotsHtml}
        </div>

        ${traceHtml}
        ${otherAttachments.length ? `<div class="trace-link-box"><span>&#128206; Other evidence:</span>${otherAttachments.map(a => `<a class="btn-sm" href="${escapeHtml(a.path)}" target="_blank">${escapeHtml(a.type)}</a>`).join('')}</div>` : ''}
        <div class="trace-hint" style="margin-top:0.75rem">&#128193; ${escapeHtml(t.file || '')}${t.line ? ':' + t.line : ''} &bull; ${escapeHtml(t.project || '')} &bull; started ${escapeHtml(t.startTime || '')}</div>
        ${stepsHtml}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Evidence Report | ${escapeHtml(projectName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0a0f1d;
      --card-bg: #131b2e;
      --card-border: rgba(255, 255, 255, 0.08);
      --accent-blue: #3b82f6;
      --accent-cyan: #06b6d4;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --accent-amber: #f59e0b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --glass: rgba(19, 27, 46, 0.7);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-dark);
      background-image: radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.12) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.08) 0px, transparent 50%);
      color: var(--text-main);
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      padding: 2rem;
    }

    .container { max-width: 1400px; margin: 0 auto; }

    /* Header */
    .header {
      background: var(--glass);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
    }

    .header-info h1 {
      font-size: 1.85rem;
      font-weight: 700;
      background: linear-gradient(135deg, #60a5fa, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }

    .header-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-main);
      border: 1px solid var(--card-border);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }

    .btn-zip {
      background: linear-gradient(135deg, #059669, #047857);
      color: white;
    }

    /* Metric Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .metric-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
    }
    .card-total::before { background: var(--accent-blue); }
    .card-passed::before { background: var(--accent-green); }
    .card-failed::before { background: var(--accent-red); }
    .card-flaky::before { background: var(--accent-amber); }
    .card-rate::before { background: var(--accent-cyan); }

    .metric-value {
      font-size: 2.2rem;
      font-weight: 800;
      margin: 0.25rem 0;
    }
    .metric-label {
      color: var(--text-muted);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Filter & Controls */
    .controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .filter-tabs {
      display: flex;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.03);
      padding: 0.35rem;
      border-radius: 10px;
      border: 1px solid var(--card-border);
    }

    .filter-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.45rem 1rem;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-btn.active, .filter-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-main);
    }

    .search-input {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      color: var(--text-main);
      font-family: inherit;
      width: 260px;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--accent-blue);
    }

    /* Test Cards */
    .test-list { display: flex; flex-direction: column; gap: 1.5rem; }

    .test-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 1.5rem;
      transition: border-color 0.2s;
    }

    .test-card.passed { border-left: 5px solid var(--accent-green); }
    .test-card.failed { border-left: 5px solid var(--accent-red); }
    .test-card.flaky { border-left: 5px solid var(--accent-amber); }
    .test-card.skipped { border-left: 5px solid var(--text-muted); }

    .test-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .test-badges {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
    }

    .test-id-badge {
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .module-badge {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-muted);
      border: 1px solid var(--card-border);
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.8rem;
    }

    .status-badge {
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .badge-passed { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-failed { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-flaky { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-skipped { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3); }

    .retry-badge {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.3);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
    }

    .test-title {
      font-size: 1.15rem;
      font-weight: 600;
      line-height: 1.4;
    }

    .test-meta-col {
      display: flex;
      gap: 0.75rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    /* Video & Evidence Grid */
    .test-evidence-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.25rem;
      margin-top: 1rem;
    }

    .evidence-block {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 1rem;
    }

    .evidence-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      color: #cbd5e1;
    }

    .format-badge {
      font-size: 0.7rem;
      background: #1e293b;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: #38bdf8;
      font-family: monospace;
    }

    .video-container {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      background: #000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .test-video {
      width: 100%;
      height: auto;
      max-height: 380px;
      display: block;
    }

    .video-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
      font-size: 0.8rem;
    }

    .video-note { color: var(--text-muted); }

    .btn-sm {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border-radius: 6px;
      font-size: 0.8rem;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn-sm:hover { background: rgba(255, 255, 255, 0.15); }

    /* Screenshot Gallery */
    .screenshot-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.75rem;
    }

    .screenshot-card {
      border: 1px solid var(--card-border);
      border-radius: 6px;
      overflow: hidden;
      background: #000;
    }

    .screenshot-card img {
      width: 100%;
      height: 90px;
      object-fit: cover;
      display: block;
      transition: transform 0.2s;
    }
    .screenshot-card img:hover { transform: scale(1.05); }

    .screenshot-caption {
      display: block;
      font-size: 0.7rem;
      padding: 0.3rem 0.5rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Error Box */
    .error-box {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .error-header {
      font-weight: 700;
      color: #f87171;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }

    .error-content {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      color: #fecaca;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.4;
    }

    .stack-details { margin-top: 0.75rem; font-size: 0.8rem; }
    .stack-details summary { cursor: pointer; color: #fca5a5; }
    .stack-content {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      margin-top: 0.5rem;
      color: #94a3b8;
      max-height: 200px;
      overflow-y: auto;
    }

    /* Trace Box */
    .trace-link-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1rem;
      padding: 0.65rem 1rem;
      background: rgba(59, 130, 246, 0.06);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 8px;
      font-size: 0.85rem;
      flex-wrap: wrap;
    }

    .trace-hint { color: var(--text-muted); font-size: 0.8rem; }
    .trace-hint code {
      background: rgba(0,0,0,0.4);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      color: #93c5fd;
    }

    /* Steps */
    .steps-details { margin-top: 1rem; }
    .steps-summary {
      font-size: 0.85rem;
      color: var(--text-muted);
      cursor: pointer;
      user-select: none;
    }
    .steps-list {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .step-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.2);
      font-size: 0.8rem;
    }
    .step-title { flex: 1; }
    .step-duration { color: var(--text-muted); font-size: 0.75rem; font-family: monospace; }

    /* Footer & Verification */
    .footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid var(--card-border);
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .manifest-preview {
      margin-top: 1.5rem;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      text-align: left;
    }

    .manifest-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0.75rem;
      font-size: 0.8rem;
      font-family: 'JetBrains Mono', monospace;
    }
    .manifest-table th, .manifest-table td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      text-align: left;
    }
    .manifest-table th { color: #94a3b8; font-weight: 600; }
    .sha-code { color: #38bdf8; }

    @media (max-width: 768px) {
      body { padding: 1rem; }
      .header { flex-direction: column; align-items: flex-start; }
      .test-evidence-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="header-info">
        <h1>&#128737; QA Automation Evidence Report</h1>
        <div class="header-meta">
          <span><strong>Project:</strong> ${escapeHtml(projectName)}</span>
          <span><strong>Executed:</strong> ${escapeHtml(timestampFormatted)}</span>
          <span><strong>Environment:</strong> ${escapeHtml(environment)}</span>
          <span><strong>Duration:</strong> ${summary.durationFormatted || (summary.durationMs + 'ms')}</span>
        </div>
      </div>
      <div class="header-actions">
        <a href="playwright-report/index.html" class="btn btn-primary" target="_blank">&#128065; Playwright Interactive Report</a>
        ${zipInfo && zipInfo.zipName ? `<a href="${escapeHtml(zipInfo.zipName)}" download class="btn btn-zip">&#128190; Download Evidence ZIP (${escapeHtml(zipInfo.sizeFormatted)})</a>` : ''}
        <a href="evidence-manifest.json" target="_blank" class="btn btn-secondary">&#128220; Evidence Manifest</a>
      </div>
    </header>

    <!-- Metrics Grid -->
    <section class="metrics-grid">
      <div class="metric-card card-total">
        <div class="metric-label">Total Executed</div>
        <div class="metric-value">${summary.total}</div>
      </div>
      <div class="metric-card card-passed">
        <div class="metric-label">Passed</div>
        <div class="metric-value" style="color: #34d399;">${summary.passed}</div>
      </div>
      <div class="metric-card card-failed">
        <div class="metric-label">Failed</div>
        <div class="metric-value" style="color: #f87171;">${summary.failed}</div>
      </div>
      <div class="metric-card card-flaky">
        <div class="metric-label">Flaky</div>
        <div class="metric-value" style="color: #fbbf24;">${summary.flaky}</div>
      </div>
      <div class="metric-card card-rate">
        <div class="metric-label">Pass Rate</div>
        <div class="metric-value" style="color: #38bdf8;">${passRate}%</div>
      </div>
    </section>

    ${coverageHtml}

    <!-- Controls Bar -->
    <div class="controls-bar">
      <div class="filter-tabs">
        <button class="filter-btn active" onclick="filterTests('all')">All (${summary.total})</button>
        <button class="filter-btn" onclick="filterTests('passed')">Passed (${summary.passed})</button>
        <button class="filter-btn" onclick="filterTests('failed')">Failed (${summary.failed})</button>
        ${summary.flaky > 0 ? `<button class="filter-btn" onclick="filterTests('flaky')">Flaky (${summary.flaky})</button>` : ''}
        ${summary.skipped > 0 ? `<button class="filter-btn" onclick="filterTests('skipped')">Skipped (${summary.skipped})</button>` : ''}
      </div>
      <input type="text" id="searchInput" class="search-input" placeholder="Search test ID, name, module..." oninput="handleSearch()">
    </div>

    <!-- Test List with Video Players -->
    <main class="test-list" id="testList">
      ${testCardsHtml}
    </main>

    <!-- File Manifest Preview & Verification -->
    <section class="manifest-preview">
      <h3>&#128274; Tamper-Evident Evidence Manifest (SHA-256 Checksums)</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
        Every recording, screenshot, and report file in this archive is hashed to ensure integrity and audit verification.
      </p>
      <div style="max-height: 260px; overflow-y: auto; margin-top: 0.75rem;">
        <table class="manifest-table">
          <thead>
            <tr>
              <th>Relative File Path</th>
              <th>Size</th>
              <th>SHA-256 Checksum</th>
            </tr>
          </thead>
          <tbody>
            ${(manifestFiles || []).map(f => `
              <tr>
                <td>${escapeHtml(f.path)}</td>
                <td>${escapeHtml(f.sizeFormatted)}</td>
                <td class="sha-code">${escapeHtml(f.sha256.substring(0, 16))}...${escapeHtml(f.sha256.substring(56))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p>Permanent Evidence Storage &bull; Antigravity Senior QA Automation Architecture &bull; Amerck QA Care EMR</p>
      <p style="margin-top: 0.25rem; font-size: 0.8rem;">Archive Timestamp: <code>${escapeHtml(executionTimestamp)}</code></p>
    </footer>
  </div>

  <script>
    let currentFilter = 'all';

    function filterCoverage(q) {
      q = q.toLowerCase();
      document.querySelectorAll('#coverageTable tbody tr').forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
      });
    }

    function filterTests(status) {
      currentFilter = status;
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      applyFilters();
    }

    function handleSearch() {
      applyFilters();
    }

    function applyFilters() {
      const query = document.getElementById('searchInput').value.toLowerCase();
      const cards = document.querySelectorAll('.test-card');

      cards.forEach(card => {
        const cardStatus = card.getAttribute('data-status');
        const cardText = card.innerText.toLowerCase();

        const matchesFilter = (currentFilter === 'all') || (cardStatus === currentFilter);
        const matchesSearch = !query || cardText.includes(query);

        if (matchesFilter && matchesSearch) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Generates Master Archive Portal Index HTML
 * Lists all previous executions saved in QA-Automation-Evidence
 * @param {Array<object>} archives
 * @returns {string}
 */
function generateMasterPortalHtml(archives) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Permanent Evidence Archive Portal | Amerck QA Care EMR</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b1120;
      --card-bg: #1e293b;
      --border: rgba(255, 255, 255, 0.08);
      --primary: #3b82f6;
      --success: #10b981;
      --danger: #ef4444;
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Outfit', sans-serif;
      padding: 2.5rem 1.5rem;
      min-height: 100vh;
    }
    .container { max-width: 1300px; margin: 0 auto; }
    header {
      margin-bottom: 2.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, #60a5fa, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle { color: var(--muted); font-size: 0.95rem; margin-top: 0.25rem; }
    .badge-count {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
      padding: 0.4rem 0.8rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--card-bg);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    th, td {
      padding: 1rem 1.25rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }
    th {
      background: rgba(0, 0, 0, 0.2);
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
    }
    tr:hover { background: rgba(255, 255, 255, 0.02); }
    .status-pill {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .pill-pass { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .pill-fail { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-act {
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-view { background: #2563eb; color: white; }
    .btn-view:hover { background: #1d4ed8; }
    .btn-pw { background: rgba(255,255,255,0.08); color: #cbd5e1; }
    .btn-pw:hover { background: rgba(255,255,255,0.15); }
    .btn-download { background: #059669; color: white; }
    .btn-download:hover { background: #047857; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>&#128193; QA Permanent Evidence Archive Portal</h1>
        <p class="subtitle">Complete audit record of all automated test executions with screen recordings &amp; verification manifests</p>
      </div>
      <div class="badge-count">${archives.length} Saved Executions</div>
    </header>

    <table>
      <thead>
        <tr>
          <th>Execution Date &amp; Time</th>
          <th>Total Tests</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Pass Rate</th>
          <th>ZIP Archive</th>
          <th>Direct Access</th>
        </tr>
      </thead>
      <tbody>
        ${archives.map(a => {
          const passRate = a.total > 0 ? Math.round((a.passed / a.total) * 100) : 0;
          return `
            <tr>
              <td>
                <strong>${escapeHtml(a.timestampFormatted || a.folderName)}</strong><br>
                <span style="font-size: 0.75rem; color: var(--muted); font-family: monospace;">${escapeHtml(a.folderName)}</span>
              </td>
              <td>${a.total}</td>
              <td style="color: #34d399; font-weight: 600;">${a.passed}</td>
              <td style="color: #f87171; font-weight: 600;">${a.failed}</td>
              <td>
                <span class="status-pill ${a.failed === 0 ? 'pill-pass' : 'pill-fail'}">${passRate}%</span>
              </td>
              <td>
                ${a.zipSize ? `<span style="font-size: 0.8rem; color: var(--muted);">${escapeHtml(a.zipSize)}</span>` : '-'}
              </td>
              <td>
                <div class="actions">
                  <a href="${escapeHtml(a.folderName)}/index.html" class="btn-act btn-view">&#128065; Evidence Portal</a>
                  <a href="${escapeHtml(a.folderName)}/playwright-report/index.html" class="btn-act btn-pw" target="_blank">&#127760; Playwright HTML</a>
                  ${a.hasZip ? `<a href="${escapeHtml(a.folderName)}/complete-evidence.zip" download class="btn-act btn-download">&#128190; ZIP</a>` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

module.exports = {
  generateEvidenceDashboardHtml,
  generateMasterPortalHtml
};
