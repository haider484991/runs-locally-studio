/**
 * VOCAB — the fixed box of chips a model can build everything from. A big counter and a grid of REAL vocabulary entries (id + text).
 * Cues:  fill {at} the chips pop in and the counter climbs · point / focus / zoom with targets  count · grid · chip:K
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, FONT } from '../theme';
import { tick } from '../kit/motion';
import { Overlay, Targets } from './Overlay';
import type { RCue } from './ctx';
import { CHIP_COLORS, ChipView } from './chip';
import { MONO } from './fonts';
import { Rect, union } from './geometry';

type VocabData = { size: number; sample: { id: number; text: string }[]; cols?: number; caption?: string; countLabel?: string; sampleNote?: string };

export const VocabScene: React.FC<{ data: VocabData; cues: RCue[]; accent: string; dur: number }> = ({ data, cues, accent, dur }) => {
  const frame = useCurrentFrame();
  const fillAt = cues.find((c) => c.do === 'fill')?.at ?? 10;
  const cols = data.cols ?? 8;
  const CW = 1600 / cols, CH = 118, X0 = 160, Y0 = 392;
  const countAt = cues.find((c) => c.do === 'count')?.at ?? fillAt;                      // the counter can start later than the grid (b06: when the voice says the number)
  const count = Math.round(tick(frame, countAt, 50, 0, data.size));
  // the label of the latest focus cue is shown as a big note beside the counter (a bubble over the grid would hide the neighbours)
  const focuses = cues.filter((c) => c.do === 'focus' && c.at <= frame);
  const lastFocus = focuses[focuses.length - 1];
  const note = lastFocus ? (lastFocus.target ? String(lastFocus.label ?? '') : '') : '';
  const bare = cues.map((c) => (c.do === 'focus' ? { ...c, label: undefined } : c));
  const cells = data.sample.map((s, i) => {
    const cx = X0 + (i % cols) * CW, cy = Y0 + Math.floor(i / cols) * CH;
    return { s, rect: { x: cx + 10, y: cy, w: CW - 20, h: 62 } as Rect, idRect: { x: cx + 10, y: cy + 64, w: CW - 20, h: 30 } as Rect };
  });
  const targets: Targets = {
    count: { x: 160, y: 170, w: 920, h: 170 },
    grid: union(cells.map((c) => ({ x: c.rect.x, y: c.rect.y, w: c.rect.w, h: 94 }))),
    ...Object.fromEntries(cells.map((c, i) => [`chip:${i}`, { x: c.rect.x, y: c.rect.y, w: c.rect.w, h: 94 }])),
  };
  return (
    <Overlay cues={bare} targets={targets} accent={accent} dur={dur}>
      <div style={{ position: 'absolute', left: 160, top: 160, fontFamily: FONT.body, fontWeight: 700, fontSize: 150, lineHeight: 1, color: accent, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{count.toLocaleString('en-US')}</div>
      <div style={{ position: 'absolute', left: 168, top: 316, fontFamily: FONT.body, fontWeight: 600, fontSize: 30, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>{data.countLabel ?? 'different chips in the box'}</div>
      <div style={{ position: 'absolute', left: 1020, top: 196, width: 780, fontFamily: FONT.body, fontWeight: note ? 700 : 500, fontSize: note ? 56 : 34, lineHeight: 1.2, color: note ? accent : C.ink }}>{note || data.caption}</div>
      {data.sampleNote && <div style={{ position: 'absolute', left: 1000, top: 352, width: 760, textAlign: 'right', fontFamily: FONT.body, fontWeight: 600, fontSize: 24, letterSpacing: '0.04em', color: C.muted }}>{data.sampleNote}</div>}
      {cells.map((c, i) => (
        <ChipView key={i} spec={{ text: c.s.text, id: c.s.id }} rect={c.rect} idRect={c.idRect} color={CHIP_COLORS[i % CHIP_COLORS.length]} appear={fillAt + 4 + i * 2} font={30} idFont={24} />
      ))}
    </Overlay>
  );
};
