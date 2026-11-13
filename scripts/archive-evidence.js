// @ts-check
const fs = require('fs');
const path = require('path');
const {
  calculateSha256,
  getFormattedTimestamp,
  formatBytes,
  safeCopyFile,
  copyDirectoryRecursive,
  generateDirectoryManifest,
  createZipArchive
} = require('../utils/archive-utils');
const { sanitizeText, sanitizeData } = require('../utils/security-sanitizer');
const { generateEvidenceDashboardHtml, generateMasterPortalHtml } = require('../utils/evidence-html-generator');

/**
 * On-Demand Archive Script
 * Packages current test-results and playwright-report into a permanent QA evidence archive.
 * Usage:
 *   node scripts/archive-evidence.js
 */

async function archiveExistingArtifacts() {
  const rootDir = process.cwd();
  const sourceReportDir = path.join(rootDir, 'playwright-report');
  const sourceResultsDir = path.join(rootDir, 'test-results');
  const baseEvidenceDir = path.join(rootDir, 'QA-Automation-Evidence');

  if (!fs.existsSync(sourceReportDir) && !fs.existsSync(sourceResultsDir)) {
    console.error(`\x1b[31m[Error] Neither 'playwright-report' nor 'test-results' exists in ${rootDir}. Run tests first!\x1b[0m`);
    process.exit(1);
  }

  const now = new Date();
  const folderTimestamp = getFormattedTimestamp(now);
  const archiveDir = path.join(baseEvidenceDir, folderTimestamp);

  const reportTargetDir = path.join(archiveDir, 'playwright-report');
  const testResultsTargetDir = path.join(archiveDir, 'test-results');
  const videosTargetDir = path.join(testResultsTargetDir, 'videos');
  const screenshotsTargetDir = path.join(testResultsTargetDir, 'screenshots');
  const tracesTargetDir = path.join(testResultsTargetDir, 'traces');

  fs.mkdirSync(videosTargetDir, { recursive: true });
  fs.mkdirSync(screenshotsTargetDir, { recursive: true });
  fs.mkdirSync(tracesTargetDir, { recursive: true });

  console.log(`\x1b[36m[ArchiveManager] Creating permanent archive at: ${archiveDir}\x1b[0m`);

  // 1. Copy playwright-report
  if (fs.existsSync(sourceReportDir)) {
    console.log(`[ArchiveManager] Preserving Playwright HTML report and interactive assets...`);
    copyDirectoryRecursive(sourceReportDir, reportTargetDir);
  }

  // 2. Discover and organize videos, screenshots, traces from test-results
  const collectedTests = [];
  if (fs.existsSync(sourceResultsDir)) {
    const entries = fs.readdirSync(sourceResultsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const subDir = path.join(sourceResultsDir, entry.name);
      const subFiles = fs.readdirSync(subDir);

      const isRetry = entry.name.includes('-retry');
      const retryMatch = entry.name.match(/-retry(\d+)/);
      const retry = retryMatch ? parseInt(retryMatch[1], 10) : (isRetry ? 1 : 0);

      const hasFailed = subFiles.some(f => f.includes('failed'));
      const status = hasFailed ? 'failed' : 'passed';

      // Parse ID
      const idMatch = entry.name.match(/TC-[A-Z0-9]+-[0-9]+/i);
      const testId = idMatch ? idMatch[0].toUpperCase() : 'TC-TEST';
      const cleanName = entry.name.replace(/[^A-Za-z0-9_-]/g, '_').substring(0, 50);

      let videoRelPath = null;
      const videoFile = subFiles.find(f => f.endsWith('.webm'));
      if (videoFile) {
        const destName = `${testId}_${cleanName}_attempt${retry}_${status}.webm`;
        safeCopyFile(path.join(subDir, videoFile), path.join(videosTargetDir, destName));
        videoRelPath = `test-results/videos/${destName}`;
      }

      const screenshots = [];
      const imageFiles = subFiles.filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
      let scIdx = 1;
      for (const img of imageFiles) {
        const destName = `${testId}_${cleanName}_screenshot_${scIdx}.png`;
        safeCopyFile(path.join(subDir, img), path.join(screenshotsTargetDir, destName));
        screenshots.push({ name: `Screenshot ${scIdx}`, path: `test-results/screenshots/${destName}` });
        scIdx++;
      }

      let traceRelPath = null;
      const traceFile = subFiles.find(f => f.endsWith('.zip'));
      if (traceFile) {
        const destName = `${testId}_${cleanName}_trace.zip`;
        safeCopyFile(path.join(subDir, traceFile), path.join(tracesTargetDir, destName));
        traceRelPath = `test-results/traces/${destName}`;
      }

      collectedTests.push({
        id: testId,
        title: entry.name.replace(/-/g, ' '),
        module: 'Automation Suite',
        status,
        retry,
        durationMs: 0,
        durationFormatted: 'N/A',
        videoPath: videoRelPath,
        screenshots,
        tracePath: traceRelPath
      });
    }
  }

  const summary = {
    total: collectedTests.length,
    passed: collectedTests.filter(t => t.status === 'passed').length,
    failed: collectedTests.filter(t => t.status === 'failed').length,
    flaky: 0,
    skipped: 0,
    durationMs: 0,
    durationFormatted: 'N/A'
  };

  // 3. Write test-results.json
  const testResultsData = {
    project: 'Amerck QA Care EMR & Prescription Automation',
    environment: 'QA',
    executionTimestamp: now.toISOString(),
    folderName: folderTimestamp,
    summary,
    tests: collectedTests
  };
  fs.writeFileSync(path.join(archiveDir, 'test-results.json'), JSON.stringify(testResultsData, null, 2), 'utf8');

  // 4. Write execution.log
  fs.writeFileSync(path.join(archiveDir, 'execution.log'), `Archived from existing test-results run at ${now.toISOString()}\nTotal Tests: ${summary.total}`, 'utf8');

  // 5. Initial manifest
  let manifestFiles = generateDirectoryManifest(archiveDir, archiveDir, ['.zip', '.tmp']);

  // 6. Write index.html dashboard
  const dashboardHtml = generateEvidenceDashboardHtml({
    executionTimestamp: now.toISOString(),
    timestampFormatted: now.toLocaleString(),
    projectName: 'Amerck QA Care EMR & Prescription Automation',
    environment: 'QA',
    summary,
    tests: collectedTests,
    manifestFiles,
    zipInfo: { zipName: 'complete-evidence.zip', sizeFormatted: 'Compressing...' }
  });
  fs.writeFileSync(path.join(archiveDir, 'index.html'), dashboardHtml, 'utf8');

  // 7. Create complete-evidence.zip
  console.log(`[ArchiveManager] Generating complete-evidence.zip...`);
  const zipPath = path.join(archiveDir, 'complete-evidence.zip');
  const zipResult = createZipArchive(archiveDir, zipPath);

  // Update index.html with zip size
  const finalDashboardHtml = generateEvidenceDashboardHtml({
    executionTimestamp: now.toISOString(),
    timestampFormatted: now.toLocaleString(),
    projectName: 'Amerck QA Care EMR & Prescription Automation',
    environment: 'QA',
    summary,
    tests: collectedTests,
    manifestFiles,
    zipInfo: { zipName: 'complete-evidence.zip', sizeFormatted: zipResult.sizeFormatted }
  });
  fs.writeFileSync(path.join(archiveDir, 'index.html'), finalDashboardHtml, 'utf8');

  // 8. Recompute manifest with zip
  manifestFiles = generateDirectoryManifest(archiveDir, archiveDir, ['.tmp']);
  const manifestData = {
    archiveVersion: '1.0.0',
    executionTimestamp: now.toISOString(),
    folderTimestamp,
    summary,
    zipArchive: {
      filename: 'complete-evidence.zip',
      sizeBytes: zipResult.sizeBytes,
      sizeFormatted: zipResult.sizeFormatted,
      sha256: zipResult.sha256
    },
    fileCount: manifestFiles.length,
    files: manifestFiles
  };
  fs.writeFileSync(path.join(archiveDir, 'evidence-manifest.json'), JSON.stringify(manifestData, null, 2), 'utf8');

  // 9. Update master index
  updateMasterPortal(baseEvidenceDir);

  console.log(`\n\x1b[32m✔ Archive complete! Folder: ${archiveDir}\x1b[0m\n`);
}

function updateMasterPortal(baseEvidenceDir) {
  try {
    const entries = fs.readdirSync(baseEvidenceDir, { withFileTypes: true });
    const archives = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const folderPath = path.join(baseEvidenceDir, entry.name);
      const resultsPath = path.join(folderPath, 'test-results.json');
      const zipPath = path.join(folderPath, 'complete-evidence.zip');

      if (fs.existsSync(resultsPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
          const hasZip = fs.existsSync(zipPath);
          archives.push({
            folderName: entry.name,
            executionTimestamp: data.executionTimestamp,
            timestampFormatted: new Date(data.executionTimestamp).toLocaleString(),
            total: data.summary?.total || 0,
            passed: data.summary?.passed || 0,
            failed: data.summary?.failed || 0,
            hasZip,
            zipSize: hasZip ? formatBytes(fs.statSync(zipPath).size) : null
          });
        } catch (_) {}
      }
    }
    archives.sort((a, b) => b.folderName.localeCompare(a.folderName));
    fs.writeFileSync(path.join(baseEvidenceDir, 'index.html'), generateMasterPortalHtml(archives), 'utf8');
  } catch (err) {
    console.error('Warning updating master portal:', err.message);
  }
}

archiveExistingArtifacts().catch(console.error);
