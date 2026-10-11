#!/usr/bin/env node
/**
 * NEW — start a video: writes content/<slug>/script.json with three beats you can edit, and stages it.
 *
 *   node scripts/new.mjs my-first-video
 *
 * Then: npm run dev (preview, silent, estimated timing) → edit the script → node scripts/make.mjs my-first-video
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) { console.error('usage: node scripts/new.mjs <slug>   (lowercase letters, digits and dashes)'); process.exit(2); }
const file = `content/${slug}/script.json`;
if (existsSync(file)) { console.error(`${file} already exists`); process.exit(1); }

const script = {
  version: 2,
  format: 'explainer',
  endScreenSeconds: 6,
  slug,
  title: 'My First Explainer',
  mood: { palette: 'violet', backdrop: 'grid', type: 'grotesk', transition: 'iris', shapes: 'glass', texture: 'none' },
  beats: [
    { id: 'b01', narration: 'This is my first explainer. Every line here is spoken by a free voice that runs on my own computer, and the pictures follow the words.',
      visual: { type: 'title', kicker: 'My first explainer', headline: 'One idea, explained in pictures', sub: 'edit content/' + slug + '/script.json to change me' } },
    { id: 'b02', narration: 'A video is a list of beats. Each beat has the words the voice says, and a visual: a title, a list, a callout, or a lesson scene that points at what is being said.',
      visual: { type: 'list', headline: 'What a beat is made of', items: ['an id, like b02', 'the narration: what the voice says', 'a visual: what the viewer sees'] } },
    { id: 'b03', narration: 'When the words are right, one command voices them, measures every word, and renders the video. Then watch it before anyone else does.',
      visual: { type: 'callout', text: 'Write it. Make it. Watch it.', sub: 'node scripts/make.mjs ' + slug } },
    { id: 'b04', narration: 'That is the whole loop. Now write your own.',
      visual: { type: 'end', series: 'My channel', line: 'Next: your own idea' } },
  ],
};
mkdirSync(`content/${slug}`, { recursive: true });
writeFileSync(file, JSON.stringify(script, null, 2) + '\n');
execFileSync(process.execPath, ['scripts/stage.mjs', slug], { stdio: 'inherit' });
console.log(`\nwrote ${file}\nPreview: npm run dev   (pick Video-${slug}; silent, with estimated timing until you voice it)\nMake it: node scripts/make.mjs ${slug}`);
