// tests-unit/global-setup.spec.js
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { isTokenValid } = require('../global-setup');

const ORIGIN = 'https://qa_pg.amerck.care';

function jwt(payload) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

function writeState(testInfo, state) {
  const file = testInfo.outputPath('user.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof state === 'string' ? state : JSON.stringify(state));
  return file;
}

const stateWith = (token, origin = ORIGIN) => ({
  cookies: [],
  origins: [{ origin, localStorage: token === null ? [] : [{ name: 'token', value: token }] }],
});

const inSeconds = (s) => Math.floor(Date.now() / 1000) + s;

test.describe('global-setup isTokenValid()', () => {
  test('GS-01 returns false when the auth file does not exist', async ({}, testInfo) => {
    expect(isTokenValid(testInfo.outputPath('missing.json'), ORIGIN)).toBe(false);
  });

  test('GS-02 returns true for a token expiring in 1 hour', async ({}, testInfo) => {
    const file = writeState(testInfo, stateWith(jwt({ exp: inSeconds(3600) })));
    expect(isTokenValid(file, ORIGIN)).toBe(true);
  });

  test('GS-03 returns false for an expired token', async ({}, testInfo) => {
    const file = writeState(testInfo, stateWith(jwt({ exp: inSeconds(-60) })));
    expect(isTokenValid(file, ORIGIN)).toBe(false);
  });

  test('GS-04 returns false for a token inside the 15-minute buffer', async ({}, testInfo) => {
    const file = writeState(testInfo, stateWith(jwt({ exp: inSeconds(10 * 60) })));
    expect(isTokenValid(file, ORIGIN)).toBe(false);
  });

  test('GS-05 returns false when the stored origin differs from the target', async ({}, testInfo) => {
    const file = writeState(testInfo, stateWith(jwt({ exp: inSeconds(3600) }), 'https://other.example.com'));
    expect(isTokenValid(file, ORIGIN)).toBe(false);
  });

  test('GS-06 ignores the path when comparing origins', async ({}, testInfo) => {
    const file = writeState(testInfo, stateWith(jwt({ exp: inSeconds(3600) })));
    expect(isTokenValid(file, `${ORIGIN}/admin/dashboard`)).toBe(true);
  });

  test('GS-07 skips the origin check when no target URL is given', async ({}, testInfo) => {
    const file = writeState(testInfo, stateWith(jwt({ exp: inSeconds(3600) }), 'https://any.example.com'));
    expect(isTokenValid(file)).toBe(true);
  });

  test('GS-08 returns false when no token is stored', async ({}, testInfo) => {
    const file = writeState(testInfo, stateWith(null));
    expect(isTokenValid(file, ORIGIN)).toBe(false);
  });

  test('GS-09 returns false when the token has no exp claim', async ({}, testInfo) => {
    const file = writeState(testInfo, stateWith(jwt({ sub: 'user' })));
    expect(isTokenValid(file, ORIGIN)).toBe(false);
  });

  test('GS-10 returns false for a token that is not a JWT', async ({}, testInfo) => {
    const file = writeState(testInfo, stateWith('not-a-jwt'));
    expect(isTokenValid(file, ORIGIN)).toBe(false);
  });

  test('GS-11 returns false (without throwing) for a corrupt auth file', async ({}, testInfo) => {
    const file = writeState(testInfo, '{ this is not json');
    expect(isTokenValid(file, ORIGIN)).toBe(false);
  });

  test('GS-12 returns false for a state file without origins', async ({}, testInfo) => {
    const file = writeState(testInfo, { cookies: [] });
    expect(isTokenValid(file, ORIGIN)).toBe(false);
  });
});
