// @ts-check
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Runs the Playwright suite. Browser video/screenshots/traces + archiving are handled by
 * playwright.config.js and utils/evidence-reporter.js, so this script is optional sugar.
 *
 * OPTIONAL full-desktop recording (separate from Playwright's per-test browser videos):
 *   set DESKTOP_RECORD=true   (requires ffmpeg on PATH; Windows uses gdigrab)
 * The desktop recording is saved to QA-Automation-Evidence/desktop-recordings/<timestamp>.mp4
 * and never interferes with Playwright's own recording.
 *
 * Usage: node scripts/run-and-archive.js [any playwright test args]
 */

const args = process.argv.slice(2);
const root = process.cwd();
let ffmpeg = null;

if (process.env.DESKTOP_RECORD === 'true') {
  const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { shell: true, stdio: 'ignore' }).status === 0;
  if (!hasFfmpeg) {
    console.warn('\x1b[33m[Desktop] DESKTOP_RECORD=true but ffmpeg not found on PATH - skipping desktop recording.\x1b[0m');
  } else if (process.platform !== 'win32') {
    console.warn('\x1b[33m[Desktop] Desktop recording helper currently supports Windows (gdigrab) only.\x1b[0m');
  } else {
    const dir = path.join(root, 'QA-Automation-Evidence', 'desktop-recordings');
    fs.mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const out = path.join(dir, `desktop_${ts}.mp4`);
    ffmpeg = spawn('ffmpeg', ['-y', '-f', 'gdigrab', '-framerate', '10', '-i', 'desktop',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'ignore', 'ignore'] });
    console.log(`[Desktop] Full-desktop recording started -> ${out}`);
    console.log('\x1b[33m[Desktop] WARNING: desktop recordings capture EVERYTHING on screen (other apps, notifications). Handle as sensitive.\x1b[0m');
  }
}

const stopDesktop = () => new Promise(resolve => {
  if (!ffmpeg) return resolve(undefined);
  ffmpeg.on('close', () => resolve(undefined));
  try { ffmpeg.stdin.write('q'); } catch (_) { ffmpeg.kill(); }
  setTimeout(() => { try { ffmpeg.kill(); } catch (_) {} resolve(undefined); }, 10000);
});

// shell:true is required on Windows with Node >= 18.20/20.12 to launch npx.cmd
const child = spawn('npx', ['playwright', 'test', ...args], { cwd: root, env: process.env, stdio: 'inherit', shell: true });

child.on('close', async (code) => {
  await stopDesktop();
  process.exit(code ?? 1); // preserve Playwright's real exit code (failures stay failures)
});
child.on('error', async (err) => {
  console.error('Failed to start Playwright:', err);
  await stopDesktop();
  process.exit(1);
});
