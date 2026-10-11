#!/usr/bin/env node
// Writes content/how-ai-picks-the-next-word/publishing.json from the evidence, the lesson file and the ALIGNED timings (chapters match the render).
// Run after align.mjs, from the repository root:  node content/how-ai-picks-the-next-word/harness/build-publishing.mjs   (--draft: before align, estimated chapters)
import fs from 'node:fs';
import { SLUG, TITLE, script, FACTS } from './build-script.mjs';
import { words, cap } from '../../../scripts/lib/words.mjs';

const ev = (f) => JSON.parse(fs.readFileSync(new URL(`../evidence/${f}`, import.meta.url), 'utf8'));
const code = ev('code-run.json'), sample = ev('sample.json'), greedy = ev('greedy.json');
const draft = process.argv.includes('--draft');
const md = ev('model-defaults.json').parameters.trim().split(/\n/).map((l) => l.trim().split(/\s+/));
const defaults = md.map(([k, v]) => `${k} ${v}`).join(', ');
if (!/presence_penalty\s+1\.5/.test(ev('model-defaults.json').parameters)) throw new Error('model defaults changed: re-check the LIMITS wording');
const timings = draft ? null : JSON.parse(fs.readFileSync(`public/${SLUG}/timings.json`, 'utf8'));
const FPS = 30, BREATH = 8;
const starts = {}; let frames = 0;
for (const b of script.beats) { starts[b.id] = frames / FPS; frames += Math.round((draft ? b.narration.split(/\s+/).length / 2.6 : timings[b.id].durationInSeconds) * FPS) + BREATH; }
const stamp = (id) => { const s = Math.floor(starts[id]); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const { steps, young, top5sum, nYoung, nCurious, nLittle, distinct, outsideTop5, vocab, draws, ollama, PROMPT } = FACTS;
const pct = (c) => `${c.text.trim() || JSON.stringify(c.text)} ${c.p < 0.1 ? 'under 0.1' : c.p.toFixed(1)}%`;
const show = (t) => (t === '.' ? '"."' : t.trim());

const CH = [['b01', 'How an AI picks the next word'], ['b02', 'The real scores'], ['b03', 'Every chip gets a score'], ['b04', 'Score, pick, add, repeat'],
  ['b05', `${draws.length} real draws of the first word`], ['b06', `${cap(words(code.lines.length))} lines of Python to see the scores`], ['b07', 'Recap']];
const chapters = CH.map(([id, t]) => `${stamp(id)} ${t}`);

const desc = `How does an AI pick the next word? It gives a score to every chip (token) it could write next, picks one, adds it to the sentence, and repeats. These are the real scores from a small AI (qwen3.5:4b in Ollama) running on my laptop with a 4 GB graphics card: for "${PROMPT}", "young" gets ${young.p}%. I also let it draw the first word ${draws.length} times: ${distinct} different words came out.

What is real: every score, the ${draws.length} draws and the code output are real data from my laptop. The cursor, highlights and labels are added in post.

${chapters.join('\n')}

THE RESULTS (measured)
- Model and runtime: qwen3.5:4b in Ollama ${ollama}, RTX 3050 Laptop GPU 4 GB, Ryzen 7 6800HS, 16 GB RAM, Windows 11. Plain text in ("raw" mode, no chat wrapper), context 4,096. Scores = Ollama's logprobs turned into percent (100 x e to the log prob), top 5 per step.
- First chip after "${PROMPT}": ${steps[0].top.map(pct).join(', ')}. Together about ${Math.round(top5sum)}% (${top5sum.toFixed(1)}% before rounding); all other chips share the rest.
- Always taking the top score (temperature 0, presence and repeat penalties off), five rounds wrote "${greedy.response.split('.')[0].trim()}." Round by round: ${steps.slice(0, 5).map((s, k) => `${k + 1}) ${show(s.chosen)} ${s.top[0].p}%`).join(', ')}. The same request twice gave the same chips.
- ${draws.length} draws of the first chip (temperature 1, no top-k or top-p cut, penalties off, seed = run number 1 to ${draws.length}): young ${nYoung}, curious ${nCurious}, little ${nLittle} (the other ${outsideTop5} of the ${draws.length} draws went to words outside the top five). ${distinct} different words in total: ${Object.entries(sample.counts).map(([k, v]) => `${k.trim()} ${v}`).join(', ')}.
- The model file lists ${vocab.toLocaleString('en-US')} chips (its vocabulary), read from its metadata.

THE CODE (real run)
${code.lines.join('\n')}

Output:
${code.stdout.join('\n')}

To try it: install Ollama, pull qwen3.5:4b, pip install requests, save the lines above as nextword.py and run it. "logprobs" and "top_logprobs" are Ollama API fields (see Ollama's API documentation; this ran on Ollama ${ollama}).

LIMITS: one model (qwen3.5:4b), one laptop, one prompt, plain text without the chat wrapper. A chat app wraps your message and uses its own settings; this model's default settings in Ollama ${ollama} are ${defaults} (read with ollama show); the presence penalty lowers chips that were already used. I switched the penalties and cuts off so the draws follow the scores; with the defaults, at most 20 different words could come out. Even at temperature 0 the default presence penalty can skip the top score: with it on, my sentence became "young adventurer named Lily. One day, she decided" instead of "Lily loved to explore the". I turned it off for the five rounds. ${draws.length} draws is a small sample, so the counts wobble around the scores (curious came out more often than little this time). Other models give other scores. "Chip" is my word for a token.

Claude Code built the animation and ran the measurements. The narration is an AI voice (Kokoro).

Previous: what is VRAM https://youtu.be/KOdLEy9c8N0
Next: what temperature does to an AI's answers.`;

const publishing = {
  slug: SLUG, title: TITLE, privacy: 'private', categoryId: '28', madeForKids: false,
  tags: ['how does ai work', 'how do llms work', 'next word prediction', 'next token prediction', 'logprobs', 'ollama', 'local ai', 'qwen', 'ai explained', 'what is a token', 'temperature ai', 'python ollama', 'Runs Locally'],
  chapters, description: desc,
};
if (/[<>]/.test(desc) || /[<>]/.test(TITLE)) throw new Error('title or description contains < or >');
if (desc.length > 4980) throw new Error(`description is ${desc.length} characters (limit 5,000)`);
if (TITLE.length > 100) throw new Error(`title is ${TITLE.length} characters`);
fs.writeFileSync(new URL('../publishing.json', import.meta.url), JSON.stringify(publishing, null, 2));
console.log(`wrote publishing.json${draft ? ' (DRAFT chapters)' : ''}: ${desc.length} characters, ${chapters.length} chapters`);
