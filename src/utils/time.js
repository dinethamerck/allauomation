const { env } = require('../config/env');

const offsetMinutes = (() => {
  const [, sign, h, m] = env.orgUtcOffset.match(/([+-])(\d{2}):(\d{2})/);
  return (sign === '-' ? -1 : 1) * (Number(h) * 60 + Number(m));
})();

/** "2026-10-30 15:12" (org local time, as stored in next_visit_date) -> Date */
function parseOrgDateTime(value) {
  const [date, time = '00:00'] = value.trim().split(/[ T]/);
  return new Date(`${date}T${time.slice(0, 5)}:00${env.orgUtcOffset}`);
}

/** Date -> "YYYY-MM-DD HH:mm" in org local time */
function formatOrgDateTime(date) {
  return new Date(date.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 16).replace('T', ' ');
}

/** Date -> "YYYY-MM-DD" in org local time */
const formatOrgDate = date => formatOrgDateTime(date).slice(0, 10);

/** Today in org local time, shifted by `days`, as { iso: 'YYYY-MM-DD', day, monthOffset } */
function orgDay(days = 0) {
  const now = new Date();
  const target = new Date(now.getTime() + days * 86_400_000);
  const [ny, nm] = formatOrgDate(now).split('-').map(Number);
  const iso = formatOrgDate(target);
  const [y, m, d] = iso.split('-').map(Number);
  return { iso, day: d, monthOffset: (y - ny) * 12 + (m - nm) };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Collect-dialog preview "30 Oct 2026, 03:12 PM" -> "2026-10-30 15:12" */
function previewToOrgDateTime(text) {
  const m = text.match(/(\d{1,2}) (\w{3}) (\d{4}), (\d{1,2}):(\d{2}) (AM|PM)/);
  if (!m) throw new Error(`Unexpected scheduled preview "${text}"`);
  const [, d, mon, y, hh, mm, ampm] = m;
  const hour = (Number(hh) % 12) + (ampm === 'PM' ? 12 : 0);
  const pad = n => String(n).padStart(2, '0');
  return `${y}-${pad(MONTHS.indexOf(mon) + 1)}-${pad(d)} ${pad(hour)}:${mm}`;
}

const minutesBetween = (a, b) => Math.abs(parseOrgDateTime(a) - parseOrgDateTime(b)) / 60_000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function sleepUntil(date, extraMs = 0) {
  const ms = date.getTime() - Date.now() + extraMs;
  if (ms > 0) await sleep(ms);
}

module.exports = {
  parseOrgDateTime,
  formatOrgDateTime,
  formatOrgDate,
  orgDay,
  previewToOrgDateTime,
  minutesBetween,
  sleep,
  sleepUntil,
};
