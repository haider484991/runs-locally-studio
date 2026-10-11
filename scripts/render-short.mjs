#!/usr/bin/env node
/**
 * RENDER-SHORT — the vertical 1080x1920 Short (src/Short.tsx).  node scripts/render-short.mjs <slug>
 * Needs public/<slug>/script.json (stage.mjs), timings.json (tts.py + align.mjs) and the clips named in the script.
 * Output: out/<slug>.mp4. Runs check-short.mjs first. Removes its own %TEMP% bundle when it ends (same as render.mjs).
 */
import path from 'node:path';
import { concurrency, chromiumOptions } from './lib/render-options.mjs';
import fs from 'node:fs';
import os from 'node:os';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';

const slug = process.argv[2];
if (!slug) { console.error('usage: node scripts/render-short.mjs <slug>'); process.exit(2); }
execFileSync(process.execPath, ['scripts/check-short.mjs', slug], { stdio: 'inherit' });
fs.mkdirSync('out', { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
const removeBundle = () => {
  try {
    const dir = path.resolve(serveUrl);
    if (path.dirname(dir).toLowerCase() === path.resolve(os.tmpdir()).toLowerCase() && path.basename(dir).startsWith('remotion-webpack-bundle-')) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
  } catch (e) { console.warn(`temp bundle not removed (${e.message})`); }
};
try {
  const comp = await selectComposition({ serveUrl, id: `Short-${slug}` });
  console.log(`${comp.id}: ${comp.width}x${comp.height}, ${comp.durationInFrames} frames = ${(comp.durationInFrames / comp.fps).toFixed(1)} s`);
  let last = -1;
  await renderMedia({
    composition: comp, serveUrl, codec: 'h264', crf: 18, outputLocation: `out/${slug}.mp4`, imageFormat: 'jpeg',
    concurrency, chromiumOptions,
    onProgress: ({ progress }) => { const pct = Math.floor(progress * 20) * 5; if (pct !== last) { last = pct; process.stdout.write(`  ${pct}%\r`); } },
  });
  console.log(`\n+ out/${slug}.mp4`);
} finally { removeBundle(); }
