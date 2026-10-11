#!/usr/bin/env node
/**
 * SHORT-FRAMES — stills of a vertical Short (the long-video frames.mjs only knows the 16:9 compositions). Look at them at 390 px wide before rendering.
 *   node scripts/short-frames.mjs <slug> <frame,frame,...> [outDir]       (frames of the whole Short, 30 fps)
 *   node scripts/short-frames.mjs <slug> --beats [outDir]                 (one still 75 % into every beat)
 */
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const [slug, list, outArg] = process.argv.slice(2);
if (!slug || !list) { console.error('usage: node scripts/short-frames.mjs <slug> <frame,...>|--beats [outDir]'); process.exit(2); }
const outDir = outArg ?? 'out/short-frames';
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
const comp = await selectComposition({ serveUrl, id: `Short-${slug}` });
console.log(`${comp.id}: ${comp.width}x${comp.height}, ${comp.durationInFrames} frames`);
let frames;
if (list === '--beats') {
  const script = JSON.parse(fs.readFileSync(`public/${slug}/script.json`, 'utf8'));
  const timings = JSON.parse(fs.readFileSync(`public/${slug}/timings.json`, 'utf8'));
  let start = 0; frames = [];
  for (const b of script.beats) { const d = Math.round(timings[b.id].durationInSeconds * comp.fps) + 8; frames.push(Math.round(start + d * 0.75)); start += d; }
} else frames = list.split(',').map(Number);
for (const f of frames) {
  const out = path.join(outDir, `f${f}.png`);
  await renderStill({ composition: comp, serveUrl, frame: Math.min(f, comp.durationInFrames - 1), output: out, imageFormat: 'png' });
  console.log(' ', out);
}
