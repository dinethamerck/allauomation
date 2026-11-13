const fs = require('fs');
const path = require('path');

// Original values of every configuration key a test changed. Written BEFORE the change and
// removed after a successful restore, so an aborted run (Ctrl+C, crash, killed CI job)
// leaves a file behind that the next run - or `npm run restore-config` - puts back.
const BACKUP_FILE = path.resolve(__dirname, '../../.auth/config-backup.json');

function remember(original, keys) {
  const saved = fs.existsSync(BACKUP_FILE) ? JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8')) : {};
  for (const key of keys) if (!(key in saved)) saved[key] = original[key];
  fs.mkdirSync(path.dirname(BACKUP_FILE), { recursive: true });
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(saved, null, 2));
}

/** Values in the backup file (the earliest originals), or {} when there is none. */
function saved() {
  return fs.existsSync(BACKUP_FILE) ? JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8')) : {};
}

function forget() {
  fs.rmSync(BACKUP_FILE, { force: true });
}

/** Restores a backup left by an aborted run. Returns the restored values, or null. */
async function restorePending(api) {
  if (!fs.existsSync(BACKUP_FILE)) return null;
  const saved = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
  if (Object.keys(saved).length) await api.updateConfiguration(saved);
  forget();
  return saved;
}

module.exports = { remember, saved, forget, restorePending, BACKUP_FILE };
