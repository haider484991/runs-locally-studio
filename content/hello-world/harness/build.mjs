#!/usr/bin/env node
// Builds content/hello-world/script.json. The code beat REPLAYS a real run of evidence/count-words.mjs: the lines on screen are
// read from the file and the terminal output is what the run printed, so the video cannot show code that never ran.
// Every number in the narration is built from that output (scripts/lib/words.mjs spells it out), never typed by hand.
//   node content/hello-world/harness/build.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { words } from '../../../scripts/lib/words.mjs';

const file = fileURLToPath(new URL('../evidence/count-words.mjs', import.meta.url));
const lines = fs.readFileSync(file, 'utf8').replace(/\r/g, '').trimEnd().split('\n');
const out = execFileSync(process.execPath, [file], { encoding: 'utf8' }).replace(/\r/g, '').trimEnd().split('\n');
const [, count] = out[0].match(/^(\d+) words$/) ?? [];
const [, longest] = out[1].match(/^longest: (\w+)$/) ?? [];
if (!count || !longest) throw new Error(`unexpected output: ${out.join(' | ')}`);
fs.writeFileSync(new URL('../evidence/code-run.json', import.meta.url), JSON.stringify({ file: 'count-words.mjs', cmd: 'node count-words.mjs', lines, stdout: out, node: process.version, ts: new Date().toISOString() }, null, 1));

// Characters a..b of line N, as a cue target, found by searching the real line (so editing the file never points at the wrong spot).
const span = (n, s) => { const a = lines[n - 1].indexOf(s); if (a < 0) throw new Error(`"${s}" not on line ${n}`); return `line:${n}:${a}-${a + s.length}`; };
const outSpan = (k, s) => { const a = out[k].indexOf(s); if (a < 0) throw new Error(`"${s}" not in output line ${k}`); return `out:0:${k}:${a}-${a + s.length}`; };

const script = {
  version: 2, format: 'explainer', endScreenSeconds: 6, slug: 'hello-world',
  title: 'Hello World: A Narrated Video Made From One JSON File',
  mood: { palette: 'cyan', backdrop: 'grid', type: 'grotesk', transition: 'iris', shapes: 'glass', texture: 'none' },
  thumb: { kicker: 'RUNS LOCALLY STUDIO', hero: { value: '1', label: 'JSON FILE' }, headline: 'A VIDEO\nFROM JSON', verdict: 'VOICE + ANIMATION, LOCAL' },
  beats: [
    { id: 'b01', narration: 'This whole video was made from one JSON file. No camera, no editing app, no cloud. A free voice reads each line on this computer, and the pictures move when the voice says their word.',
      visual: { type: 'title', kicker: 'Hello world', headline: 'A video made from one JSON file', sub: 'voice, timing and animation, all on your own machine' } },
    { id: 'b02', narration: `Here is a real program, run on this computer. It splits one sentence into words and counts them. Run it, and it prints ${words(+count)} words. The longest one is ${longest}.`,
      visual: { type: 'explain', scene: 'code', title: 'A real program, really run', badge: 'Replay of a real run',
        source: `Measured . the file and its output from evidence/code-run.json (Node ${process.version})`,
        data: { file: 'count-words.mjs', lines, lang: 'js', runs: [{ cmd: 'node count-words.mjs', out }], prompt: '$', fontSize: 34, termFontSize: 36, typeCps: 70, top: 170 },
        cues: [
          { at: '@program', do: 'focus', target: 'code', label: 'the file that ran' },
          ...lines.map((_, i) => ({ at: `@program+${i * 6}`, do: 'line', line: i + 1 })),
          { at: '@splits', do: 'focus', target: span(2, 'line.split(" ")'), label: 'one sentence into words' },
          { at: '@splits', do: 'point', target: span(2, 'split') },
          { at: '@counts', do: 'focus', target: span(3, 'words.length') },
          { at: '@run', do: 'run', run: 0 }, { at: '@run', do: 'focus', target: null },
          { at: `@${words(+count)}`, do: 'focus', target: 'out:0:0', label: 'its real output', pad: 14 },
          { at: `@${words(+count)}`, do: 'point', target: outSpan(0, count) },
          { at: `@${longest}`, do: 'point', target: outSpan(1, longest) },
        ] } },
    { id: 'b03', narration: 'Each scene in the file is data plus cues. A cue names a spoken word, and the cursor or the highlight arrives exactly when the voice says it. Change the words, voice it again, and every cue moves with them.',
      visual: { type: 'list', headline: 'How a scene knows when to move', items: ['The script names a spoken word: "@program"', 'Whisper measures when that word is said', 'The frame renders the cue at that moment'] } },
    { id: 'b04', narration: 'Before anything is published, the checks run. A machine listens to every line, a contact sheet shows every scene, and each number has to come from a real file.',
      visual: { type: 'callout', text: 'Check it before you publish it', sub: 'speech check, contact sheets, numbers traced to files' } },
    { id: 'b05', narration: 'Write a script, run one command, and look at every frame. Make your own.',
      visual: { type: 'end', series: 'Runs Locally Studio', line: 'Make your own: read the README' } },
  ],
};
fs.writeFileSync(new URL('../script.json', import.meta.url), JSON.stringify(script, null, 2));
console.log(`wrote content/hello-world/script.json (${script.beats.length} beats; the program printed: ${out.join(' | ')})`);
