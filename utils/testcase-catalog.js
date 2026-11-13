// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * Test Case Catalog
 * Loads every documented test case from *_TEST_CASES.csv in the project root so the
 * evidence report can show ALL documented cases (automated + not yet automated)
 * next to their actual run result.
 */

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, newlines in quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(f => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(f => f !== '')) rows.push(row);
  if (rows.length === 0) return [];
  const header = rows[0].map(h => h.replace(/^\uFEFF/, '').trim());
  return rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] || '').trim()])));
}

/**
 * @param {string} rootDir
 * @returns {Array<{id:string, sourceFile:string, module:string, scenario:string, priority:string, type:string, expected:string, steps:string}>}
 */
function loadTestCaseCatalog(rootDir) {
  const out = [];
  let files = [];
  try {
    files = fs.readdirSync(rootDir).filter(f => /_TEST_CASES\.csv$/i.test(f));
  } catch (_) { return out; }

  for (const file of files.sort()) {
    try {
      const rows = parseCsv(fs.readFileSync(path.join(rootDir, file), 'utf8'));
      for (const r of rows) {
        const id = r['Test Case ID'];
        if (!id) continue;
        out.push({
          id: id.toUpperCase(),
          sourceFile: file,
          module: r['Module'] || r['Task / Module'] || r['Class'] || file.replace(/_TEST_CASES\.csv$/i, ''),
          scenario: r['Test Scenario'] || r['Function Name'] || '',
          priority: r['Priority'] || '',
          type: r['Type'] || '',
          steps: r['Test Steps'] || '',
          expected: r['Expected Result'] || ''
        });
      }
    } catch (_) { /* unreadable csv -> skip */ }
  }
  return out;
}

/** Extracts the full documented ID from a test title, e.g. "TC-SET-HUB-001: ..." */
function extractTestCaseId(title) {
  const m = String(title).match(/TC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+/i);
  return m ? m[0].toUpperCase() : null;
}

module.exports = { parseCsv, loadTestCaseCatalog, extractTestCaseId };
