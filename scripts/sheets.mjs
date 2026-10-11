#!/usr/bin/env node
/**
 * SHEETS - contact sheets of the RENDERED video, so every scene is looked at after the render (frames.mjs --beats shows stills
 * before the render; this shows what actually reached the file). Three frames per beat (20 %, 55 %, 92 % of the beat), two beats
 * per sheet, each frame labelled with its beat id and time. Open the JPEGs: exit code 0 says nothing about whether a frame explains anything.
 *
 *   node scripts/sheets.mjs <slug> [b03 b06 ...]        -> out/review-sheets-<slug>/<b01-b02>.jpg
 *
 * Beat start times use the same plan as src/Video.tsx and the chapter stamps: each beat is round(seconds * 30) + 8 frames.
 * (Keep FPS/BREATH in step with build-publishing.mjs if Video.tsx ever changes.) Needs out/<slug>.mp4, content/<slug>/script.json
 * and public/<slug>/timings.json, i.e. run it before cleanup-uploaded.mjs removes them.
 */
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const slug = process.argv[2];
if (!slug || slug.startsWith('-')) { console.error('usage: node scripts/sheets.mjs <slug> [b03 b06 ...]'); process.exit(2); }
const only = process.argv.slice(3).filter((a) => /^b\d+$/.test(a));
const video = `out/${slug}.mp4`;
for (const p of [video, `content/${slug}/script.json`, `public/${slug}/timings.json`]) if (!existsSync(p)) { console.error(`missing ${p}`); process.exit(2); }
const script = JSON.parse(readFileSync(`content/${slug}/script.json`, 'utf8'));
const timings = JSON.parse(readFileSync(`public/${slug}/timings.json`, 'utf8'));
const FPS = 30, BREATH = 8;
// ffmpeg's drawtext needs an explicit font file on Windows; elsewhere fontconfig finds a default font.
const FONTFILE = process.platform === 'win32' ? "fontfile='C\\:/Windows/Fonts/consolab.ttf':" : '';
const OUT = `out/review-sheets-${slug}`;
mkdirSync(OUT, { recursive: true });
let frames = 0; const starts = {}, lens = {};
for (const b of script.beats) { const f = Math.round(timings[b.id].durationInSeconds * FPS) + BREATH; starts[b.id] = frames / FPS; lens[b.id] = f / FPS; frames += f; }
const ids = script.beats.map((b) => b.id).filter((id) => !only.length || only.includes(id));
const at = [0.2, 0.55, 0.92];
for (let i = 0; i < ids.length; i += 2) {
  const pair = ids.slice(i, i + 2);
  const inputs = [], labels = [];
  for (const id of pair) for (const f of at) { const t = starts[id] + lens[id] * f; inputs.push(['-ss', t.toFixed(2), '-i', video]); labels.push(`${id}@${t.toFixed(1)}`); }
  const n = inputs.length;
  const filt = Array.from({ length: n }, (_, k) => `[${k}:v]scale=640:360,drawtext=${FONTFILE}text='${labels[k]}':x=8:y=8:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.7[v${k}]`).join(';')
    + ';' + Array.from({ length: n }, (_, k) => `[v${k}]`).join('') + `xstack=inputs=${n}:layout=${Array.from({ length: n }, (_, k) => `${(k % 3) * 640}_${Math.floor(k / 3) * 360}`).join('|')}[o]`;
  const file = `${OUT}/${pair.join('-')}.jpg`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs.flat(), '-filter_complex', filt, '-map', '[o]', '-frames:v', '1', '-q:v', '3', file]);
  console.log(file);
}
