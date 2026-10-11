import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, hexA } from '../theme';
import { SPRINGS } from '../kit/motion';
import { MONO, NO_LIG } from './fonts';
import { Rect, measure } from './geometry';

/** A chip is one token. The colours only separate neighbours; they carry no meaning. */
export const CHIP_COLORS = ['#A78BFA', '#22D3EE', '#A3E635', '#FB7185', '#FBBF24', '#7DD3FC'];
/** Spaces, newlines and tabs are invisible inside a chip, so they are drawn: · ↵ → */
export const showTok = (t: string) => t.replace(/ /g, '·').replace(/\n/g, '↵').replace(/\t/g, '→');

export type ChipSpec = { text: string; id?: number | string };
export type ChipLayout = { rects: Rect[]; idRects: Rect[]; w: number; h: number };
export type ChipOpts = { font: number; padX: number; h: number; gap: number; idH: number; rowGap?: number; weight?: number };

export const layoutChips = (chips: ChipSpec[], x0: number, y0: number, maxW: number, o: ChipOpts): ChipLayout => {
  const rects: Rect[] = [], idRects: Rect[] = [];
  let x = x0, y = y0, right = x0;
  const pitch = o.h + o.idH + (o.rowGap ?? 18);
  for (const c of chips) {
    const w = Math.max(o.h * 0.7, measure(showTok(c.text), `${o.weight ?? 500} ${o.font}px ${MONO}`) + 2 * o.padX);
    if (x > x0 && x + w > x0 + maxW) { x = x0; y += pitch; }
    rects.push({ x, y, w, h: o.h });
    idRects.push({ x, y: y + o.h + 2, w, h: o.idH });
    x += w + o.gap; right = Math.max(right, x - o.gap);
  }
  return { rects, idRects, w: right - x0, h: chips.length ? y + o.h + o.idH - y0 : 0 };
};

export const ChipView: React.FC<{ spec: ChipSpec; rect: Rect; idRect?: Rect; color: string; appear?: number; font: number; idFont?: number; showId?: boolean; weight?: number }> =
  ({ spec, rect, idRect, color, appear = 0, font, idFont = 24, showId = true, weight = 500 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const p = spring({ frame: frame - appear, fps, config: SPRINGS.pop, durationInFrames: 18 });
    if (frame < appear) return null;
    return (
      <>
        <div style={{
          position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: Math.min(22, rect.h / 3), boxSizing: 'border-box',
          background: hexA(color, 0.2), border: `2.5px solid ${hexA(color, 0.85)}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: MONO, ...NO_LIG, fontWeight: weight, fontSize: font, color: C.ink, whiteSpace: 'pre', opacity: Math.min(1, p * 1.5), transform: `scale(${0.7 + 0.3 * p})`, transformOrigin: '50% 60%',
          boxShadow: `0 0 22px ${hexA(color, 0.18)}`,
        }}>{showTok(spec.text)}</div>
        {showId && idRect && spec.id !== undefined && (
          <div style={{ position: 'absolute', left: idRect.x - 20, top: idRect.y + 2, width: idRect.w + 40, textAlign: 'center', fontFamily: MONO, fontWeight: 500, fontSize: idFont, color: C.muted, opacity: Math.min(1, p * 1.5) }}>{spec.id}</div>
        )}
      </>
    );
  };
