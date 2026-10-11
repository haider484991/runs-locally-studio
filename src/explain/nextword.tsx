/**
 * NEXTWORD — how a model writes: at every step it scores its candidate chips, one is picked and added to the sentence, then again.
 * The sentence (the prompt + the chips picked so far) runs along the top; under it, the real scores of the top candidates for the
 * current step as bars (percent of 100), plus "everything else" (100 minus the top ones). Optional: a tally grid of real draws.
 * data: { prompt, steps: [{ chosen, top: [{ text, p }] }], startPicked?, startStep?, restLabel?, heading?, legend?,
 *         tally?: { draws: string[], rate?, heading? } }      p = percent, from Ollama logprobs; draws = the chip each real run drew
 * Cues:  step {step:K} shows the scores for step K (bars grow) · pick {step:K} the top chip of step K flies into the sentence ·
 *        tally the draws fill the grid one square at a time; every count on screen is counted from the squares already drawn
 *        point / focus / zoom with targets  prompt · sentence · chip:K · slot · bars · cand:I · label:I · bar:I · pct:I · rest ·
 *        grid · drawn:I · drawnRest · sq:J · legend
 */
import React from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, hexA } from '../theme';
import { SPRINGS } from '../kit/motion';
import { Overlay, Targets } from './Overlay';
import type { RCue } from './ctx';
import { MONO, NO_LIG } from './fonts';
import { CHIP_COLORS, showTok } from './chip';
import { Rect, measure, union } from './geometry';

type Cand = { text: string; p: number };
type Step = { chosen: string; top: Cand[] };
type NextData = {
  prompt: string; steps: Step[]; startPicked?: number; startStep?: number; restLabel?: string; heading?: string; legend?: string;
  tally?: { draws: string[]; rate?: number; heading?: string };
};

const ease = Easing.out(Easing.cubic);
const c01 = (x: number) => Math.max(0, Math.min(1, x));
const GREY = '#8B93A7', PICK = '#FBBF24';
const SF = 40, SH = 66, SPAD = 14, SGAP = 10, SY = 172;                  // sentence chips
const BY = 400, BP = 70, BH = 54, LX = 160, BX = 470;                    // bars

export const NextwordScene: React.FC<{ data: NextData; cues: RCue[]; accent: string; dur: number }> = ({ data, cues, accent, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tally = data.tally;
  const W = tally ? 420 : 960;
  const PX = BX + W + 18;                                                 // percent column (fixed in tally mode)
  const DX = 1070, GX = 1262, SQ = 38, SG = 8;                            // drawn column, grid

  /* ── timeline state ── */
  const stepCues = cues.filter((c) => c.do === 'step');
  const pickCues = cues.filter((c) => c.do === 'pick');
  let step = data.startStep ?? (stepCues.length ? -1 : 0), stepAt = stepCues.length ? -999 : 6;
  for (const c of stepCues) if (frame >= c.at) { step = c.step; stepAt = c.at; }
  if (data.startStep !== undefined && stepAt === -999) stepAt = -999;
  let picked = data.startPicked ?? 0;
  for (const c of pickCues) if (frame >= c.at + 20) picked = Math.max(picked, c.step + 1);
  const flying = pickCues.find((c) => frame >= c.at + 4 && frame < c.at + 20);

  /* ── geometry: the sentence ── */
  const promptFont = `500 46px ${FONT.body}`;
  const pw = measure(data.prompt, promptFont);
  const promptRect: Rect = { x: LX, y: SY, w: pw, h: SH };
  const chipRects: Rect[] = [];
  let x = LX + pw + 16, y = SY;
  const place = (w: number): Rect => { if (x + w > 1760) { x = LX; y += SH + 20; } const r = { x, y, w, h: SH }; x += w + SGAP; return r; };
  data.steps.forEach((s) => chipRects.push(place(Math.max(SH * 0.7, measure(showTok(s.chosen), `500 ${SF}px ${MONO}`) + 2 * SPAD))));
  // the empty slot sits after the chips picked so far
  const slotRect: Rect = picked < chipRects.length ? { ...chipRects[picked], w: Math.max(110, chipRects[picked].w) } : { x: x, y, w: 110, h: SH };

  /* ── geometry: the bars ── */
  const cur = step >= 0 ? data.steps[Math.min(step, data.steps.length - 1)] : data.steps[0];
  const top = cur.top;
  const restP = Math.max(0, 100 - top.reduce((a, c) => a + c.p, 0));
  const rows = [...top.map((c, i) => ({ text: c.text, p: c.p, color: CHIP_COLORS[i % CHIP_COLORS.length], rest: false })),
    { text: data.restLabel ?? 'everything else', p: restP, color: GREY, rest: true }];
  const px = (p: number) => (p / (tally ? 40 : 100)) * W;      // tally mode: the bar column is short, so 40% fills it
  const targets: Targets = { prompt: promptRect, slot: slotRect, legend: { x: LX, y: SY + SH + 8, w: 900, h: 40 } };
  chipRects.forEach((r, k) => { targets[`chip:${k}`] = r; });
  targets.sentence = union([promptRect, ...chipRects.slice(0, Math.max(1, picked))]);
  rows.forEach((r, i) => {
    const yy = BY + i * BP;
    const key = r.rest ? 'rest' : `cand:${i}`;
    targets[key] = { x: LX - 10, y: yy - 8, w: (tally ? DX + 150 : BX + px(r.p) + 190) - LX, h: BH + 16 };
    if (!r.rest) {
      targets[`label:${i}`] = { x: LX, y: yy, w: BX - LX - 30, h: BH };
      targets[`bar:${i}`] = { x: BX, y: yy, w: Math.max(8, px(r.p)), h: BH };
      targets[`pct:${i}`] = { x: tally ? PX : BX + px(r.p) + 14, y: yy, w: 150, h: BH };
      if (tally) targets[`drawn:${i}`] = { x: DX, y: yy, w: 140, h: BH };
    } else if (tally) targets.drawnRest = { x: DX, y: yy, w: 140, h: BH };
  });
  targets.bars = union(rows.map((_, i) => ({ x: LX, y: BY + i * BP, w: (tally ? DX + 140 : PX + 160) - LX, h: BH })));

  /* ── the tally ── */
  const tallyAt = cues.find((c) => c.do === 'tally')?.at;
  const rate = tally?.rate ?? 2;
  const shown = tally && tallyAt !== undefined ? Math.max(0, Math.min(tally.draws.length, Math.floor((frame - tallyAt) / rate) + 1)) : 0;
  if (tally) {
    tally.draws.forEach((_, j) => { targets[`sq:${j}`] = { x: GX + (j % 10) * (SQ + SG), y: BY + Math.floor(j / 10) * (SQ + SG), w: SQ, h: SQ }; });
    targets.grid = { x: GX - 12, y: BY - 12, w: 10 * (SQ + SG) + 16, h: Math.ceil(tally.draws.length / 10) * (SQ + SG) + 16 };
  }
  const drawnOf = (t: string | null) => (tally ? tally.draws.slice(0, shown).filter((d) => (t === null ? !top.some((c) => c.text === d) : d === t)).length : 0);

  /* ── drawing helpers ── */
  const chipBox = (text: string, r: Rect, color: string, font: number, extra: React.CSSProperties = {}) => (
    <div style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: Math.min(20, r.h / 3), boxSizing: 'border-box', background: hexA(color, 0.2),
      border: `2.5px solid ${hexA(color, 0.85)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, ...NO_LIG, fontWeight: 500, fontSize: font,
      color: C.ink, whiteSpace: 'pre', ...extra }}>{showTok(text)}</div>
  );
  const barsIn = step >= 0 ? ease(c01((frame - stepAt) / 18)) : 0;
  const barsVis = step >= 0 ? c01((frame - stepAt + 4) / 8) : 0;
  const labelW = (t: string) => Math.max(BH * 0.9, measure(showTok(t), `500 34px ${MONO}`) + 24);

  return (
    <Overlay cues={cues} targets={targets} accent={accent} dur={dur}>
      {/* the sentence */}
      <div style={{ position: 'absolute', left: LX, top: SY, height: SH, display: 'flex', alignItems: 'center', fontFamily: FONT.body, fontWeight: 500, fontSize: 46, color: C.ink, whiteSpace: 'pre' }}>{data.prompt}</div>
      {chipRects.slice(0, picked).map((r, k) => <React.Fragment key={k}>{chipBox(data.steps[k].chosen, r, PICK, SF)}</React.Fragment>)}
      {step >= 0 && picked === step && picked < chipRects.length && !flying && (
        <div style={{ position: 'absolute', left: slotRect.x, top: slotRect.y, width: slotRect.w, height: slotRect.h, borderRadius: 20, boxSizing: 'border-box', border: `3px dashed ${hexA(C.ink, 0.5)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 40, color: hexA(C.ink, 0.7), opacity: barsVis }}>?</div>
      )}
      {data.legend && <div style={{ position: 'absolute', left: LX, top: SY + SH + 12, fontFamily: FONT.body, fontWeight: 500, fontSize: 26, color: C.muted }}>{data.legend}</div>}

      {/* the scores */}
      <div style={{ position: 'absolute', left: LX, top: BY - 58, fontFamily: FONT.body, fontWeight: 600, fontSize: 24, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, opacity: barsVis }}>
        {(data.heading ?? 'Scores for the next chip, step {k}').replace('{k}', String(Math.max(0, step) + 1))}
      </div>
      {tally && <div style={{ position: 'absolute', left: DX, top: BY - 58, fontFamily: FONT.body, fontWeight: 600, fontSize: 24, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, opacity: tallyAt !== undefined ? c01((frame - tallyAt + 10) / 8) : 0 }}>Drawn</div>}
      {rows.map((r, i) => {
        const yy = BY + i * BP, w = px(r.p) * barsIn;
        const isPick = !r.rest && i === 0 && pickCues.some((c) => c.step === step && frame >= c.at);
        const lw = labelW(r.text);
        return (
          <React.Fragment key={`${step}-${i}`}>
            {r.rest
              ? <div style={{ position: 'absolute', left: LX, top: yy, width: BX - LX - 20, height: BH, display: 'flex', alignItems: 'center', fontFamily: FONT.body, fontWeight: 600, fontSize: 30, color: C.muted, opacity: barsVis }}>{r.text}</div>
              : chipBox(r.text, { x: LX, y: yy, w: Math.min(lw, BX - LX - 30), h: BH }, isPick ? PICK : r.color, 34, { opacity: barsVis, boxShadow: isPick ? `0 0 26px ${hexA(PICK, 0.55)}` : 'none' })}
            <div style={{ position: 'absolute', left: BX, top: yy, width: Math.max(r.p > 0 ? 4 : 0, w), height: BH, borderRadius: 12, boxSizing: 'border-box', background: hexA(r.color, r.rest ? 0.18 : 0.35), border: `2.5px solid ${hexA(r.color, r.rest ? 0.5 : 0.95)}`, opacity: barsVis }} />
            <div style={{ position: 'absolute', left: tally ? PX : BX + w + 16, top: yy, height: BH, display: 'flex', alignItems: 'center', fontFamily: FONT.body, fontWeight: 700, fontSize: 40, color: r.rest ? C.muted : C.ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', opacity: barsVis * (barsIn > 0.2 ? 1 : 0) }}>
              {r.p < 0.1 ? '<0.1' : r.p.toFixed(1)}%
            </div>
            {tally && tallyAt !== undefined && frame >= tallyAt && (
              <div style={{ position: 'absolute', left: DX, top: yy, height: BH, display: 'flex', alignItems: 'center', fontFamily: FONT.body, fontWeight: 700, fontSize: 40, color: r.rest ? C.muted : C.ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {drawnOf(r.rest ? null : r.text)}×
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* the pick flying into the sentence */}
      {flying && (() => {
        const t = ease(c01((frame - flying.at - 4) / 16));
        const s = data.steps[flying.step];
        const from: Rect = { x: LX, y: BY, w: labelW(s.chosen), h: BH }, to = chipRects[flying.step];
        const r: Rect = { x: interpolate(t, [0, 1], [from.x, to.x]), y: interpolate(t, [0, 1], [from.y, to.y]) - Math.sin(t * Math.PI) * 60, w: interpolate(t, [0, 1], [from.w, to.w]), h: interpolate(t, [0, 1], [from.h, to.h]) };
        return chipBox(s.chosen, r, PICK, interpolate(t, [0, 1], [34, SF]), { boxShadow: `0 0 30px ${hexA(PICK, 0.6)}` });
      })()}

      {/* the tally grid */}
      {tally && (
        <>
          <div style={{ position: 'absolute', left: GX, top: BY - 58, width: 10 * (SQ + SG), fontFamily: FONT.body, fontWeight: 600, fontSize: 24, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, opacity: tallyAt !== undefined ? c01((frame - tallyAt + 10) / 8) : 0 }}>{tally.heading ?? `${tally.draws.length} real draws`}</div>
          {tally.draws.slice(0, shown).map((d, j) => {
            const i = top.findIndex((c) => c.text === d);
            const col = i >= 0 ? CHIP_COLORS[i % CHIP_COLORS.length] : GREY;
            const p = spring({ frame: frame - (tallyAt! + j * rate), fps, config: SPRINGS.pop, durationInFrames: 12 });
            const r = targets[`sq:${j}`];
            return <div key={j} style={{ position: 'absolute', left: r.x, top: r.y, width: SQ, height: SQ, borderRadius: 9, background: hexA(col, i >= 0 ? 0.85 : 0.45), transform: `scale(${0.5 + 0.5 * p})`, opacity: Math.min(1, p * 1.6) }} />;
          })}
        </>
      )}
    </Overlay>
  );
};
