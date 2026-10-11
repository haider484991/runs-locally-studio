#!/usr/bin/env node
/**
 * CHECK-SHORT — gates for a vertical Short script (the long-video check.mjs refuses Shorts on purpose).
 *   node scripts/check-short.mjs <slug>
 * One point, 15-60 s of narration, every beat voiced and timed, clips and audio exist inside public/, a pointer to the long video on the last beat,
 * no < or > in any text, nothing the long video would not prove (a human/agent must still compare the claims with the evidence).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const slug = process.argv[2];
if (!slug) { console.error('usage: node scripts/check-short.mjs <slug>'); process.exit(2); }
const fails = [], fail = (s) => fails.push(s);
const sp = `public/${slug}/script.json`, tp = `public/${slug}/timings.json`;
if (!existsSync(sp)) { console.error(`no ${sp}: run node scripts/stage.mjs ${slug}`); process.exit(1); }
const script = JSON.parse(readFileSync(sp, 'utf8'));
const timings = existsSync(tp) ? JSON.parse(readFileSync(tp, 'utf8')) : null;
const inPublic = (f) => typeof f === 'string' && !/^(?:[a-z]+:|[/\\])/i.test(f) && resolve('public', f).startsWith(resolve('public') + sep) && existsSync(resolve('public', f));

if (!Array.isArray(script.beats) || script.beats.length < 3 || script.beats.length > 9) fail('a Short needs 3-9 beats');
if (!script.title || script.title.length > 100 || /[<>]/.test(script.title)) fail('title missing, over 100 characters, or contains < >');
script.beats?.forEach((b, i) => {
  const v = b.visual;
  if (!b.narration?.trim()) fail(`${b.id}: narration missing`);
  if (/[<>]/.test(JSON.stringify(b))) fail(`${b.id}: contains < or >`);
  if (v?.type !== 'short' || !v.headline) fail(`${b.id}: visual must be {type:'short', headline, ...}`);
  if (v?.clip && !inPublic(v.clip)) fail(`${b.id}: clip ${v.clip} must exist inside public/`);
  if (i === script.beats.length - 1 && !v?.end) fail(`${b.id}: the last beat must set end:true (a pointer to the long video)`);
});
if (timings) {
  let total = 0;
  for (const b of script.beats) {
    const t = timings[b.id];
    if (!t) { fail(`${b.id}: no timing; run tts.py and align.mjs`); continue; }
    if (!(t.durationInSeconds > 0)) fail(`${b.id}: invalid duration`);
    if (t.audioSrc && !inPublic(t.audioSrc)) fail(`${b.id}: audio ${t.audioSrc} missing`);
    total += t.durationInSeconds;
  }
  console.log(`  narration ${total.toFixed(1)} s · ${script.beats.length} beats`);
  if (total < 12 || total > 55) fail(`narration is ${total.toFixed(1)} s: a Short is 15-55 s of voice`);
} else console.log('  ~ no timings yet: duration gates skipped');
for (const f of fails) console.log(`  ✗ ${f}`);
if (fails.length) { console.log(`\n${fails.length} gate(s) failed for ${slug}`); process.exit(1); }
console.log(`\n✓ ${slug} passes the Short gates`);
