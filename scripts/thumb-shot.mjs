#!/usr/bin/env node
/**
 * THUMB-SHOT - turns a thumbnail concept written as HTML into a 1280x720 image with headless Chrome. Write thumbnails as HTML
 * (real objects, 2-4 words, a visible contrast), then shoot them with one command.
 *
 *   node scripts/thumb-shot.mjs <concept.html> <out.jpg|out.png> [--size 1280x720]
 *
 * - Chrome needs its OWN --user-data-dir or the screenshot silently fails to write: this uses <tmp>/lumen-chrome-thumb.
 * - A .jpg output is converted with ffmpeg and kept under 2 MB (YouTube's limit) by lowering quality if needed.
 * - Fonts linked from Google Fonts need the network; --virtual-time-budget gives them 8 s to arrive.
 * - render.mjs (without --video-only/--thumb-only choice) overwrites out/<slug>-thumb.jpg with the renderer's own thumbnail: render with
 *   --video-only, or copy the chosen concept back to out/<slug>-thumb.jpg afterwards.
 * Always LOOK at the result at full size and at 320x180.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const [html, out] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!html || !out) { console.error('usage: node scripts/thumb-shot.mjs <concept.html> <out.jpg|out.png> [--size 1280x720]'); process.exit(2); }
const si = process.argv.indexOf('--size');
const size = si > -1 ? process.argv[si + 1] : '1280,720';
const CHROME = [process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean).find(existsSync);
if (!CHROME) { console.error('Chrome not found: install Google Chrome or set CHROME_PATH'); process.exit(2); }
if (!existsSync(html)) { console.error(`missing ${html}`); process.exit(2); }
const profile = join(tmpdir(), 'lumen-chrome-thumb');
mkdirSync(profile, { recursive: true });
const png = extname(out).toLowerCase() === '.png' ? resolve(out) : join(tmpdir(), `lumen-thumb-${Date.now()}.png`);
rmSync(png, { force: true });
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${size.replace('x', ',')}`, `--user-data-dir=${profile}`, '--virtual-time-budget=8000', `--screenshot=${png}`, pathToFileURL(resolve(html)).href], { stdio: 'ignore', timeout: 120000 });
if (!existsSync(png)) { console.error('Chrome did not write the screenshot (is another Chrome using the profile folder?)'); process.exit(1); }
if (png !== resolve(out)) {
  for (const q of [2, 4, 6, 9, 14]) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', String(q), resolve(out)]);
    if (statSync(resolve(out)).size < 1.9 * 1024 * 1024) break;
  }
  rmSync(png, { force: true });
}
console.log(`${out}  ${(statSync(resolve(out)).size / 1024).toFixed(0)} KB`);
