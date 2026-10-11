/**
 * CHIPS — what a language model actually receives. Two modes.
 *  type  you type a sentence; under it the REAL tokenizer's chips regroup after every keystroke (data.prefixes[k] = the chips of the first k+1 characters)
 *  rows  several texts, each already split into its real chips, with the chip count at the right
 * Cues:  type {at} starts typing · header {at} shows the header line (rows mode) · row {row} reveals a row · point / focus / zoom (Overlay) with targets
 *        input, chips, ids, count, chip:J (type mode) · row:I, label:I, count:I, chip:I.J (rows mode)
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, hexA } from '../theme';
import { Overlay, Targets } from './Overlay';
import type { RCue } from './ctx';
import { CHIP_COLORS, ChipView, layoutChips } from './chip';
import { MONO } from './fonts';
import { Rect, union } from './geometry';

type Prefix = { tokens: string[]; ids: number[] };
/** spell: draws the letters of one chip in a dashed "from memory" box under it (an illustration of an explanation, not data). cue `spell` shows it, `mark` lights the letters equal to `mark` one by one. */
type Spell = { chip: number; text: string; mark?: string };
type TypeData = { mode: 'type'; text: string; prefixes: Prefix[]; cps?: number; typed?: boolean; youType?: string; receives?: string; countLabel?: string; showIds?: boolean; legend?: string; spell?: Spell };
type Row = { label: string; sub?: string; subColor?: string; tokens: string[]; ids?: number[]; countLabel?: string };
type RowsData = { mode: 'rows'; header?: string; headerLabel?: string; rows: Row[]; countLabel?: string; showIds?: boolean; chipFont?: number; rowMin?: number; rowGap?: number; revealEvery?: number };

const Label: React.FC<{ x: number; y: number; text: string }> = ({ x, y, text }) => (
  <div style={{ position: 'absolute', left: x, top: y, fontFamily: FONT.body, fontWeight: 600, fontSize: 24, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }}>{text}</div>
);

const one = (n: number, label: string) => (n === 1 ? label.replace(/s$/i, '') : label);   // "1 chip", not "1 chips"
const Count: React.FC<{ rect: Rect; n: number; label: string; color: string; inline?: boolean }> = ({ rect, n, label, color, inline }) => inline ? (
  <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
    <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 72, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
    <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 24, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{one(n, label)}</div>
  </div>
) : (
  <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
    <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 92, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
    <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 26, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginTop: 4 }}>{one(n, label)}</div>
  </div>
);

/** The letters of one chip, drawn OUTSIDE it: a dashed box joined to the chip by a "?" line. Tiles pop in left to right from `at`; from `markAt` every tile equal to `mark` lights up and is numbered 1, 2, 3 ... */
const SPELL = { tile: 50, tileH: 58, gap: 8, pad: 14, badge: 30, top: 56 };
const spellBox = (sp: Spell, chip: Rect, chipsBottom: number): Rect => {
  const w = [...sp.text].length * (SPELL.tile + SPELL.gap) - SPELL.gap + 2 * SPELL.pad;
  return { x: Math.max(160, Math.min(1760 - w, chip.x + chip.w / 2 - w / 2)), y: chipsBottom + SPELL.top, w, h: SPELL.pad + SPELL.tileH + 8 + SPELL.badge + 8 };
};
const SpellView: React.FC<{ sp: Spell; chip: Rect; box: Rect; chipsBottom: number; at: number; markAt: number; accent: string; frame: number }> = ({ sp, chip, box, chipsBottom, at, markAt, accent, frame }) => {
  if (frame < at) return null;
  const letters = [...sp.text];
  const cx = chip.x + chip.w / 2;
  const fade = Math.min(1, (frame - at) / 8);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: fade, pointerEvents: 'none' }}>
        <line x1={cx} y1={chipsBottom + 6} x2={cx} y2={box.y} stroke={hexA(accent, 0.7)} strokeWidth={3} strokeDasharray="8 8" />
        <circle cx={cx} cy={(chipsBottom + box.y) / 2 + 3} r={17} fill="#0B1020" stroke={hexA(accent, 0.8)} strokeWidth={2.5} />
        <text x={cx} y={(chipsBottom + box.y) / 2 + 12} textAnchor="middle" fontFamily={FONT.body} fontWeight={700} fontSize={24} fill={C.ink}>?</text>
        <text x={cx - 30} y={(chipsBottom + box.y) / 2 + 11} textAnchor="end" fontFamily={FONT.body} fontWeight={600} fontSize={24} fill={C.muted}>illustration · from memory?</text>
      </svg>
      <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, boxSizing: 'border-box', borderRadius: 20, border: `2.5px dashed ${hexA(accent, 0.65)}`, background: 'rgba(255,255,255,0.05)', opacity: fade }} />
      {letters.map((ch, k) => {
        const t = at + 6 + k * 3;
        if (frame < t) return null;
        const hit = !!sp.mark && ch.toLowerCase() === sp.mark.toLowerCase();
        const nth = letters.slice(0, k + 1).filter((l) => l.toLowerCase() === (sp.mark ?? '').toLowerCase()).length;
        const lit = hit && frame >= markAt + (nth - 1) * 9;
        const dimmed = frame >= markAt && !lit && !!sp.mark;
        const p = Math.min(1, (frame - t) / 8);
        const x = box.x + SPELL.pad + k * (SPELL.tile + SPELL.gap);
        return (
          <React.Fragment key={k}>
            <div style={{ position: 'absolute', left: x, top: box.y + SPELL.pad, width: SPELL.tile, height: SPELL.tileH, borderRadius: 12, boxSizing: 'border-box', border: `2.5px solid ${lit ? accent : 'rgba(255,255,255,0.28)'}`, background: lit ? hexA(accent, 0.34) : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 38, color: C.ink, opacity: (dimmed ? 0.45 : 1) * p, transform: `scale(${0.8 + 0.2 * p})` }}>{ch}</div>
            {lit && <div style={{ position: 'absolute', left: x, top: box.y + SPELL.pad + SPELL.tileH + 6, width: SPELL.tile, textAlign: 'center', fontFamily: FONT.body, fontWeight: 700, fontSize: 28, color: accent }}>{nth}</div>}
          </React.Fragment>
        );
      })}
    </>
  );
};

export const ChipsScene: React.FC<{ data: TypeData | RowsData; cues: RCue[]; accent: string; second: string; dur: number }> = ({ data, cues, accent, second, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return data.mode === 'type' ? <TypeMode data={data} cues={cues} accent={accent} dur={dur} frame={frame} fps={fps} /> : <RowsMode data={data} cues={cues} accent={accent} dur={dur} frame={frame} fps={fps} />;
};

/* ── type mode ──────────────────────────────────────────────────────────────────────────────── */
const TypeMode: React.FC<{ data: TypeData; cues: RCue[]; accent: string; dur: number; frame: number; fps: number }> = ({ data, cues, accent, dur, frame, fps }) => {
  const cps = data.cps ?? 14;
  const typeAt = cues.find((c) => c.do === 'type')?.at ?? 12;
  const len = data.text.length;
  const n = data.typed ? len : Math.max(0, Math.min(len, Math.floor(((frame - typeAt) * cps) / fps) + (frame >= typeAt ? 1 : 0)));
  const showIds = data.showIds !== false;
  // 40 px chips: the 10 chips of the lesson sentence fit ONE row (a second row pushed the letter box into the source line)
  const opts = { font: 40, padX: 18, h: 92, gap: 12, idH: 38 };
  const X0 = 160, Y0 = 452, MAXW = 1640;
  const finalChips = data.prefixes[len - 1].tokens.map((t, i) => ({ text: t, id: data.prefixes[len - 1].ids[i] }));
  const fin = layoutChips(finalChips, X0, Y0, MAXW, opts);
  const curP = n > 0 ? data.prefixes[n - 1] : null;
  const curChips = curP ? curP.tokens.map((t, i) => ({ text: t, id: curP.ids[i] })) : [];
  const cur = layoutChips(curChips, X0, Y0, MAXW, opts);
  const input: Rect = { x: 160, y: 206, w: 1600, h: 112 };
  const sp = data.spell;
  const chipsBottom = fin.idRects.length ? Math.max(...fin.idRects.map((r) => r.y + r.h)) : Y0 + 130;
  const box = sp ? spellBox(sp, fin.rects[sp.chip], chipsBottom) : null;
  const targets: Targets = {
    input,
    chips: union(fin.rects.length ? [...fin.rects, ...fin.idRects] : [{ x: X0, y: Y0, w: 10, h: 88 }]),
    ids: union(fin.idRects.length ? fin.idRects : [{ x: X0, y: Y0 + 90, w: 10, h: 30 }]),
    count: { x: 1480, y: 314, w: 280, h: 118 },
    ...Object.fromEntries(fin.rects.map((r, i) => [`chip:${i}`, r])),
    ...Object.fromEntries(fin.idRects.map((r, i) => [`id:${i}`, r])),
    // the focus rectangle of the letter box also holds its caption ("illustration · from memory?") and the line to the chip
    ...(box && sp ? { spell: union([box, { x: Math.max(160, fin.rects[sp.chip].x + fin.rects[sp.chip].w / 2 - 350), y: chipsBottom + 8, w: 330, h: 34 }]) } : {}),
  };
  const spellAt = cues.find((c) => c.do === 'spell')?.at ?? Infinity;
  const markAt = cues.find((c) => c.do === 'mark')?.at ?? Infinity;
  // when did chip j first take its CURRENT text? (so a chip that regroups pops again)
  const appearOf = (j: number) => {
    if (data.typed) return -100;
    let k = n;
    while (k > 1 && data.prefixes[k - 2].tokens[j] === data.prefixes[n - 1].tokens[j]) k--;
    return typeAt + ((k - 1) * fps) / cps;
  };
  const caretOn = Math.floor(frame / 15) % 2 === 0 || n < len;
  return (
    <Overlay cues={cues} targets={targets} accent={accent} dur={dur}>
      <Label x={160} y={166} text={data.youType ?? 'You type'} />
      <div style={{ position: 'absolute', left: input.x, top: input.y, width: input.w, height: input.h, boxSizing: 'border-box', borderRadius: 24, background: 'rgba(255,255,255,0.07)', border: `2px solid ${hexA(accent, n > 0 ? 0.8 : 0.35)}`, padding: '0 36px', display: 'flex', alignItems: 'center', fontFamily: FONT.body, fontWeight: 500, fontSize: 50, color: C.ink, whiteSpace: 'pre' }}>
        {data.text.slice(0, n)}
        {!data.typed && <span style={{ display: 'inline-block', width: 4, height: 58, marginLeft: 3, background: accent, opacity: caretOn && frame >= typeAt - 20 ? 1 : 0 }} />}
      </div>
      <Label x={160} y={372} text={data.receives ?? 'What the AI receives'} />
      {data.legend && curChips.length > 0 && <div style={{ position: 'absolute', left: 660, top: 369, fontFamily: FONT.body, fontWeight: 500, fontSize: 26, color: C.muted, whiteSpace: 'nowrap' }}>{data.legend}</div>}
      <Count rect={targets.count} n={curChips.length} label={data.countLabel ?? 'chips'} color={accent} />
      {curChips.map((c, j) => (
        <ChipView key={j} spec={c} rect={cur.rects[j]} idRect={cur.idRects[j]} color={CHIP_COLORS[j % CHIP_COLORS.length]} appear={appearOf(j)} font={opts.font} idFont={28} showId={showIds} />
      ))}
      {sp && box && <SpellView sp={sp} chip={fin.rects[sp.chip]} box={box} chipsBottom={chipsBottom} at={spellAt} markAt={markAt} accent={accent} frame={frame} />}
    </Overlay>
  );
};

/* ── rows mode ──────────────────────────────────────────────────────────────────────────────── */
const RowsMode: React.FC<{ data: RowsData; cues: RCue[]; accent: string; dur: number; frame: number; fps: number }> = ({ data, cues, accent, dur, frame }) => {
  const font = data.chipFont ?? 40;
  const showIds = !!data.showIds;
  const opts = { font, padX: 18, h: font + 40, gap: 12, idH: showIds ? 32 : 0, rowGap: 14 };
  const CX0 = 520, CW = 980;
  const revealAt = (i: number) => cues.find((c) => c.do === 'row' && c.row === i)?.at ?? 10 + i * (data.revealEvery ?? 24);
  const rowMin = data.rowMin ?? 110, rowGapPx = data.rowGap ?? 30;
  const targets: Targets = {};
  const items: { y: number; h: number; rects: Rect[]; idRects: Rect[]; label: Rect; count: Rect }[] = [];
  const headerAt = cues.find((c) => c.do === 'header')?.at ?? (data.header ? 8 : Infinity);
  if (data.header) targets.header = { x: 160, y: 166, w: 1640, h: 110 };
  let y = data.header ? 306 : 190;
  data.rows.forEach((r, i) => {
    const lay = layoutChips(r.tokens.map((t, k) => ({ text: t, id: r.ids?.[k] })), CX0, y, CW, opts);
    const h = Math.max(lay.h, rowMin);
    const label: Rect = { x: 160, y, w: 330, h: Math.max(rowMin, opts.h) };
    const count: Rect = { x: 1520, y, w: 280, h: Math.max(rowMin, opts.h) };
    items.push({ y, h, rects: lay.rects, idRects: lay.idRects, label, count });
    targets[`row:${i}`] = { x: 160, y: y - 12, w: 1660, h: h + 24 };
    targets[`label:${i}`] = label; targets[`count:${i}`] = count;
    lay.rects.forEach((rc, k) => { targets[`chip:${i}.${k}`] = rc; });
    y += h + rowGapPx;
  });
  return (
    <Overlay cues={cues} targets={targets} accent={accent} dur={dur}>
      {data.header && frame >= headerAt && (
        <div style={{ position: 'absolute', left: 160, top: 160, width: 1640, opacity: Math.min(1, (frame - headerAt) / 8) }}>
          <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 22, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }}>{data.headerLabel ?? 'The text'}</div>
          <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 56, color: C.ink, marginTop: 8 }}>{data.header}</div>
        </div>
      )}
      {data.rows.map((r, i) => {
        const it = items[i], at = revealAt(i);
        if (frame < at) return null;
        const countN = Math.max(0, Math.min(r.tokens.length, Math.floor((frame - at - 4) / 2) + 1));   // = the chips on screen, so the number never lags the voice
        const op = Math.min(1, (frame - at) / 8);
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: it.label.x, top: it.label.y, width: it.label.w, height: it.label.h, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: op }}>
              <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 42, color: C.ink, lineHeight: 1.1 }}>{r.label}</div>
              {r.sub && <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 30, color: r.subColor ?? C.muted, marginTop: 6 }}>{r.sub}</div>}
            </div>
            {r.tokens.map((t, k) => (
              <ChipView key={k} spec={{ text: t, id: r.ids?.[k] }} rect={it.rects[k]} idRect={it.idRects[k]} color={CHIP_COLORS[k % CHIP_COLORS.length]} appear={at + 4 + k * 2} font={font} showId={showIds} />
            ))}
            <Count rect={it.count} n={countN} label={r.countLabel ?? data.countLabel ?? 'chips'} color={accent} inline />
          </React.Fragment>
        );
      })}
    </Overlay>
  );
};
