#!/usr/bin/env node
/**
 * ASR-CHECK - listens to every voiced beat with whisper.cpp (small.en) and compares what it heard with the script, word by
 * word, so a dropped or garbled sentence cannot ship unnoticed (Kokoro once dropped the last sentence of a beat, and the
 * forced alignment alone does not notice: it anchors whatever words it finds). Numbers are compared as "a number is here"
 * (whisper writes digits, the script spells them out); words the PRONOUNCE map in tts.py respells for the voice (Qwen -> Kwen,
 * Ollama -> Ohlama, MCP -> M C P) match by spelling distance. "MCP" in the script is joined with whisper's "M C P" either way.
 *
 *   node scripts/asr-check.mjs <slug> [--reuse] [b03 b06 ...]      (default: every beat; --reuse keeps a transcript newer than its audio)
 *
 * Run it after EVERY re-voice (tts.py -> align.mjs -> this). Writes out/asr/<slug>/<beat>.txt (what whisper heard) and prints every
 * stretch of the script that was not heard and every stretch heard that is not in the script. Exit 1 if any beat has 3+ script words
 * missing. A machine listen proves the words are there, not that they sound right: a human listen is still a separate step.
 * Expected noise: whisper writes "Ulamah" for the respelled Ollama, "4GB" for "four gigabytes", and picks "right/write", "wait/weight".
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findWhisper } from './lib/whisper.mjs';

const slug = process.argv[2];
if (!slug || slug.startsWith('-')) { console.error('usage: node scripts/asr-check.mjs <slug> [--reuse] [b03 b06 ...]'); process.exit(2); }
const REUSE = process.argv.includes('--reuse');
const only = process.argv.slice(3).filter((a) => /^b\d+$/.test(a));
const script = JSON.parse(readFileSync(`content/${slug}/script.json`, 'utf8'));
const WH = findWhisper();
if (!WH) { console.error('whisper.cpp not found: run scripts/align.mjs once (it installs whisper.cpp into ./.whisper) or set WHISPER_DIR'); process.exit(2); }
const OUT = `out/asr/${slug}`;
mkdirSync(OUT, { recursive: true });

const NUMW = new Set('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand point million and'.split(' '));
const toks = (t) => t.toLowerCase().replace(/\$/g, ' ').replace(/[^a-z0-9.,'\s-]/g, ' ').split(/[\s-]+/).map((w) => w.replace(/^[.,']+|[.,']+$/g, '')).filter(Boolean);
// collapse any run of number words or digit tokens (either side) into one '#'; "and" only counts inside a number ("a hundred and fifty")
const isNumTok = (w) => (NUMW.has(w) && w !== 'and') || /\d/.test(w);
const isLetter = (w) => w.length === 1 && /[a-z]/.test(w) && w !== 'a' && w !== 'i';
const collapse = (ws) => {
  const out = [];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i];
    const glue = w === 'and' && i > 0 && i + 1 < ws.length && isNumTok(ws[i - 1]) && isNumTok(ws[i + 1]);
    if (isNumTok(w) || glue) { if (out[out.length - 1] !== '#') out.push('#'); } else out.push(w.replace(/,/g, ''));
  }
  // "m c p" -> "mcp" (the voice spells it out; the script and whisper write MCP)
  const joined = [];
  for (let i = 0; i < out.length; i++) {
    if (isLetter(out[i])) { let j = i, run = ''; while (j < out.length && isLetter(out[j])) run += out[j++]; joined.push(run); i = j - 1; } else joined.push(out[i]);
  }
  // "a hundred" is heard as "100": drop the stray "a" before a number
  return joined.filter((w, i) => !(w === 'a' && joined[i + 1] === '#'));
};
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
// spellings whisper uses for what the voice said: units, and two homophones it picks between
const SYN = { gb: 'gigabytes', gigabyte: 'gigabytes', mb: 'megabytes', ms: 'milliseconds', write: 'right', weight: 'wait' };
const canon = (w) => SYN[w] ?? w;
const same = (a, b) => a === b || canon(a) === canon(b) || (a.length > 3 && b.length > 3 && lev(a, b) <= 2);
// LCS alignment -> list of ops
const align = (A, B) => {
  const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = same(A[i], B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n && j < m) { if (same(A[i], B[j])) { ops.push(['=', A[i]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) ops.push(['-', A[i++]]); else ops.push(['+', B[j++]]); }
  while (i < n) ops.push(['-', A[i++]]); while (j < m) ops.push(['+', B[j++]]);
  return ops;
};

let worst = 0, bad = 0;
for (const b of script.beats) {
  if (only.length && !only.includes(b.id)) continue;
  const wav = `public/${slug}/audio/${b.id}.wav`, w16 = `${OUT}/${b.id}.16k.wav`, prefix = `${OUT}/${b.id}`;
  if (!existsSync(wav)) { console.error(`${b.id}: ${wav} is missing - run tts.py first`); process.exit(2); }
  if (!(REUSE && existsSync(`${prefix}.txt`) && statSync(`${prefix}.txt`).mtimeMs > statSync(wav).mtimeMs)) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', w16]);
    try { execFileSync(WH.bin, ['-m', WH.model, '-f', w16, '-otxt', '-of', prefix, '-np'], { stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { writeFileSync(`${prefix}.log`, String(e.stdout || '') + String(e.stderr || '')); console.error(`${b.id}: whisper failed`); process.exit(2); }
  }
  const heard = readFileSync(`${prefix}.txt`, 'utf8').replace(/\s+/g, ' ').trim();
  const ops = align(collapse(toks(b.narration)), collapse(toks(heard)));
  const missing = [], extra = []; let curM = [], curE = [];
  const flush = () => { if (curM.length) missing.push(curM.join(' ')); if (curE.length) extra.push(curE.join(' ')); curM = []; curE = []; };
  for (const [op, w] of ops) { if (op === '=') flush(); else if (op === '-') curM.push(w); else curE.push(w); }
  flush();
  const longestMissing = Math.max(0, ...missing.map((s) => s.split(' ').length));
  const total = ops.filter(([o]) => o !== '+').length, hit = ops.filter(([o]) => o === '=').length;
  worst = Math.max(worst, longestMissing); if (longestMissing >= 3) bad++;
  console.log(`${b.id}  heard ${hit}/${total} script words${missing.length ? `  NOT HEARD: ${missing.map((s) => `"${s}"`).join(' | ')}` : ''}${extra.length ? `  EXTRA: ${extra.map((s) => `"${s}"`).join(' | ')}` : ''}`);
}
console.log(bad ? `\n${bad} beat(s) have 3+ script words missing from the audio (longest gap ${worst})` : `\nall checked beats: no stretch of 3+ script words missing (longest gap ${worst})`);
process.exit(bad ? 1 : 0);
