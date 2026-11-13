// @ts-check
const fs = require('fs');
const path = require('path');
const { calculateSha256, formatBytes } = require('../utils/archive-utils');

/**
 * List & Verify Evidence Archives
 * Usage:
 *   node scripts/list-evidence.js
 */

function listArchives() {
  const baseDir = path.join(process.cwd(), 'QA-Automation-Evidence');

  if (!fs.existsSync(baseDir)) {
    console.log(`\n\x1b[33mNo QA-Automation-Evidence directory found yet. Run tests to generate archives!\x1b[0m\n`);
    return;
  }

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const folders = entries.filter(e => e.isDirectory()).map(e => e.name);

  if (folders.length === 0) {
    console.log(`\n\x1b[33mNo execution archives stored in QA-Automation-Evidence yet.\x1b[0m\n`);
    return;
  }

  console.log(`\n\x1b[36m========================================================================================\x1b[0m`);
  console.log(`\x1b[36m📦 QA AUTOMATION PERMANENT EVIDENCE VAULT (${folders.length} Executions Recorded)\x1b[0m`);
  console.log(`\x1b[36m========================================================================================\x1b[0m\n`);

  for (const folder of folders.sort().reverse()) {
    const folderPath = path.join(baseDir, folder);
    const resultsPath = path.join(folderPath, 'test-results.json');
    const manifestPath = path.join(folderPath, 'evidence-manifest.json');
    const zipPath = path.join(folderPath, 'complete-evidence.zip');
    const reportHtml = path.join(folderPath, 'index.html');

    let summaryText = 'No summary';
    let verified = 'Unknown';
    let zipText = 'None';

    if (fs.existsSync(resultsPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        summaryText = `Total: ${d.summary?.total || 0} | Passed: \x1b[32m${d.summary?.passed || 0}\x1b[0m | Failed: \x1b[31m${d.summary?.failed || 0}\x1b[0m | Flaky: \x1b[33m${d.summary?.flaky || 0}\x1b[0m`;
      } catch (_) {}
    }

    if (fs.existsSync(zipPath)) {
      zipText = formatBytes(fs.statSync(zipPath).size);
    }

    if (fs.existsSync(manifestPath)) {
      try {
        const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        // Verify zip hash if present
        if (m.zipArchive && fs.existsSync(zipPath)) {
          const currentZipHash = calculateSha256(zipPath);
          verified = (currentZipHash === m.zipArchive.sha256) ? '\x1b[32mVERIFIED (SHA-256 MATCH)\x1b[0m' : '\x1b[31mCHECKSUM MISMATCH\x1b[0m';
        } else {
          verified = '\x1b[32mMANIFEST PRESENT\x1b[0m';
        }
      } catch (_) {
        verified = '\x1b[31mERROR\x1b[0m';
      }
    }

    console.log(`\x1b[1m📁 Archive: ${folder}\x1b[0m`);
    console.log(`   Results:      ${summaryText}`);
    console.log(`   ZIP Archive:  ${zipText}`);
    console.log(`   Integrity:    ${verified}`);
    console.log(`   Dashboard:    file:///${reportHtml.replace(/\\/g, '/')}`);
    console.log(`----------------------------------------------------------------------------------------`);
  }

  console.log(`\nMaster Portal: file:///${path.join(baseDir, 'index.html').replace(/\\/g, '/')}\n`);
}

listArchives();
