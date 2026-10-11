// Three distinct thumbnail concepts as HTML (every number comes from the evidence via build-script FACTS), then headless Chrome via scripts/thumb-shot.mjs.
// Run from the repository root: node content/how-ai-picks-the-next-word/harness/make-thumbs.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { FACTS, SLUG } from './build-script.mjs';
const dir = `content/${SLUG}/thumbs/`;
fs.mkdirSync(dir, { recursive: true });
const { steps, draws, distinct, nYoung } = FACTS;
const top3 = steps[0].top.slice(0, 3);
const COLS = ['#A78BFA', '#22D3EE', '#A3E635', '#FB7185', '#FBBF24'];

const head = `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@600;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0;padding:0}html,body{width:1280px;height:720px;overflow:hidden;background:#05070F}
.t{position:relative;width:1280px;height:720px;background:radial-gradient(ellipse at 70% 35%,#2a1d4d 0%,#120f26 55%,#05070F 100%);font-family:'Inter',sans-serif;color:#F5F7FF}
.kick{position:absolute;left:44px;top:30px;font-weight:800;font-size:30px;letter-spacing:.14em;color:#C4B5FD;text-transform:uppercase}
.big{font-family:'Anton',sans-serif;text-transform:uppercase;line-height:.92}
.chip{display:inline-flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-weight:700;border-radius:18px;padding:0 22px;color:#F5F7FF}
</style></head><body><div class="t">`;
const bar = (c, i, top, maxW) => `<div style="position:absolute;left:44px;top:${top}px;display:flex;align-items:center;gap:22px">
  <div class="chip" style="width:250px;height:92px;font-size:52px;background:${COLS[i]}33;border:4px solid ${COLS[i]}">${c.text.trim()}</div>
  <div style="width:${Math.round((c.p / top3[0].p) * maxW)}px;height:76px;border-radius:14px;background:${COLS[i]}"></div>
  <div class="big" style="font-size:84px">${Math.round(c.p)}%</div></div>`;

// A: WHICH WORD NEXT? — the prompt with a gap and the real scores
const A = `${head}<div class="kick">How AI writes</div>
<div class="big" style="position:absolute;left:44px;top:78px;font-size:132px">WHICH WORD <span style="color:#FBBF24">NEXT?</span></div>
<div style="position:absolute;left:44px;top:232px;font-weight:800;font-size:46px">Once upon a time, there was a <span style="display:inline-block;width:150px;height:56px;border:4px dashed #F5F7FF;border-radius:14px;vertical-align:middle"></span></div>
${top3.map((c, i) => bar(c, i, 330 + i * 120, 560)).join('')}
</div></body></html>`;

// B: 26 DIFFERENT WORDS — the colourful grid of the 100 real draws
const sq = draws.map((d) => { const i = steps[0].top.findIndex((c) => c.text === d); return `<div style="width:40px;height:40px;border-radius:9px;background:${i >= 0 ? COLS[i] : '#5b6275'}"></div>`; }).join('');
const B = `${head}<div class="kick">Same sentence, ${draws.length} draws</div>
<div class="big" style="position:absolute;left:44px;top:90px;font-size:200px;color:#FBBF24">${distinct}</div>
<div class="big" style="position:absolute;left:44px;top:290px;font-size:112px">DIFFERENT<br>WORDS</div>
<div style="position:absolute;left:44px;top:560px;font-weight:800;font-size:42px;color:#C4B5FD">young: ${nYoung} of ${draws.length}</div>
<div style="position:absolute;left:690px;top:110px;display:grid;grid-template-columns:repeat(10,40px);gap:10px">${sq}</div>
</div></body></html>`;

// C: SCORE . PICK . REPEAT — the five real chips in a loop
const chips = steps.slice(0, 4).map((s, i) => `<div class="chip" style="height:96px;font-size:54px;background:#FBBF2433;border:4px solid #FBBF24">${s.chosen.trim()}</div>`).join('');
const C = `${head}<div class="kick">Real scores, local AI</div>
<div class="big" style="position:absolute;left:44px;top:80px;font-size:150px">SCORE. PICK.<br><span style="color:#FBBF24">REPEAT.</span></div>
<div style="position:absolute;left:44px;top:440px;display:flex;gap:18px;align-items:center">${chips}<div class="big" style="font-size:110px;color:#C4B5FD">&#8635;</div></div>
<div style="position:absolute;left:44px;top:590px;font-weight:800;font-size:40px;color:#8B93A7">one chip at a time</div>
</div></body></html>`;

for (const [n, h] of [['A-which-word-next', A], ['B-26-different-words', B], ['C-score-pick-repeat', C]]) {
  fs.writeFileSync(`${dir}${n}.html`, h);
  execFileSync(process.execPath, ['scripts/thumb-shot.mjs', `${dir}${n}.html`, `${dir}${n}.jpg`], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `${dir}${n}.jpg`, '-vf', 'scale=320:180', `${dir}${n}-320.png`]);
}
fs.mkdirSync('out', { recursive: true });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `${dir}A-which-word-next.jpg`, '-i', `${dir}B-26-different-words.jpg`, '-i', `${dir}C-score-pick-repeat.jpg`, '-filter_complex', '[0]scale=640:-1[a];[1]scale=640:-1[b];[2]scale=640:-1[c];[a][b][c]vstack=3', `out/thumbs-${SLUG}.png`]);
console.log('ok', { distinct, nYoung, top3: top3.map((c) => c.p) });
