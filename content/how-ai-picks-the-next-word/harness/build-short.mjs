#!/usr/bin/env node
// Builds content/how-ai-picks-the-next-word-short/script.json (and, with --clips, cuts its two clips out of the RENDERED long video, so the Short shows
// the finished animation). Numbers come from the same evidence as the long video (build-script FACTS); nothing is typed by hand.
// One point: the AI scores its next-word candidates and draws one; a hundred draws of the same first word gave this many different words.
// Run from the repository root after render.mjs:  node content/how-ai-picks-the-next-word/harness/build-short.mjs --clips
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { words } from '../../../scripts/lib/words.mjs';
import { FACTS, script as longScript } from './build-script.mjs';

const SLUG = 'how-ai-picks-the-next-word-short', LONG = 'how-ai-picks-the-next-word';
const { young, nYoung, distinct, draws } = FACTS;

// where b02 (the real scores) and b05 (the draws) sit in the rendered long video, from the aligned timings, the way the renderer lays out beats
const timings = fs.existsSync(`public/${LONG}/timings.json`) ? JSON.parse(fs.readFileSync(`public/${LONG}/timings.json`, 'utf8')) : null;
const shortT = fs.existsSync(`public/${SLUG}/timings.json`) ? JSON.parse(fs.readFileSync(`public/${SLUG}/timings.json`, 'utf8')) : null;
const FPS = 30, BREATH = 8; let f = 0; const start = {};
if (timings) for (const b of longScript.beats) { start[b.id] = f / FPS; f += Math.round(timings[b.id].durationInSeconds * FPS) + BREATH; }
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9-]/g, '');
function wordAt(t, id, w, nth = 1) { const hits = t[id].words.filter((x) => norm(x.word) === w); const hit = hits[nth - 1]; if (!hit) throw new Error(`"${w}" #${nth} not in ${id}`); return hit.start; }
const lead = (id, w) => (shortT ? wordAt(shortT, id, w) : 3);
const CLIPS = timings ? [
  // the bars appear in the long video at b01 "score"; b02 starts with them on screen: the Short's s1 clip begins at b02 and runs through the pick
  { file: 'clip-scores.mp4', from: start.b02 + 0.1, secs: 9 },
  // the grid must start filling when the SHORT says "hundred": start the clip that many seconds before the long video's own "hundred"
  (() => { const l = lead('s2', 'hundred'); return { file: 'clip-draws.mp4', from: start.b05 + wordAt(timings, 'b05', 'hundred') - l, secs: +(l + 8).toFixed(2) }; })(),
] : [];

const beats = [
  { id: 's1', narration: `Once upon a time, there was a... How does an AI pick the next word? It gives a score to every chip it could write next: a word, or a piece of one. These are real scores from a small AI on my laptop: young gets about ${words(Math.round(young.p))} percent.`,
    visual: { type: 'short', headline: 'How AI picks the next word', sub: 'real scores from qwen3.5:4b on a 4 GB laptop (Ollama logprobs)', clip: `${SLUG}/clip-scores.mp4` } },
  { id: 's2', narration: `Then it draws one at random: a higher score is just a better chance. With the extra filters off, I let it draw the first word a hundred times. Young came out ${words(nYoung)} times, and ${words(distinct)} different words came out in total.`,
    visual: { type: 'short', headline: `${draws.length} draws, ${distinct} different words`, sub: 'real draws, temperature 1, filters and penalties off', clip: `${SLUG}/clip-draws.mp4` } },
  { id: 's3', narration: `Score, pick, add, repeat: that is how an AI writes. The full explanation, with the code, is on the channel.`,
    visual: { type: 'short', headline: 'Score. Pick. Repeat.', sub: 'the full explanation with real data and code is on the channel', end: true } },
];
for (const b of beats) if (/[<>]/.test(JSON.stringify(b))) throw new Error(`${b.id} contains < or >`);
export const TITLE = `How Does AI Pick the Next Word? ${draws.length} Real Draws, ${distinct} Different Words #Shorts`;
if (TITLE.length > 100) throw new Error('title too long');
const out = { version: 2, format: 'explainer', endScreenSeconds: 5, slug: SLUG, title: TITLE,
  mood: { palette: 'violet', backdrop: 'grid', type: 'grotesk', transition: 'iris', shapes: 'glass', texture: 'none' }, beats };
if (process.argv[1]?.endsWith('build-short.mjs')) {
  fs.mkdirSync(`content/${SLUG}`, { recursive: true });
  fs.writeFileSync(`content/${SLUG}/script.json`, JSON.stringify(out, null, 2));
  if (process.argv.includes('--clips')) {
    if (!timings) throw new Error('align the long video first');
    fs.mkdirSync(`public/${SLUG}`, { recursive: true });
    for (const c of CLIPS) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', c.from.toFixed(2), '-i', `out/${LONG}.mp4`, '-t', String(c.secs), '-an', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', `public/${SLUG}/${c.file}`]);
  }
  console.log('built', SLUG, '| title', TITLE.length, 'chars | words', beats.reduce((n, b) => n + b.narration.split(/\s+/).length, 0), '| clips', CLIPS.map((c) => `${c.file}@${c.from.toFixed(1)}+${c.secs}`).join(' '));
}
