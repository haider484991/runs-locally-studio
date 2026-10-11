#!/usr/bin/env node
/**
 * SRT from the measured word timings — the caption track YouTube indexes.
 *
 *   node scripts/srt.mjs <slug>   →  out/<slug>.srt
 *
 * The clock is the same accumulation Video.tsx's plan() does: beat durations plus BREATH.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const slug = process.argv[2];
if (!slug) { console.error('usage: node scripts/srt.mjs <slug>'); process.exit(2); }

const FPS = 30, BREATH = 8 / FPS, MAX_CHARS = 42, MAX_SECONDS = 5;
const stamp = (t) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0'), m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0'), s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${s},${String(ms % 1000).padStart(3, '0')}`;
};

const script = JSON.parse(await readFile(join('content', slug, 'script.json'), 'utf8'));
const timings = JSON.parse(await readFile(join('public', slug, 'timings.json'), 'utf8'));

const cues = [];
let clock = 0;
for (const beat of script.beats) {
  const t = timings[beat.id];
  if (!t) continue;
  let buf = [], start = null;
  const flush = (end) => { if (buf.length) cues.push({ start: clock + start, end: clock + end, text: buf.join(' ') }); buf = []; start = null; };
  for (const w of t.words) {
    if (start === null) start = w.start;
    const candidate = [...buf, w.word].join(' ');
    if (buf.length && (candidate.length > MAX_CHARS || w.end - start > MAX_SECONDS)) { flush(w.start); start = w.start; }
    buf.push(w.word);
    if (/[.!?]$/.test(w.word)) flush(w.end);
  }
  flush(t.words.at(-1)?.end ?? t.durationInSeconds);
  clock += Math.round(t.durationInSeconds * FPS) / FPS + BREATH;
}
const srt = cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n');
await mkdir('out', { recursive: true });
await writeFile(join('out', `${slug}.srt`), srt, 'utf8');
console.log(`out/${slug}.srt — ${cues.length} cues, ${clock.toFixed(1)}s`);
