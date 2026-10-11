#!/usr/bin/env node
/**
 * MAKE — the whole pipeline for one video, in order, stopping at the first failure:
 *   stage → check (source gates) → voice (Kokoro) → align (whisper.cpp) → check (timing gates) → asr-check → render → srt → contact sheets
 *
 *   node scripts/make.mjs <slug>                 everything
 *   node scripts/make.mjs <slug> --from render   skip the steps before "render" (stage always runs)
 *   node scripts/make.mjs <slug> --voice am_michael --speed 1.05
 *
 * A Short (a script with `short` visuals) uses check-short.mjs and render-short.mjs instead. Python is `py -3` on Windows and
 * `python3` elsewhere; set PYTHON to use another interpreter (a virtualenv, for example).
 * Then LOOK: open out/review-sheets-<slug>/*.jpg and watch out/<slug>.mp4. A pipeline that finishes is not a video that explains.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const slug = args[0];
if (!slug || slug.startsWith('-')) { console.error('usage: node scripts/make.mjs <slug> [--from stage|check|tts|align|asr|render|srt|sheets] [--voice NAME] [--speed X]'); process.exit(2); }
if (!existsSync(`content/${slug}/script.json`)) { console.error(`no content/${slug}/script.json (create one with: node scripts/new.mjs ${slug})`); process.exit(2); }
const opt = (name) => { const i = args.indexOf(name); return i > -1 ? args[i + 1] : undefined; };

const script = JSON.parse(readFileSync(`content/${slug}/script.json`, 'utf8'));
const isShort = script.beats.some((b) => b.visual?.type === 'short');
const PY = process.env.PYTHON ? [process.env.PYTHON] : process.platform === 'win32' ? ['py', '-3'] : ['python3'];
const voiceArgs = [...(opt('--voice') ? ['--voice', opt('--voice')] : []), ...(opt('--speed') ? ['--speed', opt('--speed')] : [])];

const node = (file, ...rest) => [process.execPath, [file, slug, ...rest]];
const steps = [
  ['stage', node('scripts/stage.mjs')],
  ['check', isShort ? node('scripts/check-short.mjs') : node('scripts/check.mjs')],
  ['tts', [PY[0], [...PY.slice(1), 'scripts/tts.py', slug, ...voiceArgs]]],
  ['align', node('scripts/align.mjs')],
  ['check', isShort ? node('scripts/check-short.mjs') : node('scripts/check.mjs')],
  ['asr', node('scripts/asr-check.mjs')],
  ['render', isShort ? node('scripts/render-short.mjs') : node('scripts/render.mjs')],
  ['srt', node('scripts/srt.mjs')],
  ...(isShort ? [] : [['sheets', node('scripts/sheets.mjs')]]),
];

const from = opt('--from') ?? 'stage';
const start = steps.findIndex(([name]) => name === from);
if (start < 0) { console.error(`unknown step "${from}" (steps: ${[...new Set(steps.map(([n]) => n))].join(', ')})`); process.exit(2); }

const t0 = Date.now();
for (const [i, [name, [cmd, cmdArgs]]] of steps.entries()) {
  if (i < start && name !== 'stage') continue;
  console.log(`\n── ${name} ─ ${[cmd, ...cmdArgs].join(' ')}`);
  try { execFileSync(cmd, cmdArgs, { stdio: 'inherit' }); }
  catch (e) { console.error(`\n✗ ${name} failed (exit ${e.status ?? '?'}). Fix it and resume with: node scripts/make.mjs ${slug} --from ${name}`); process.exit(1); }
}
console.log(`\n✓ ${slug} made in ${((Date.now() - t0) / 60000).toFixed(1)} min: out/${slug}.mp4, out/${slug}.srt${isShort ? '' : `, out/${slug}-thumb.jpg, out/review-sheets-${slug}/`}`);
console.log('Now look at it: watch the video and open every contact sheet before you publish.');
