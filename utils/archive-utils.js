// @ts-check
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { isRestrictedFile } = require('./security-sanitizer');

/**
 * Archive & Checksum Utilities
 * Handles cryptographic hashing, ZIP packaging, and resilient file operations.
 */

/**
 * Calculates SHA-256 hash for a single file
 * @param {string} filePath
 * @returns {string} Hexadecimal SHA-256 string
 */
function calculateSha256(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found for checksum: ${filePath}`);
  }
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Formats a Date object to YYYY-MM-DD_HH-mm-ss
 * @param {Date} [date]
 * @returns {string}
 */
function getFormattedTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Formats bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Safely copies a file with retry logic to avoid Windows handle locks
 * @param {string} src
 * @param {string} dest
 * @param {number} [retries=3]
 */
function safeCopyFile(src, dest, retries = 3) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      fs.copyFileSync(src, dest);
      return;
    } catch (err) {
      if (attempt === retries) {
        throw new Error(`Failed to copy ${src} to ${dest} after ${retries} attempts: ${err.message}`);
      }
      // Small pause before retry
      const delayMs = 300 * attempt;
      const start = Date.now();
      while (Date.now() - start < delayMs) {
        // synchronous busy wait
      }
    }
  }
}

/**
 * Recursively copies a directory
 * @param {string} srcDir
 * @param {string} destDir
 * @param {Function} [filterFn] Optional filter: (srcPath) => boolean
 */
function copyDirectoryRecursive(srcDir, destDir, filterFn = null) {
  if (!fs.existsSync(srcDir)) return;

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (filterFn && !filterFn(srcPath)) {
      continue;
    }

    if (isRestrictedFile(srcPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath, filterFn);
    } else {
      safeCopyFile(srcPath, destPath);
    }
  }
}

/**
 * Recursively scans directory and generates checksum manifest
 * @param {string} dirPath
 * @param {string} [baseDir]
 * @param {string[]} [excludePatterns]
 * @returns {Array<{path: string, sizeBytes: number, sizeFormatted: string, sha256: string}>}
 */
function generateDirectoryManifest(dirPath, baseDir = dirPath, excludePatterns = ['.zip', '.tmp']) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (excludePatterns.some(ext => entry.name.endsWith(ext))) {
      continue;
    }

    if (entry.isDirectory()) {
      const subResults = generateDirectoryManifest(fullPath, baseDir, excludePatterns);
      results.push(...subResults);
    } else {
      const stats = fs.statSync(fullPath);
      const sha256 = calculateSha256(fullPath);
      results.push({
        path: relPath,
        sizeBytes: stats.size,
        sizeFormatted: formatBytes(stats.size),
        sha256
      });
    }
  }

  return results;
}

/**
 * Compresses a directory into a ZIP archive
 * Tries tar.exe first (native on Win 10/11 & Unix), falls back to PowerShell Compress-Archive
 * @param {string} sourceDir Absolute path of directory to zip
 * @param {string} outputZipPath Absolute path of resulting zip file
 * @returns {{success: boolean, zipPath: string, sizeBytes: number, sha256: string}}
 */
function createZipArchive(sourceDir, outputZipPath) {
  const outputDir = path.dirname(outputZipPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Remove existing zip if present
  if (fs.existsSync(outputZipPath)) {
    try {
      fs.unlinkSync(outputZipPath);
    } catch (_) {}
  }

  const zipName = path.basename(outputZipPath);
  let created = false;

  // Method 1: Using bsdtar / tar.exe (fastest & native on Windows 10/11)
  try {
    // Run tar inside sourceDir to avoid nesting parent paths
    // tar.exe -a -c -f output.zip --exclude="output.zip" *
    const cmd = `tar.exe -a -c -f "${outputZipPath}" --exclude="${zipName}" *`;
    execSync(cmd, { cwd: sourceDir, stdio: 'pipe' });
    if (fs.existsSync(outputZipPath) && fs.statSync(outputZipPath).size > 0) {
      created = true;
    }
  } catch (errTar) {
    // Fallback to Method 2
  }

  // Method 2: PowerShell Compress-Archive
  if (!created) {
    try {
      const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outputZipPath}' -Force"`;
      execSync(psCmd, { stdio: 'pipe' });
      if (fs.existsSync(outputZipPath) && fs.statSync(outputZipPath).size > 0) {
        created = true;
      }
    } catch (errPs) {
      throw new Error(`Failed to create ZIP archive using both tar and PowerShell: ${errPs.message}`);
    }
  }

  const stats = fs.statSync(outputZipPath);
  const sha256 = calculateSha256(outputZipPath);

  return {
    success: true,
    zipPath: outputZipPath,
    sizeBytes: stats.size,
    sizeFormatted: formatBytes(stats.size),
    sha256
  };
}

module.exports = {
  calculateSha256,
  getFormattedTimestamp,
  formatBytes,
  safeCopyFile,
  copyDirectoryRecursive,
  generateDirectoryManifest,
  createZipArchive
};
