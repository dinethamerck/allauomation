const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}. Copy .env.example to .env and fill it in.`);
  return value;
}

const baseUrl = required('BASE_URL').replace(/\/$/, '');

const env = {
  baseUrl,
  apiUrl: (process.env.API_URL || baseUrl.replace('://qa_opt.', '://qa_opt_api.')).replace(/\/$/, ''),
  orgTimezone: process.env.ORG_TIMEZONE || 'Asia/Colombo',
  orgUtcOffset: process.env.ORG_UTC_OFFSET || '+05:30',
  patient: {
    mobile: required('TEST_PATIENT_MOBILE'),
    name: required('TEST_PATIENT_NAME'),
  },
};

// Credentials are exposed through a function (not a plain property) so that
// logging or serialising `env` can never leak them into reports.
Object.defineProperty(env, 'credentials', {
  enumerable: false,
  value(role) {
    const prefix = role.toUpperCase();
    return { username: required(`${prefix}_USERNAME`), password: required(`${prefix}_PASSWORD`) };
  },
});

const ROLES = ['admin', 'doctor'];
const authFile = role => path.resolve(__dirname, `../../.auth/${role}.json`);

module.exports = { env, ROLES, authFile };
