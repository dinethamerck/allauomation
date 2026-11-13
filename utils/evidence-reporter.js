// @ts-check
const fs = require('fs');
const path = require('path');
const {
  getFormattedTimestamp,
  formatBytes,
  safeCopyFile,
  copyDirectoryRecursive,
  generateDirectoryManifest,
  createZipArchive
} = require('./archive-utils');
const { sanitizeText, sanitizeData } = require('./security-sanitizer');
const { generateEvidenceDashboardHtml, generateMasterPortalHtml } = require('./evidence-html-generator');
const { loadTestCaseCatalog, extractTestCaseId } = require('./testcase-catalog');

/**
 * Custom Playwright Reporter: EvidenceArchiverReporter
 *
 * Runs alongside the built-in 'list' and 'html' reporters (it does NOT replace them).
 * After every run it creates a NEW timestamped folder under QA-Automation-Evidence/ containing:
 *   - playwright-report/      (full copy of native HTML report incl. videos/traces in data/)
 *   - test-results/videos/    (every attempt's .webm, uniquely named, incl. retries)
 *   - test-results/screenshots/
 *   - test-results/traces/
 *   - test-results.json, execution.log, index.html (evidence dashboard)
 *   - evidence-manifest.json (SHA-256 for every file), complete-evidence.zip (+ .sha256)
 * Previous archive folders are never touched or overwritten.
 */
class EvidenceArchiverReporter {
  constructor(options = {}) {
    this.options = {
      evidenceDir: 'QA-Automation-Evidence',
      appName: 'Amerck QA Care EMR & Prescription Automation',
      environment: 'QA',
      generateZip: true,
      ...options
    };
    /** @type {Array<any>} one entry per attempt */
    this.attempts = [];
    /** @type {Map<string, any>} test.id -> TestCase (for final outcome) */
    this.testCases = new Map();
    this.startTime = new Date();
    this.executionLogs = [];
  }

  printsToStdio() {
    return false; // let 'list' reporter own the console output
  }

  log(msg) {
    this.executionLogs.push(`[${new Date().toISOString()}] ${sanitizeText(msg)}`);
  }

  onBegin(config, suite) {
    this.startTime = new Date();
    this.log(`Run started: ${this.options.appName} | Env: ${this.options.environment} | Tests: ${suite.allTests().length} | Workers: ${config.workers}`);
  }

  onTestBegin(test, result) {
    this.log(`START  [${this._extractTestId(test.title)}] ${test.title} (attempt ${result.retry})`);
  }

  onStdOut(chunk, test) {
    if (test) this.log(`STDOUT [${this._extractTestId(test.title)}] ${String(chunk).trim()}`);
  }

  onStdErr(chunk, test) {
    if (test) this.log(`STDERR [${this._extractTestId(test.title)}] ${String(chunk).trim()}`);
  }

  onTestEnd(test, result) {
    const testId = this._extractTestId(test.title);
    this.testCases.set(test.id, test);
    this.log(`END    [${testId}] ${test.title} -> ${result.status.toUpperCase()} (${result.duration}ms, attempt ${result.retry})`);

    const errors = (result.errors || []).map(e => ({
      message: sanitizeText(e.message || String(e)),
      stack: e.stack ? sanitizeText(e.stack) : null
    }));
    for (const e of errors) this.log(`ERROR  [${testId}] ${e.message.split('\n')[0]}`);

    const flattenSteps = (steps, depth = 0) => steps.flatMap(s => [
      {
        title: `${'  '.repeat(depth)}${sanitizeText(s.title)}`,
        category: s.category,
        durationMs: s.duration,
        error: s.error ? sanitizeText(s.error.message || String(s.error)) : null
      },
      ...(depth < 2 ? flattenSteps(s.steps || [], depth + 1) : [])
    ]);

    const project = test.parent?.project();
    const filePath = test.location?.file
      ? path.relative(process.cwd(), test.location.file).replace(/\\/g, '/')
      : 'unknown';

    this.attempts.push({
      testCaseId: test.id,
      id: testId,
      title: sanitizeText(test.title),
      fullTitle: sanitizeText(test.titlePath().filter(Boolean).join(' > ')),
      file: filePath,
      line: test.location?.line,
      module: this._getModuleName(filePath),
      suite: sanitizeText(test.parent?.title || 'Root'),
      status: result.status, // passed | failed | timedOut | skipped | interrupted
      expectedStatus: test.expectedStatus,
      retry: result.retry,
      durationMs: result.duration,
      durationFormatted: this._formatDuration(result.duration),
      startTime: result.startTime ? new Date(result.startTime).toISOString() : null,
      project: project?.name || 'default',
      browser: project?.use?.defaultBrowserType || project?.use?.browserName || project?.name || 'chromium',
      error: errors[0]?.message || null,
      stack: errors[0]?.stack || null,
      errors,
      steps: flattenSteps(result.steps || []),
      annotations: (test.annotations || []).map(a => ({ type: a.type, description: sanitizeText(a.description || '') })),
      rawAttachments: (result.attachments || []).map(a => ({
        name: a.name,
        contentType: a.contentType,
        path: a.path ? path.resolve(a.path) : null
      }))
    });
  }

  async onEnd(result) {
    const totalMs = Date.now() - this.startTime.getTime();
    this.log(`Run finished: overall status ${result.status.toUpperCase()} in ${this._formatDuration(totalMs)}`);
    try {
      await this._archiveExecution(result, totalMs);
    } catch (err) {
      // Never change the run's exit code / test verdicts because archiving failed.
      console.error(`\x1b[31m[EvidenceManager] Archiving failed: ${err && err.stack || err}\x1b[0m`);
    }
  }

  async _archiveExecution(fullResult, totalMs) {
    const now = new Date();
    const baseDir = path.resolve(process.cwd(), this.options.evidenceDir);
    let folderName = getFormattedTimestamp(now);
    // Guarantee a brand-new folder (never overwrite an earlier run)
    let suffix = 1;
    while (fs.existsSync(path.join(baseDir, folderName))) {
      folderName = `${getFormattedTimestamp(now)}_${suffix++}`;
    }
    const archiveDir = path.join(baseDir, folderName);
    const videosDir = path.join(archiveDir, 'test-results', 'videos');
    const shotsDir = path.join(archiveDir, 'test-results', 'screenshots');
    const tracesDir = path.join(archiveDir, 'test-results', 'traces');
    const otherDir = path.join(archiveDir, 'test-results', 'attachments');
    [videosDir, shotsDir, tracesDir, otherDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

    console.log(`\n\x1b[36m[EvidenceManager]\x1b[0m Archiving evidence to ${archiveDir}`);

    // 1. Full native Playwright HTML report (html reporter runs before us, so it is complete)
    const srcReport = path.resolve(process.cwd(), 'playwright-report');
    if (fs.existsSync(srcReport)) copyDirectoryRecursive(srcReport, path.join(archiveDir, 'playwright-report'));

    // 2. Per-attempt artifacts with unique, test-linked names
    const finalized = this.attempts.map((a, idx) => {
      const t = { ...a, videoPath: null, tracePath: null, screenshots: [], attachments: [] };
      const seq = String(idx + 1).padStart(3, '0');
      const base = `${seq}_${this._safe(a.id)}_${this._safe(a.title).slice(0, 60)}_${this._safe(a.project)}_retry${a.retry}_${a.status}`;
      let shotN = 0, vidN = 0, otherN = 0;

      for (const att of a.rawAttachments) {
        if (!att.path || !fs.existsSync(att.path)) continue;
        const ext = path.extname(att.path) || '';
        const isVideo = att.name === 'video' || (att.contentType || '').startsWith('video/');
        const isShot = (att.contentType || '').startsWith('image/');
        const isTrace = att.name === 'trace';

        if (isVideo) {
          const name = `${base}${vidN++ ? `_${vidN}` : ''}${ext || '.webm'}`;
          safeCopyFile(att.path, path.join(videosDir, name));
          if (!t.videoPath) t.videoPath = `test-results/videos/${name}`;
          t.attachments.push({ type: 'video', path: `test-results/videos/${name}` });
        } else if (isShot) {
          const name = `${base}_screenshot_${++shotN}${ext || '.png'}`;
          safeCopyFile(att.path, path.join(shotsDir, name));
          t.screenshots.push({ name: att.name, path: `test-results/screenshots/${name}` });
        } else if (isTrace) {
          const name = `${base}_trace.zip`;
          safeCopyFile(att.path, path.join(tracesDir, name));
          t.tracePath = `test-results/traces/${name}`;
        } else {
          // error-context.md and any other file attachments
          const name = `${base}_${this._safe(att.name)}_${++otherN}${ext}`;
          safeCopyFile(att.path, path.join(otherDir, name));
          t.attachments.push({ type: att.name, path: `test-results/attachments/${name}` });
        }
      }
      delete t.rawAttachments;
      return t;
    });

    // 3. Final per-test outcome (this is where "flaky" comes from - never upgrades a failure to pass)
    const outcomeMap = { expected: 'passed', unexpected: 'failed', flaky: 'flaky', skipped: 'skipped' };
    const outcomes = {};
    for (const [id, tc] of this.testCases) outcomes[id] = outcomeMap[tc.outcome()] || tc.outcome();
    finalized.forEach(t => { t.outcome = outcomes[t.testCaseId] || t.status; });

    const finals = Object.values(outcomes);
    const summary = {
      total: finals.length,
      passed: finals.filter(o => o === 'passed').length,
      failed: finals.filter(o => o === 'failed').length,
      flaky: finals.filter(o => o === 'flaky').length,
      skipped: finals.filter(o => o === 'skipped').length,
      attempts: finalized.length,
      videos: finalized.filter(t => t.videoPath).length,
      overallStatus: fullResult.status,
      durationMs: totalMs,
      durationFormatted: this._formatDuration(totalMs)
    };

    // 4. test-results.json
    fs.writeFileSync(path.join(archiveDir, 'test-results.json'), JSON.stringify(sanitizeData({
      project: this.options.appName,
      environment: this.options.environment,
      executionTimestamp: now.toISOString(),
      folderName,
      host: { platform: process.platform, node: process.version },
      summary,
      tests: finalized
    }), null, 2));

    // 4b. Full test-case coverage: every documented case (CSV) + every executed test
    const coverage = this._buildCoverage(finalized);
    const csvEsc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    fs.writeFileSync(path.join(archiveDir, 'testcase-coverage.csv'), [
      ['Test Case ID', 'Source', 'Module', 'Scenario', 'Priority', 'Automated', 'Final Result', 'Attempts', 'Duration', 'Video', 'Error'].map(csvEsc).join(','),
      ...coverage.rows.map(r => [r.id, r.sourceFile, r.module, r.scenario, r.priority, r.automated ? 'Yes' : 'No',
        r.result, r.attempts, r.duration, r.videoPath || '', (r.error || '').split('\n')[0]].map(csvEsc).join(','))
    ].join('\r\n'));
    fs.writeFileSync(path.join(archiveDir, 'testcase-coverage.json'), JSON.stringify(sanitizeData(coverage), null, 2));

    // 5. execution.log
    const log = [
      '='.repeat(80),
      `QA AUTOMATION EXECUTION LOG - ${this.options.appName}`,
      `Started: ${this.startTime.toISOString()}   Archived: ${now.toISOString()}`,
      `Tests: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Flaky: ${summary.flaky} | Skipped: ${summary.skipped} | Attempts: ${summary.attempts}`,
      '='.repeat(80),
      ...this.executionLogs,
      '',
      '='.repeat(80),
      'PER-ATTEMPT BREAKDOWN',
      '='.repeat(80),
      ...finalized.map(t =>
        `[${t.status.toUpperCase()}] (final: ${t.outcome}) [${t.id}] ${t.title} | ${t.project} | retry ${t.retry} | ${t.durationFormatted}` +
        (t.videoPath ? `\n    video: ${t.videoPath}` : '\n    video: (none)') +
        (t.tracePath ? `\n    trace: ${t.tracePath}` : '') +
        (t.error ? `\n    error: ${t.error.split('\n')[0]}` : ''))
    ].join('\n');
    fs.writeFileSync(path.join(archiveDir, 'execution.log'), sanitizeText(log));

    // 6. Dashboard (manifest table shows the evidence files listed so far)
    const preManifest = generateDirectoryManifest(archiveDir, archiveDir, ['.zip.sha256']);
    fs.writeFileSync(path.join(archiveDir, 'index.html'), generateEvidenceDashboardHtml({
      executionTimestamp: now.toISOString(),
      timestampFormatted: now.toLocaleString(),
      projectName: this.options.appName,
      environment: this.options.environment,
      summary,
      tests: finalized,
      coverage,
      manifestFiles: preManifest.filter(f => !f.path.startsWith('playwright-report/')),
      zipInfo: this.options.generateZip ? { zipName: 'complete-evidence.zip', sizeFormatted: 'full archive' } : null
    }));

    // 7. evidence-manifest.json - written BEFORE zipping so the ZIP contains it and hashes stay valid
    const files = generateDirectoryManifest(archiveDir, archiveDir, ['.zip.sha256']).filter(f => f.path !== 'complete-evidence.zip');
    const manifest = {
      archiveVersion: '1.1.0',
      projectName: this.options.appName,
      environment: this.options.environment,
      executionTimestamp: now.toISOString(),
      folderName,
      algorithm: 'SHA-256',
      summary,
      fileCount: files.length,
      totalBytes: files.reduce((s, f) => s + f.sizeBytes, 0),
      files
    };
    fs.writeFileSync(path.join(archiveDir, 'evidence-manifest.json'), JSON.stringify(manifest, null, 2));

    // 8. complete-evidence.zip + checksum sidecar
    let zip = null;
    if (this.options.generateZip) {
      zip = createZipArchive(archiveDir, path.join(archiveDir, 'complete-evidence.zip'));
      fs.writeFileSync(path.join(archiveDir, 'complete-evidence.zip.sha256'), `${zip.sha256}  complete-evidence.zip\n`);
    }

    // 9. Master portal across ALL runs
    this._updateMasterPortal(baseDir);

    const url = p => `file:///${p.replace(/\\/g, '/')}`;
    console.log(`\x1b[32m✔ Evidence archived permanently\x1b[0m  (${summary.total} tests, ${summary.attempts} attempts, ${summary.videos} videos)`);
    console.log(`  Dashboard : ${url(path.join(archiveDir, 'index.html'))}`);
    console.log(`  PW report : ${url(path.join(archiveDir, 'playwright-report', 'index.html'))}`);
    if (zip) console.log(`  ZIP       : ${url(zip.zipPath)} (${zip.sizeFormatted})`);
    console.log(`  All runs  : ${url(path.join(baseDir, 'index.html'))}\n`);
  }

  _updateMasterPortal(baseDir) {
    try {
      const archives = [];
      for (const e of fs.readdirSync(baseDir, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        const res = path.join(baseDir, e.name, 'test-results.json');
        if (!fs.existsSync(res)) continue;
        try {
          const d = JSON.parse(fs.readFileSync(res, 'utf8'));
          const zipPath = path.join(baseDir, e.name, 'complete-evidence.zip');
          const hasZip = fs.existsSync(zipPath);
          archives.push({
            folderName: e.name,
            executionTimestamp: d.executionTimestamp,
            timestampFormatted: new Date(d.executionTimestamp).toLocaleString(),
            total: d.summary?.total || 0,
            passed: d.summary?.passed || 0,
            failed: d.summary?.failed || 0,
            flaky: d.summary?.flaky || 0,
            hasZip,
            zipSize: hasZip ? formatBytes(fs.statSync(zipPath).size) : null
          });
        } catch (_) { /* skip unreadable archive */ }
      }
      archives.sort((a, b) => b.folderName.localeCompare(a.folderName));
      fs.writeFileSync(path.join(baseDir, 'index.html'), generateMasterPortalHtml(archives));
      fs.writeFileSync(path.join(baseDir, 'manifest-index.json'), JSON.stringify(archives, null, 2));
    } catch (err) {
      console.error(`[EvidenceManager] Could not update master portal: ${err.message}`);
    }
  }

  _extractTestId(title) {
    return extractTestCaseId(title) || 'NO-ID';
  }

  /** Joins documented CSV cases with executed tests (final outcome, last attempt evidence). */
  _buildCoverage(finalized) {
    const catalog = loadTestCaseCatalog(process.cwd());
    const byId = new Map();
    for (const t of finalized) {
      const key = t.id !== 'NO-ID' ? t.id : `${t.project}:${t.title}`;
      const e = byId.get(key) || { attempts: [], outcome: t.outcome };
      e.attempts.push(t);
      e.outcome = t.outcome;
      byId.set(key, e);
    }
    const resultOf = e => {
      const last = e.attempts[e.attempts.length - 1];
      const withVideo = [...e.attempts].reverse().find(a => a.videoPath);
      return {
        automated: true,
        result: e.outcome,
        attempts: e.attempts.length,
        duration: last.durationFormatted,
        videoPath: withVideo ? withVideo.videoPath : null,
        error: e.attempts.find(a => a.error)?.error || null,
        file: last.file
      };
    };
    const seen = new Set();
    const rows = catalog.map(c => {
      const e = byId.get(c.id);
      if (e) seen.add(c.id);
      return { ...c, ...(e ? resultOf(e) : { automated: false, result: 'not-run', attempts: 0, duration: '', videoPath: null, error: null }) };
    });
    // Documented-but-not-executed: distinguish "has a test but filtered out" vs "no automation"
    const specText = (() => {
      try {
        return fs.readdirSync(path.join(process.cwd(), 'tests'))
          .filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(process.cwd(), 'tests', f), 'utf8')).join('\n');
      } catch (_) { return ''; }
    })();
    for (const r of rows) {
      if (r.result === 'not-run') {
        const hasTest = new RegExp(`${r.id.replace(/[-]/g, '\\-')}(?![0-9A-Z-])`, 'i').test(specText);
        r.automated = hasTest;
        r.result = hasTest ? 'not-run' : 'not-automated';
      }
    }
    // Executed tests that aren't in any CSV
    for (const [key, e] of byId) {
      if (seen.has(key)) continue;
      const t = e.attempts[0];
      rows.push({ id: t.id, sourceFile: '(not documented)', module: t.module, scenario: t.title, priority: '', type: '', steps: '', expected: '', ...resultOf(e) });
    }
    const count = r => rows.filter(x => x.result === r).length;
    return {
      documented: catalog.length,
      automated: rows.filter(r => r.automated).length,
      executed: rows.filter(r => !['not-run', 'not-automated'].includes(r.result)).length,
      passed: count('passed'), failed: count('failed'), flaky: count('flaky'), skipped: count('skipped'),
      notRun: count('not-run'), notAutomated: count('not-automated'),
      rows
    };
  }

  _getModuleName(filePath) {
    const base = path.basename(filePath).replace(/\.(spec|setup|test)\.[jt]s$/, '').replace(/_/g, ' ');
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  _safe(s) {
    return String(s || '').replace(/[^A-Za-z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  }

  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)}s`;
    return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  }
}

module.exports = EvidenceArchiverReporter;
