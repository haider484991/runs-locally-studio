/**
 * BARS — horizontal bars drawn from zero on a labelled axis, so a size is seen as a length. A row may carry a `base` (drawn first) and an
 * `extra` segment on top of it (the part that is new compared with the row above), so a small difference is visible as what it is.
 * data: { unit, max, rows: [{ label, sub?, value, base? }] }   Cues:  row {row:I} the row's bar grows
 *       point / focus / zoom with targets  row:I · bar:I · extra:I · value:I · axis
 */
import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, hexA } from '../theme';
import { Overlay, Targets } from './Overlay';
import type { RCue } from './ctx';

type BarsData = { unit: string; max: number; rows: { label: string; sub?: string; value: number; base?: number }[]; extraLabel?: string };

const ease = Easing.out(Easing.cubic);
const BAR = '#22D3EE', EXTRA = '#FBBF24';
const X0 = 620, W = 1000, Y0 = 300, PITCH = 190, H = 100;

export const BarsScene: React.FC<{ data: BarsData; cues: RCue[]; accent: string; dur: number }> = ({ data, cues, accent, dur }) => {
  const frame = useCurrentFrame();
  const px = (v: number) => (v / data.max) * W;
  const at = (i: number) => cues.find((c) => c.do === 'row' && c.row === i)?.at ?? 20 + i * 90;
  const targets: Targets = { axis: { x: X0 - 10, y: Y0 + data.rows.length * PITCH - 40, w: W + 20, h: 74 } };
  data.rows.forEach((r, i) => {
    const y = Y0 + i * PITCH;
    targets[`row:${i}`] = { x: 160, y: y - 20, w: X0 + W - 160 + 300, h: H + 40 };
    targets[`bar:${i}`] = { x: X0, y, w: px(r.value), h: H };
    targets[`value:${i}`] = { x: X0 + px(r.value) + 14, y, w: 260, h: H };
    targets[`extra:${i}`] = r.base !== undefined ? { x: X0 + px(r.base), y, w: px(r.value - r.base), h: H } : { x: X0, y, w: px(r.value), h: H };
  });
  const ticks = Array.from({ length: Math.floor(data.max) + 1 }, (_, k) => k);
  return (
    <Overlay cues={cues} targets={targets} accent={accent} dur={dur}>
      <div style={{ position: 'absolute', left: X0, top: Y0 - 40, width: W, height: data.rows.length * PITCH + 20, borderLeft: `2px solid ${hexA(C.ink, 0.35)}` }} />
      {ticks.map((t) => (
        <div key={t} style={{ position: 'absolute', left: X0 + px(t) - 60, top: Y0 + data.rows.length * PITCH - 30, width: 120, textAlign: 'center', fontFamily: FONT.body, fontWeight: 600, fontSize: 30, color: C.muted }}>
          <div style={{ position: 'absolute', left: 59, top: -14, width: 2, height: 12, background: hexA(C.ink, 0.35) }} />{t} {data.unit}
        </div>
      ))}
      {data.rows.map((r, i) => {
        const y = Y0 + i * PITCH, a = at(i);
        const g = ease(interpolate(frame, [a, a + 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
        const vis = interpolate(frame, [a - 6, a + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const baseW = px(r.base ?? r.value) * (r.base !== undefined ? Math.min(1, g / 0.55) : g), extraW = r.base !== undefined ? px(r.value - r.base) * Math.max(0, (g - 0.55) / 0.45) : 0;
        const shown = ((baseW + extraW) / W) * data.max;
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: 160, top: y + 6, width: 420, opacity: vis }}>
              <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 42, lineHeight: 1.05, color: C.ink }}>{r.label}</div>
              {r.sub && <div style={{ fontFamily: FONT.body, fontWeight: 500, fontSize: 30, color: C.muted, marginTop: 4 }}>{r.sub}</div>}
            </div>
            <div style={{ position: 'absolute', left: X0, top: y, width: baseW, height: H, borderRadius: 14, background: hexA(BAR, 0.3), border: `3px solid ${hexA(BAR, 0.95)}`, boxSizing: 'border-box', opacity: vis }} />
            {r.base !== undefined && extraW > 0 && (
              <div style={{ position: 'absolute', left: X0 + px(r.base), top: y, width: extraW, height: H, borderRadius: 14, background: hexA(EXTRA, 0.55), border: `3px solid ${hexA(EXTRA, 0.95)}`, boxSizing: 'border-box' }} />
            )}
            <div style={{ position: 'absolute', left: X0 + baseW + extraW + 18, top: y + 12, fontFamily: FONT.body, fontWeight: 700, fontSize: 54, color: C.ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', opacity: vis * (g > 0.1 ? 1 : 0) }}>{shown.toFixed(2)} {data.unit}</div>
          </React.Fragment>
        );
      })}
    </Overlay>
  );
};
