#!/usr/bin/env node
// Builds script.json and brief.json for how-ai-picks-the-next-word. Every number comes from the evidence files
// (greedy.json, sample.json, code-run.json, vocab.json); nothing is typed by hand.
import fs from 'node:fs';
import { words, decimal, cap } from '../../../scripts/lib/words.mjs';
import { cueProblems, estimateWords } from '../../../scripts/lib/cues.mjs';

export const SLUG = 'how-ai-picks-the-next-word';
const root = new URL('../', import.meta.url);
const ev = (f) => JSON.parse(fs.readFileSync(new URL(`../evidence/${f}`, import.meta.url), 'utf8'));
const greedy = ev('greedy.json'), sample = ev('sample.json'), code = ev('code-run.json');
const vocab = ev('vocab.json').vocab_size;

/* ── the facts ───────────────────────────────────────────────────────────────────────────────────────────────── */
const P = (lp) => 100 * Math.exp(lp);
const r1 = (x) => Math.round(x * 10) / 10;
const steps = greedy.steps.map((s) => ({ chosen: s.chosen, top: s.top.map((t) => ({ text: t.token, p: r1(P(t.logprob)) })) }));
steps.forEach((s, k) => { if (s.chosen !== s.top[0].text) throw new Error(`step ${k}: temperature 0 picked "${s.chosen}", not the top score "${s.top[0].text}"`); });
if (!greedy.repeat_identical) throw new Error('temperature 0 did not repeat');
const PROMPT = greedy.prompt;
if (sample.prompt !== PROMPT || code.lines.join('\n').indexOf(PROMPT) < 0) throw new Error('prompts differ between runs');
const s0 = steps[0].top;
const [young, little, curious] = s0;
if (young.text !== ' young' || little.text !== ' little' || curious.text !== ' curious') throw new Error('step-1 candidates changed: ' + s0.map((c) => c.text).join('|'));
const top5sum = s0.reduce((a, c) => a + P(greedy.steps[0].top.find((t) => t.token === c.text).logprob), 0);
const [adv, named, lily, stop] = [steps[1], steps[2], steps[3], steps[4]];
if (adv.chosen !== ' adventurer' || named.chosen !== ' named' || lily.chosen !== ' Lily' || stop.chosen !== '.') throw new Error('greedy sentence changed: ' + greedy.response);
const alex = lily.top[1];
if (alex.text !== ' Alex') throw new Error('runner-up name changed');
const draws = sample.rows.map((r) => r.chip);
const cnt = (t) => draws.filter((d) => d === t).length;
const nYoung = cnt(' young'), nCurious = cnt(' curious'), nLittle = cnt(' little');
const distinct = new Set(draws).size;
if (draws.length !== 100) throw new Error('expected 100 draws');
if (!(nCurious > nLittle)) throw new Error('the "curious beat little" sentence no longer holds');
if (!s0.every((c) => cnt(c.text) > 0)) throw new Error('a top-5 chip was never drawn: "the top five plus N others" no longer holds');
const outsideTop5 = draws.filter((d) => !s0.some((c) => c.text === d)).length;
const codeTop = code.stdout[0].match(/^' young' ([\d.]+)%$/);
if (!codeTop || +codeTop[1] !== young.p) throw new Error(`code output disagrees with the harness: ${code.stdout[0]} vs ${young.p}`);
const allPicked = steps.length;
const ollama = greedy.meta.ollama;

/* ── the lesson, beat by beat ────────────────────────────────────────────────────────────────────────────────── */
const HW = `qwen3.5:4b, Ollama ${ollama}, RTX 3050 Laptop 4 GB`;
const RAW = "plain text, no chat wrapper";
const src0 = `Measured . ${HW}; ${RAW}; scores = Ollama's logprobs as percent, top 5 of the next chip`;
const legend = '· marks a space: it belongs to the chip';
const D = (extra = {}) => ({ prompt: PROMPT, steps, legend, heading: 'Scores for the next chip, round {k}', ...extra });

const beats = [
  { id: 'b01', movement: 'open', purpose: 'answer', evidenceIds: ['e-greedy'],
    narration: `Once upon a time, there was a... what comes next? The AI does not know yet. First it gives a score to every chip it could write next. Then it picks one, adds it to the sentence, and does the whole thing again. That loop is how an AI writes.`,
    visual: { type: 'explain', scene: 'nextword', title: 'How an AI picks the next word', badge: 'Real scores · Qwen 3.5', source: src0,
      data: D({ startPicked: 0 }),
      cues: [
        { at: '@once', do: 'focus', target: 'prompt', label: 'what we gave the AI' },
        { at: '@next', do: 'point', target: 'slot', anchor: [0.5, 0.55] },
        { at: '@score', do: 'step', step: 0 }, { at: '@score', do: 'focus', target: 'bars', label: 'a score for each possible next chip' },
        { at: '@chip', do: 'focus', target: 'cand:0', label: 'chip = a token: a piece of text', side: 'right' },
        { at: '@picks', do: 'focus', target: 'cand:0', label: 'pick one', side: 'right' },
        { at: '@adds', do: 'focus', target: 'slot', label: 'add it' },
        { at: '@again', do: 'focus', target: null },
        { at: '@loop', do: 'focus', target: ['slot', 'bars'] },
      ] } },
  { id: 'b02', movement: 'proof', purpose: 'demonstration', evidenceIds: ['e-greedy'],
    narration: `These are the real scores, from a small AI called Qwen, running on my laptop. The top one, young, gets about ${words(Math.round(young.p))} percent. Little and curious come next. Here it picks the top one, young, and adds it to the sentence.`,
    visual: { type: 'explain', scene: 'nextword', title: 'The real scores', badge: 'Real scores · Qwen 3.5', source: src0,
      data: D({ startStep: 0 }),
      cues: [
        { at: '@real', do: 'focus', target: 'bars', label: 'measured on this laptop' },
        { at: '@young', do: 'focus', target: 'cand:0' }, { at: '@young', do: 'point', target: 'pct:0', anchor: [0.3, 0.55] },
        { at: '@little', do: 'focus', target: ['cand:1', 'cand:2'] },
        { at: '@picks', do: 'pick', step: 0 }, { at: '@picks', do: 'focus', target: 'cand:0', label: 'picked', side: 'right' },
        { at: '@adds', do: 'focus', target: 'chip:0', label: 'added to the sentence' },
      ] } },
  { id: 'b03', movement: 'proof', purpose: 'demonstration', evidenceIds: ['e-greedy', 'e-vocab'],
    narration: `A chip, or token, is a piece of text the AI reads and writes. Here each one is a whole word with its space in front: that dot marks the space. Sometimes a chip is only part of a word, or a full stop. And the AI scores every chip it knows, about ${words(Math.round(vocab / 1000))} thousand of them, all at once. The top five shown here add up to about ${words(Math.round(top5sum))} percent. Everything else it knows shares the rest.`,
    visual: { type: 'explain', scene: 'nextword', title: 'Every chip gets a score', badge: 'Real scores · Qwen 3.5', source: `Measured . ${HW}; ${RAW}. Documented: the model file lists ${vocab.toLocaleString('en-US')} chips`,
      data: D({ startPicked: 1, startStep: 0 }),
      cues: [
        { at: '@chip', do: 'focus', target: ['label:0', 'label:1', 'label:2', 'label:3', 'label:4'], label: 'chip = token', side: 'above' },
        { at: '@reads', do: 'point', target: 'label:1', anchor: [0.6, 0.55] },
        { at: '@front', do: 'focus', target: 'label:0', label: 'space + word = one chip', side: 'right' },
        { at: '@dot', do: 'focus', target: 'legend' }, { at: '@dot', do: 'point', target: 'label:0', anchor: [0.12, 0.5] },
        { at: '@every', do: 'focus', target: 'bars', label: `every chip it knows: about ${Math.round(vocab / 1000)},000` },
        { at: '@five', do: 'focus', target: ['cand:0', 'cand:1', 'cand:2', 'cand:3', 'cand:4'], label: `top 5 together: about ${Math.round(top5sum)}%`, side: 'right' },
        { at: '@sometimes', do: 'focus', target: 'legend', label: 'a chip can also be part of a word, or a full stop' },
        { at: '@else', do: 'focus', target: 'rest', label: 'all the other chips, together' }, { at: '@else', do: 'point', target: 'rest', anchor: [0.62, 0.55] },
      ] } },
  { id: 'b04', movement: 'proof', purpose: 'demonstration', evidenceIds: ['e-greedy'],
    narration: `Now watch the loop. Here it always takes the top score. With young in the sentence, every score changes: now adventurer, boy and student lead. Adventurer wins with about ${words(Math.round(adv.top[0].p))} percent. In the next round, named gets ${decimal(named.top[0].p, 1)} percent: almost certain. Then a name: Lily, ahead of Alex. Then a full stop. Five rounds, five chips, one sentence. Each round adds just one chip.`,
    visual: { type: 'explain', scene: 'nextword', title: 'Score, pick, add, repeat', badge: 'Real scores · Qwen 3.5', source: `Measured . ${HW}; ${RAW}; temperature 0 and penalties off: always the top score; repeated: same chips`,
      data: D({ startPicked: 1, startStep: 0 }),
      cues: [
        { at: '@loop', do: 'focus', target: null },
        { at: '@top', do: 'focus', target: 'chip:0', label: 'young: already picked', side: 'right' },
        { at: '@every', do: 'step', step: 1 }, { at: '@changes', do: 'focus', target: 'bars', label: 'new sentence, new scores' },
        { at: '@adventurer#2', do: 'pick', step: 1 }, { at: '@adventurer#2', do: 'point', target: 'pct:0', anchor: [0.3, 0.55] },
        { at: '@round', do: 'step', step: 2 }, { at: '@round', do: 'focus', target: null },
        { at: '@certain', do: 'focus', target: 'cand:0', label: 'almost certain', side: 'above' }, { at: '@certain', do: 'pick', step: 2 },
        { at: '@name', do: 'step', step: 3 }, { at: '@name', do: 'focus', target: null },
        { at: '@alex', do: 'focus', target: ['cand:0', 'cand:1'], label: 'close: Lily, then Alex', side: 'right' }, { at: '@alex+10', do: 'pick', step: 3 },
        { at: '@full', do: 'step', step: 4 }, { at: '@stop', do: 'pick', step: 4 }, { at: '@stop', do: 'focus', target: null },
        { at: '@one sentence', do: 'focus', target: 'sentence', label: 'five rounds, five chips' },
        { at: '@each', do: 'focus', target: 'sentence' },
      ] } },
  { id: 'b05', movement: 'proof', purpose: 'proof', evidenceIds: ['e-sample'],
    narration: `But an AI app usually does not take the top score every time. It draws one chip at random, and a higher score only means a better chance. So I switched off the extra filters and let it draw the first chip a hundred times, straight from these scores. Young came out ${words(nYoung)} times. Curious came out ${words(nCurious)} times, more than little this time, just by chance. In total, ${words(distinct)} different words came out: the top five, plus ${words(distinct - 5)} others, like furry and retired. The scores stay the same. The draw is what changes.`,
    visual: { type: 'explain', scene: 'nextword', title: '100 draws from the same scores', badge: 'Measured on this laptop', source: `Measured . ${HW}; ${RAW}; ${draws.length} runs of one chip, temperature 1, no top-k or top-p cut, penalties off, seed = run number`,
      data: D({ startStep: 0, heading: 'Scores for the first chip', tally: { draws, rate: 1, heading: `${draws.length} real draws` } }),
      cues: [
        { at: '@top', do: 'focus', target: 'cand:0' },
        { at: '@random', do: 'focus', target: 'bars', label: 'higher score = better chance, not a sure pick' },
        { at: '@better', do: 'point', target: 'pct:0', anchor: [0.3, 0.55] },
        { at: '@filters', do: 'focus', target: 'bars', label: 'extra filters off: the draws follow these scores' },
        { at: '@hundred', do: 'tally' }, { at: '@hundred', do: 'focus', target: 'grid', label: 'one square = one real draw' },
        { at: `@young`, do: 'focus', target: 'cand:0' }, { at: `@${words(nYoung).split('-')[0]}`, do: 'point', target: 'drawn:0', anchor: [0.3, 0.55] },
        { at: '@curious', do: 'focus', target: ['cand:1', 'cand:2'] }, { at: '@curious', do: 'point', target: 'drawn:2', anchor: [0.3, 0.55] },
        { at: '@total', do: 'focus', target: ['rest', 'drawnRest'], label: `${outsideTop5} draws, ${distinct - 5} different words outside the top five`, side: 'above' },
        { at: '@furry', do: 'focus', target: 'grid', label: `${distinct} different words, like furry and retired` },
        { at: '@same', do: 'focus', target: 'bars', label: 'the scores: the same every time' },
        { at: '@draw#2', do: 'focus', target: 'grid', label: 'the draw: different every time' },
      ] } },
  { id: 'b06', movement: 'proof', purpose: 'demonstration', evidenceIds: ['e-code'],
    narration: `If you write code, you can see these scores yourself. These ${words(code.lines.length)} lines of Python ask Ollama for one chip, with log probs turned on, and the top five. Each score comes back as a log prob, and math dot exp, times a hundred, turns it into a percent. Run it, and young comes back with ${decimal(young.p, 1)} percent, the same score we saw before.`,
    visual: { type: 'explain', scene: 'code', title: 'See the scores yourself', badge: 'Replay of a real run', source: `Measured . this file ran against ${HW}; real output of the second run. "logprobs" and "top_logprobs": Ollama's documented API fields`,
      data: { file: code.file, lines: code.lines, lang: 'python', runs: [{ cmd: code.cmd, out: code.stdout }], prompt: 'PS>', fontSize: 30, termFontSize: 36, typeCps: 70, top: 150, lineHeight: 1.45 },
      cues: (() => {
        const L = code.lines, sp = (i, s) => { const a = L[i - 1].indexOf(s); if (a < 0) throw new Error(`"${s}" not on line ${i}`); return `line:${i}:${a}-${a + s.length}`; };
        const out = (k, s) => { const l = code.stdout[k]; const a = l.indexOf(s); if (a < 0) throw new Error(`"${s}" not in output ${k}`); return `out:0:${k}:${a}-${a + s.length}`; };
        return [
          { at: '@lines', do: 'focus', target: 'code', label: `${L.length} lines of Python` },
          ...L.map((_, i) => ({ at: `@python+${i * 5}`, do: 'line', line: i + 1 })),
          { at: '@one', do: 'focus', target: sp(4, '"num_predict": 1'), label: 'just one chip' },
          { at: '@probs', do: 'focus', target: sp(3, '"logprobs": True'), label: 'send back the scores' }, { at: '@probs', do: 'point', target: sp(3, '"logprobs": True') },
          { at: '@five', do: 'focus', target: sp(3, '"top_logprobs": 5'), label: 'the top 5' },
          { at: '@exp', do: 'focus', target: sp(7, 'math.exp(chip["logprob"])'), label: 'log prob -> percent' }, { at: '@exp', do: 'point', target: sp(7, 'math.exp') },
          { at: '@run', do: 'run', run: 0 }, { at: '@run', do: 'focus', target: null },
          { at: '@young', do: 'zoom', target: 'out:0:0', scale: 1.5 }, { at: '@young', do: 'focus', target: 'out:0:0', label: 'the same score as in the bars before', pad: 16 }, { at: '@young', do: 'point', target: out(0, `${young.p}%`) },
        ];
      })() } },
  { id: 'b07', movement: 'proof', purpose: 'answer', evidenceIds: ['e-greedy', 'e-sample'],
    narration: `So an AI writes one chip at a time. It scores every chip it knows, picks one, adds it to the sentence, and repeats, until the answer is done. These scores come from one small model on my laptop. A different model would likely give different scores, but the loop is the same.`,
    visual: { type: 'explain', scene: 'nextword', title: 'The whole trick, in one loop', badge: 'Real scores · Qwen 3.5', source: `Measured . ${HW}; ${RAW}; ${allPicked} rounds, temperature 0, penalties off, stopped after ${allPicked} chips`,
      data: D({ startPicked: allPicked - 1, startStep: allPicked - 1, legend: '' }),   // two-line sentence: no legend row
      cues: [
        { at: '@time', do: 'focus', target: 'sentence', label: 'one chip per round' },
        { at: '@scores', do: 'focus', target: 'bars' },
        { at: '@picks', do: 'focus', target: 'cand:0' }, { at: '@adds', do: 'pick', step: allPicked - 1 },
        { at: '@repeats', do: 'focus', target: 'sentence', label: 'and again, until the answer is done' },
        { at: '@small', do: 'focus', target: null },
      ] } },
  { id: 'b08', movement: 'landing', purpose: 'next', evidenceIds: ['e-sample'],
    narration: `That draw has a setting, called temperature: it decides how adventurous the draw is. Next time: what temperature does to the answers.`,
    visual: { type: 'end', series: 'Runs Locally', line: 'Next: what temperature does to an AI' } },
];

for (const b of beats) {
  const bad = cueProblems(b.visual.cues, estimateWords(b.narration));
  if (bad.length) throw new Error(`${b.id}: ${bad.join(' | ')}`);
}
const longSrc = beats.filter((b) => b.visual.source && b.visual.source.length > 185).map((b) => `${b.id} ${b.visual.source.length}: ${b.visual.source}`);
if (longSrc.length) throw new Error(`sources over 185 characters: ${longSrc.join(' || ')}`);

export const TITLE = `How Does AI Pick the Next Word? The Real Scores Inside a Local AI (Qwen 3.5)`;
if (TITLE.length > 100) throw new Error(`title is ${TITLE.length} characters`);
export const FACTS = { steps, young, little, curious, top5sum, adv, named, lily, alex, nYoung, nCurious, nLittle, distinct, outsideTop5, vocab, draws, ollama, PROMPT, HW };
export const script = { version: 2, format: 'guide', endScreenSeconds: 8, slug: SLUG, title: TITLE,
  mood: { palette: 'violet', backdrop: 'grid', type: 'grotesk', transition: 'iris', shapes: 'glass', texture: 'none' },
  thumb: { kicker: 'AI BASICS . NEXT WORD', hero: { value: `${Math.round(young.p)}%`, label: 'YOUNG' }, headline: 'HOW AI PICKS\nTHE NEXT WORD', verdict: 'REAL SCORES' }, beats };

if (process.argv[1]?.endsWith('build-script.mjs')) {
  fs.writeFileSync(new URL('script.json', root), JSON.stringify(script, null, 2));
  const E = (id, claim, file, conditions, kind = 'measured') => ({ id, kind, claim, file, checkedAt: '2026-10-12', conditions });
  const COND = `${HW}, Ryzen 7 6800HS, 16 GB RAM, Windows 11; raw completion of "${PROMPT}", num_ctx 4096, top_logprobs 5`;
  const brief = {
    version: 2, slug: SLUG, createdBy: 'Claude Code, 2026-10-12',
    score: { heat: 1, stakes: 2, proof: 3, breadth: 3, total: 9, note: 'Fourth explainer; promised on air at the end of what-is-vram-4gb-laptop. Demand: "how do llms work" 1,700 US searches a month (Ahrefs 2026-10-05). No views are promised.' },
    viewer: 'A beginner who uses chat AIs and wonders how they produce words, without equations.',
    question: 'How does an AI decide which word comes next?',
    promise: `Show the real scores a small local AI gives its next-chip candidates (young about ${Math.round(young.p)}%), the score-pick-add loop over five real rounds, ${draws.length} real random draws, and ${code.lines.length} lines of Python that print the scores.`,
    earlyAnswer: 'It scores every chip it could write next, picks one, adds it to the sentence, and repeats.',
    newValue: 'Real logprobs from a model running on a 4 GB laptop, a real 100-draw tally against those scores, and code that prints them; most explainers draw made-up probability bars.',
    evidencePlan: 'evidence/model-defaults.json (the default settings of the model, read on Ollama 0.40.2), evidence/greedy.json (10 rounds, top 5 each, repeated identically), sample.json (100 one-chip draws), code-run.json (the lesson file, run twice), pilot.json (prompt choice, not pooled); harness/nextword-runs.py.',
    nextStep: 'Next video: what temperature does (backlog what-is-temperature-ai).',
    packagingEvidenceIds: ['e-greedy'],
    packaging: [
      { title: TITLE, thumbnailText: 'WHICH WORD NEXT?', imageIdea: `"Once upon a time, there was a ___" with the real score bars: young ${young.p}%, little, curious.`, firstSentence: 'Once upon a time, there was a... what comes next?' },
      { title: `I Let an AI Pick the Next Word ${draws.length} Times: ${distinct} Different Answers`, thumbnailText: `${distinct} DIFFERENT WORDS`, imageIdea: 'The 100-square tally grid, colourful, with "young 30x".', firstSentence: 'Same sentence, a hundred draws.' },
      { title: 'How an AI Writes: One Chip at a Time (Real Scores From a Local AI)', thumbnailText: 'SCORE . PICK . REPEAT', imageIdea: 'A loop arrow around the sentence chips.', firstSentence: 'That loop is how an AI writes.' },
    ],
    demand: [
      { platform: 'Google (Ahrefs Keywords Explorer, United States)', source: 'Ahrefs MCP keywords-explorer-overview', retrievedAt: '2026-10-05', observation: '"how do llms work" 1,700 searches a month (2,600 global), KD 54. Google volumes, not YouTube demand.' },
      { platform: 'Runs Locally own channel data (Analytics API)', source: 'growth-audit.mjs snapshot 2026-10-12', retrievedAt: '2026-10-12', observation: 'Search is 69% of views (28 days to 10-09); the VRAM explainer (135 views) promised this video on air.' },
    ],
    nearestExistingVideos: [
      { id: '8Ly9jq3sbpE', title: 'What Is a Token?', why: 'Introduced the chip/token; this video shows what the model does with chips: scores and picks.' },
      { id: 'KOdLEy9c8N0', title: 'What Is VRAM?', why: 'The previous explainer; it promised this video.' },
    ],
    evidence: [
      E('e-greedy', `Temperature 0, penalties off: "${PROMPT}" -> "${greedy.response}". Round 1 top 5: ${s0.map((c) => `${c.text.trim()} ${c.p}%`).join(', ')} (sum ${top5sum.toFixed(1)}%). Round 2 top: ${adv.top.slice(0, 3).map((c) => `${c.text.trim()} ${c.p}%`).join(', ')}; round 3 named ${named.top[0].p}%; round 4 Lily ${lily.top[0].p}%, Alex ${alex.p}%; round 5 "." ${stop.top[0].p}%. Same request again: identical.`, 'content/how-ai-picks-the-next-word/evidence/greedy.json', `${COND}; temperature 0, presence_penalty 0, repeat_penalty 1, seeds 1 and 2. The model's default settings use presence_penalty 1.5, which lowers chips already used (pilot.json: a temperature-0 pilot then picked a chip that was not the top score).`),
      E('e-sample', `${draws.length} one-chip draws: young ${nYoung}, curious ${nCurious}, little ${nLittle}, ${outsideTop5} outside the round-1 top 5, ${distinct} different chips: ${Object.entries(sample.counts).map(([k, v]) => `${k.trim()} ${v}`).join(', ')}.`, 'content/how-ai-picks-the-next-word/evidence/sample.json', `${COND}; temperature 1, top_k 0, top_p 1, min_p 0, penalties off, num_predict 1, seed = run number 1..100. Default settings (top_k 20, top_p 0.95) would cut the rarest candidates; not tested.`),
      E('e-code', `nextword.py printed: ${code.stdout.join(' | ')}`, 'content/how-ai-picks-the-next-word/evidence/code-run.json', `${HW}; second of two runs (the first printed the same)`),
      E('e-vocab', `The qwen3.5 model file lists ${vocab.toLocaleString('en-US')} vocabulary entries.`, 'content/how-ai-picks-the-next-word/evidence/vocab.json', 'GGUF metadata of qwen3.5:4b, read 2026-10-05', 'documented'),
    ],
  };
  fs.writeFileSync(new URL('brief.json', root), JSON.stringify(brief, null, 2));
  console.log('built', TITLE, TITLE.length, 'chars | beats', beats.length, '| words', beats.reduce((n, b) => n + b.narration.split(/\s+/).length, 0), '| young', young.p, '| draws', nYoung, nCurious, nLittle, distinct, '| top5', top5sum.toFixed(1));
}
