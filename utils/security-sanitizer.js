// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * Security & PHI Data Sanitizer
 * Protects credentials, tokens, and patient-sensitive data from being exposed in logs and reports.
 */

// Collect known sensitive strings from environment
const SENSITIVE_PATTERNS = [];

function initSensitivePatterns() {
  const sensitiveEnvVars = [
    'QA_CARE_PASSWORD',
    'PASSWORD',
    'SECRET',
    'TOKEN',
    'API_KEY',
    'AUTH_TOKEN'
  ];

  for (const envKey of Object.keys(process.env)) {
    if (sensitiveEnvVars.some(s => envKey.toUpperCase().includes(s))) {
      const val = process.env[envKey];
      if (val && val.length >= 4) {
        SENSITIVE_PATTERNS.push(val);
      }
    }
  }
}

initSensitivePatterns();

/**
 * Masks sensitive values in a text string
 * @param {string} text
 * @returns {string}
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return text;
  let sanitized = text;

  // Mask known environment secrets
  for (const secret of SENSITIVE_PATTERNS) {
    if (secret && secret.length >= 4) {
      sanitized = sanitized.split(secret).join('********');
    }
  }

  // Mask Bearer tokens
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [MASKED_TOKEN]');

  // Mask JWT tokens
  sanitized = sanitized.replace(/ey[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+/g, '[MASKED_JWT]');

  // Mask password fields in JSON strings: "password": "..."
  sanitized = sanitized.replace(/("password"\s*:\s*")[^"]+(")/gi, '$1[MASKED]$2');
  sanitized = sanitized.replace(/('password'\s*:\s*')[^']+(')/gi, '$1[MASKED]$2');

  // Mask passwords in URLs: https://user:pass@domain.com
  sanitized = sanitized.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:[MASKED]@');

  return sanitized;
}

/**
 * Recursively sanitizes any object, array, or primitive
 * @param {any} data
 * @returns {any}
 */
function sanitizeData(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return sanitizeText(data);
  if (typeof data === 'number' || typeof data === 'boolean') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
        cleaned[key] = '[MASKED_CREDENTIAL]';
      } else {
        cleaned[key] = sanitizeData(value);
      }
    }
    return cleaned;
  }

  return data;
}

/**
 * Checks if a file path is sensitive and should never be copied into public evidence
 * @param {string} filePath
 * @returns {boolean}
 */
function isRestrictedFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const base = path.basename(normalized);

  if (base === '.env' || base.startsWith('.env.')) return true;
  if (normalized.includes('playwright/.auth/user.json')) return true;
  if (base === 'id_rsa' || base.endsWith('.pem') || base.endsWith('.key')) return true;

  return false;
}

module.exports = {
  sanitizeText,
  sanitizeData,
  isRestrictedFile
};
