#!/usr/bin/env node
/**
 * RENDER — bundle once, render the video and the thumbnail.
 *
 *   node scripts/render.mjs <slug> [--thumb-only] [--video-only]
 *
 * Output: out/<slug>.mp4 and out/<slug>-thumb.jpg
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import { renderPreflight } from './lib/preflight.mjs';
import { concurrency, chromiumOptions } from './lib/render-options.mjs';

const slug = process.argv[2];
if (!slug) { console.error('usage: node scripts/render.mjs <slug>'); process.exit(2); }
const thumbOnly = process.argv.includes('--thumb-only');
const videoOnly = process.argv.includes('--video-only');
renderPreflight(process.cwd(),slug,{thumbnail:thumbOnly});
execFileSync(process.execPath,['scripts/check.mjs',slug],{stdio:'inherit'});
fs.mkdirSync('out', { recursive: true });

const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public') });
console.log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

/** Remotion leaves its bundle (a full copy of public/, easily hundreds of MB) in the temp folder after every render and never
 *  removes it. Remove ours when the render ends, successful or not (only a remotion-webpack-bundle-* folder directly inside the
 *  temp dir is ever removed). */
const removeBundle = () => {
  try {
    const dir = path.resolve(serveUrl);
    if (path.dirname(dir).toLowerCase() === path.resolve(os.tmpdir()).toLowerCase() && path.basename(dir).startsWith('remotion-webpack-bundle-')) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
    }
  } catch (e) { console.warn(`temp bundle not removed (${e.message}); delete ${serveUrl} by hand`); }
};

try {
  if (!thumbOnly) {
    const comp = await selectComposition({ serveUrl, id: `Video-${slug}` });
    console.log(`${comp.id}: ${comp.durationInFrames} frames @ ${comp.fps} fps = ${(comp.durationInFrames / comp.fps).toFixed(1)}s`);
    let last = -1;
    await renderMedia({
      composition: comp, serveUrl, codec: 'h264', crf: 18, outputLocation: `out/${slug}.mp4`,
      imageFormat: 'jpeg', concurrency, chromiumOptions,
      onProgress: ({ progress }) => { const pct = Math.floor(progress * 20) * 5; if (pct !== last) { last = pct; process.stdout.write(`  ${pct}%\r`); } },
    });
    console.log(`\n+ out/${slug}.mp4`);
  }
  if (!videoOnly) {
    const comp = await selectComposition({ serveUrl, id: `Thumb-${slug}` });
    await renderStill({ composition: comp, serveUrl, output: `out/${slug}-thumb.jpg`, imageFormat: 'jpeg', jpegQuality: 92, chromiumOptions });
    console.log(`+ out/${slug}-thumb.jpg`);
  }
} finally {
  removeBundle();
}
