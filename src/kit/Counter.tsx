/**
 * A number that ticks to its value. Ease-out over 36 frames, tabular digits, optional glow.
 * Set in the mood's display face.
 */
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, glow, useMood } from '../theme';
import { SPRINGS, enterStyle, fmt, tick } from './motion';

export const Counter: React.FC<{
  value: number; decimals?: number; unit?: string; prefix?: string; size?: number; color?: string;
  delay?: number; len?: number; from?: number; lit?: boolean; unitSize?: number; align?: 'left' | 'center' | 'right';
}> = ({ value, decimals = 0, unit, prefix, size = 240, color = C.ink, delay = 0, len = 36, from = 0, lit = false, unitSize, align = 'left' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = useMood().display;
  const p = spring({ frame: frame - delay, fps, config: SPRINGS.pop });
  const v = tick(frame, delay, len, from, value);
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: '0.12em', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
      fontFamily: d.family, fontWeight: d.weight, fontSize: size * d.scale, lineHeight: 1, letterSpacing: d.tracking,
      color, fontVariantNumeric: 'tabular-nums', filter: lit ? glow(color) : undefined, ...enterStyle(p, 30),
    }}>
      {prefix && <span style={{ fontSize: size * 0.5, color: C.muted }}>{prefix}</span>}
      <span>{fmt(v, decimals)}</span>
      {unit && <span style={{ fontSize: unitSize ?? size * 0.32, color: C.muted, fontFamily: FONT.body, fontWeight: 600, letterSpacing: 0 }}>{unit}</span>}
    </div>
  );
};
