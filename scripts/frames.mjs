#!/usr/bin/env node
/**
 * FRAMES — one bundle, many stills. Look at them; a still that renders is not a still that explains.
 *
 *   node scripts/frames.mjs <slug> <frame,frame,...> [outDir]
 *   node scripts/frames.mjs <slug> --beats            (one still 70 % into every beat)
 *   node scripts/frames.mjs <slug> --cues [b03 b05]   (explain beats: a still 10 frames after each of up to 6 cues per beat, i.e. the pointer, spotlight and chips as the viewer sees them)
 */
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { estimateWords, resolveAt } from './lib/cues.mjs';
import { chromiumOptions } from './lib/render-options.mjs';

const [slug, list, ...rest] = process.argv.slice(2);
const only = rest.filter((a) => /^b\d+$/.test(a));                       // beat ids after --cues, e.g.  --cues b03 b05
const outDir = rest.find((a) => !/^b\d+$/.test(a)) ?? 'out/frames';
if (!slug || !list) { console.error('usage: node scripts/frames.mjs <slug> <frame,...>|--beats [outDir]'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
const comp = await selectComposition({ serveUrl, id: `Video-${slug}` });
console.log(`${comp.id}: ${comp.durationInFrames} frames`);

let frames;
if (list === '--beats') {
  const script = JSON.parse(fs.readFileSync(`public/${slug}/script.json`, 'utf8'));
  const timings = fs.existsSync(`public/${slug}/timings.json`) ? JSON.parse(fs.readFileSync(`public/${slug}/timings.json`, 'utf8')) : null;
  let start = 0; frames = [];
  for (const b of script.beats) {
    const secs = timings?.[b.id]?.durationInSeconds ?? b.narration.split(/\s+/).length / 2.7;
    const dur = Math.round(secs * comp.fps) + 8;
    frames.push(Math.round(start + dur * 0.7));
    start += dur;
  }
} else if (list === '--cues') {
  const script = JSON.parse(fs.readFileSync(`public/${slug}/script.json`, 'utf8'));
  const timings = fs.existsSync(`public/${slug}/timings.json`) ? JSON.parse(fs.readFileSync(`public/${slug}/timings.json`, 'utf8')) : null;
  let start = 0; frames = [];
  for (const b of script.beats) {
    const secs = timings?.[b.id]?.durationInSeconds ?? b.narration.split(/\s+/).length / 2.7;
    const dur = Math.round(secs * comp.fps) + 8;
    if (b.visual.type === 'explain' && (!only.length || only.includes(b.id))) {
      const ws = timings?.[b.id]?.words ?? estimateWords(b.narration);
      const at = [...new Set((b.visual.cues ?? []).map((c) => resolveAt(c.at, ws, comp.fps)))].sort((x, y) => x - y);
      const pick = at.length <= 6 ? at : [0, 1, 2, 3, 4, 5].map((k) => at[Math.round((k * (at.length - 1)) / 5)]);
      for (const f of pick) frames.push(Math.min(start + dur - 4, start + f + 10));
      frames.push(Math.round(start + dur * 0.92));
    }
    start += dur;
  }
  frames = [...new Set(frames)];
} else {
  frames = list.split(',').map(Number).filter(Number.isFinite);
}
for (const f of frames) {
  const out = path.join(outDir, `f${f}.png`);
  await renderStill({ composition: comp, serveUrl, frame: Math.min(f, comp.durationInFrames - 1), output: out, chromiumOptions });
  console.log('  ' + out);
}
