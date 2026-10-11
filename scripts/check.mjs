#!/usr/bin/env node
/**
 * CHECK — the gates for a script. Run before voicing (source gates) and again after aligning
 * (timing gates). Exit 1 on any failure. Read the reasons; do not lower the bars.
 *
 *   node scripts/check.mjs <slug>
 *
 * Always: title length, cue words that exist in the narration, "something moves at least every
 * 7 s" in explain scenes, a source line on every scene that shows numbers, format length, and the
 * reserved end-screen space. With a content/<slug>/brief.json (strict mode, docs/gates.md): the
 * editorial brief, an answer within 15 s, evidence within 30 s, and evidence ids on proof beats.
 */
import { readFileSync, existsSync } from 'node:fs';
import { PROFILES, validateEditorial } from './lib/editorial.mjs';
import { cueProblems, estimateWords, resolveAt } from './lib/cues.mjs';

const slug = process.argv[2];
if (!slug) { console.error('usage: node scripts/check.mjs <slug>'); process.exit(2); }

const script = JSON.parse(readFileSync(`content/${slug}/script.json`, 'utf8'));
const timings = existsSync(`public/${slug}/timings.json`) ? JSON.parse(readFileSync(`public/${slug}/timings.json`, 'utf8')) : null;
const heroes = readFileSync('src/heroes/index.ts', 'utf8');
const modern = script.version === 2;
const profile = modern ? PROFILES[script.format] : {min:60,max:150,maxBeat:16,maxBeats:14};
const briefFile = `content/${slug}/brief.json`;

const fails = [], warns = [];
const fail = (s) => fails.push(s), warn = (s) => warns.push(s);
if (modern && !profile) fail('format must be "explainer" (45-240 s) or "guide" (90-600 s)');
if (modern && existsSync(briefFile)) {
  const checked=validateEditorial(script,JSON.parse(readFileSync(briefFile,'utf8')),{timings});
  fails.push(...checked.errors);warns.push(...checked.warnings);
} else if (modern) warn(`no ${briefFile}: editorial gates skipped (strict mode, see docs/gates.md)`);

/* title */
if (script.title.length > 100) fail(`title is ${script.title.length} chars (max 100): ${script.title}`);
if (/[<>]/.test(script.title)) fail('title contains < or >');

/* movements */
const ORDER = ['open', 'trap', 'turn', 'proof', 'landing'];
const seq = script.beats.map((b) => b.movement).filter(Boolean);
let last = -1;
for (const m of seq) { const i = ORDER.indexOf(m); if (i < 0) fail(`unknown movement "${m}"`); else if (i < last) fail(`movement "${m}" appears after "${ORDER[last]}" — the five movements run in order`); else last = i; }
for (const m of ORDER) if (!modern && !seq.includes(m)) fail(`no "${m}" beat — legacy scripts use all five movements`);
if (script.beats.length < 3 || script.beats.length > (profile?.maxBeats??90)) fail(`${script.beats.length} beats outside this format's supported range`);

/* open */
const NUMWORD = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|half|third|quarter|sixth|tenth|percent|\d)/i;
if (!modern && script.beats[0].movement !== 'open') fail('the first beat is not the open');
if (!modern && !NUMWORD.test(script.beats[0].narration)) warn('legacy open has no number; a useful answer or demonstration is also valid');

/* turn */
// A turn is an editorial choice, not a required word in every video.

/* register */
const BAD = [/\btrust me\b/i, /\bguaranteed (?:views|viral|speed)\b/i];
for (const b of script.beats) for (const re of BAD) if (re.test(b.narration)) fail(`${b.id}: register — narration matches ${re}`);

/* sources + markup + hero */
const NUMERIC = new Set(['stat', 'compare', 'bars', 'formula', 'hero', 'explain']);

/* EXPLAIN scenes (src/explain/README.md): every cue names a word the narration contains, and something moves at least every 7 s */
const EXPLAIN_SCENES = ['chips', 'code', 'race', 'vocab', 'trials', 'window', 'bars', 'memory', 'nextword'];
for (const b of script.beats) {
  const v = b.visual;
  if (v.type !== 'explain') continue;
  if (!EXPLAIN_SCENES.includes(v.scene)) fail(`${b.id}: unknown explain scene "${v.scene}" (known: ${EXPLAIN_SCENES.join(', ')})`);
  if (!v.cues?.length) { fail(`${b.id}: an explain scene needs cues that point at what the voice says`); continue; }
  const ws = timings?.[b.id]?.words ?? estimateWords(b.narration);
  for (const p of cueProblems(v.cues, ws)) fail(`${b.id}: ${p}`);
  if (timings?.[b.id] && !cueProblems(v.cues, ws).length) {
    const dur = timings[b.id].durationInSeconds;
    const at = [0, ...v.cues.map((c) => resolveAt(c.at, ws, 30) / 30), dur].sort((x, y) => x - y);
    for (let i = 1; i < at.length; i++) if (at[i] - at[i - 1] > 7) fail(`${b.id}: nothing moves for ${(at[i] - at[i - 1]).toFixed(1)} s (${at[i - 1].toFixed(1)} s to ${at[i].toFixed(1)} s): add a cue on a word in between`);
  }
}
let heroCount = 0;
const texts = (v) => Object.values(v).flatMap((x) => typeof x === 'string' ? [x] : Array.isArray(x) ? x.flatMap((y) => typeof y === 'string' ? [y] : typeof y === 'object' && y ? Object.values(y).filter((z) => typeof z === 'string') : []) : typeof x === 'object' && x ? Object.values(x).filter((z) => typeof z === 'string') : []);
/* THE LABEL GATE. A speed on screen (tok/s) must SAY what it is, in the source line the viewer reads:
   "Calculated ceiling — …" or "Measured — …". A calculated number shown as if it were measured is the
   easiest way to mislead with a chart. */
const SPEED = /tok\/s|tokens? (?:a|per) second|tokens?\/s/i;
const LABEL = /^(calculated ceiling|measured)\b/i;
for (const b of script.beats) {
  const v = b.visual;
  if (NUMERIC.has(v.type) && !v.source) fail(`${b.id}: a ${v.type} scene shows numbers and has no source`);
  if (texts(v).filter((t) => t !== v.source).some((t) => SPEED.test(t)) && !LABEL.test(v.source??'')) fail(`${b.id}: shows a speed (tok/s) and its source does not begin "Calculated ceiling —" or "Measured —": "${v.source??'missing'}"`);
  if (v.type === 'hero') { heroCount++; if (!heroes.includes(`'${slug}'`)) fail(`${b.id}: hero beat but src/heroes/index.ts does not register '${slug}'`); }
  for (const t of texts(v)) { const stars = (t.match(/\*/g) ?? []).length, unders = (t.match(/(^|\s)_|_(\s|[.,;:!?]|$)/g) ?? []).length; if (stars % 2) fail(`${b.id}: unbalanced * in "${t}"`); if (unders % 2) fail(`${b.id}: unbalanced _ in "${t}"`); }
}
if (!modern && heroCount > 1) fail(`${heroCount} hero beats in a legacy script`);

/* thumb (optional: without it the Thumb-<slug> still shows the title) */
const th = script.thumb;
if (th && !th.hero?.value) fail('thumb.hero.value is missing');
for (const line of (th?.headline ?? '').split('\n')) if (line.split(/\s+/).filter(Boolean).length > 4) fail(`thumb headline line "${line}" is over four words`);

/* timings */
if (timings) {
  const FPS = 30, BREATH = 8;
  let total = 0; const starts = [];
  for (const b of script.beats) { const t = timings[b.id]; starts.push(total); if (!t) { fail(`${b.id}: no timing`); continue; } if(!Number.isFinite(t.durationInSeconds)||t.durationInSeconds<=0){fail(`${b.id}: invalid duration`);continue;} const d = Math.round(t.durationInSeconds * FPS) + BREATH; total += d; if (t.durationInSeconds < 2) fail(`${b.id}: under 2 s`); if (t.durationInSeconds > (profile?.maxBeat??16)) fail(`${b.id}: beat exceeds format duration; split or show another step`); }
  const secs = (total + 60) / FPS;
  if (secs < (profile?.min??60)) fail(`${secs.toFixed(1)} s — below format minimum`);
  if (secs > (profile?.max??150)) fail(`${secs.toFixed(1)} s — above format maximum`);
  const endSeconds=modern?(script.endScreenSeconds??8):20;
  if(endSeconds<5||endSeconds>20)fail('endScreenSeconds must be 5–20');
  const zone = secs - endSeconds;
  script.beats.forEach((b, i) => {
    const end = (i + 1 < starts.length ? starts[i + 1] : total) / FPS;
    if (end > zone && !['verdict', 'end'].includes(b.visual.type)) fail(`${b.id} (${b.visual.type}) overlaps the reserved ${endSeconds}s end screen`);
  });
  console.log(`  length ${secs.toFixed(1)} s · ${script.beats.length} beats`);
} else {
  warn('no timings yet — length and endzone gates skipped; run again after align');
}

for (const w of warns) console.log(`  ~ ${w}`);
for (const f of fails) console.log(`  ✗ ${f}`);
if (fails.length) { console.log(`\n${fails.length} gate(s) failed for ${slug}`); process.exit(1); }
console.log(`\n✓ ${slug} passes ${timings ? 'all' : 'the source'} gates`);

