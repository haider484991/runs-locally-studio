/**
 * A panel — its shape comes from the mood: `glass` (rounded, translucent), `sharp` (square, solid,
 * accent left rule) or `naked` (no box at all, a hairline underneath). Same geometry, different skin.
 */
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, hexA, useMood } from '../theme';
import { SPRINGS, enterStyle, Preset } from './motion';

export const Panel: React.FC<{
  x: number; y: number; w: number; h: number;
  delay?: number; preset?: Preset; tint?: string; children?: React.ReactNode; pad?: number;
}> = ({ x, y, w, h, delay = 0, preset = 'heavy', tint, children, pad = 40 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { shapes, accent } = useMood();
  const p = spring({ frame: frame - delay, fps, config: SPRINGS[preset] });
  const t = tint ?? accent;
  const skin: React.CSSProperties =
    shapes === 'glass' ? {
      borderRadius: 28, background: `linear-gradient(160deg, ${hexA(t, 0.16)} 0%, ${C.glass} 60%)`,
      border: `1.5px solid ${hexA(t, 0.35)}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 30px 80px rgba(0,0,0,0.45)',
    } : shapes === 'sharp' ? {
      borderRadius: 0, background: 'rgba(6,9,18,0.86)', borderLeft: `8px solid ${t}`, boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px ${hexA(t, 0.25)}`,
    } : {
      borderRadius: 0, background: 'transparent', borderBottom: `2px solid ${hexA(t, 0.55)}`,
    };
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, padding: pad, boxSizing: 'border-box', ...skin, ...enterStyle(p, 56) }}>
      {children}
    </div>
  );
};
/** Back-compat alias. */
export const Glass = Panel;

/** A horizontal fill bar with a track. Grows on a spring. Sharp moods get square ends. */
export const Fill: React.FC<{ frac: number; color: string; w: number; h?: number; delay?: number; track?: boolean }> =
  ({ frac, color, w, h = 18, delay = 0, track = true }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const { shapes } = useMood();
    const p = spring({ frame: frame - delay, fps, config: SPRINGS.land, durationInFrames: 34 });
    const r = shapes === 'glass' ? h : 0;
    return (
      <div style={{ position: 'relative', width: w, height: h, borderRadius: r, background: track ? 'rgba(255,255,255,0.08)' : 'transparent', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: h, width: w * Math.max(0, Math.min(1, frac)) * p, borderRadius: r, background: `linear-gradient(90deg, ${hexA(color, 0.7)}, ${color})`, boxShadow: `0 0 24px ${hexA(color, 0.5)}` }} />
      </div>
    );
  };

/** A vertical column with a track, for the columns variant of bars. */
export const Column: React.FC<{ frac: number; color: string; w: number; h: number; delay?: number }> = ({ frac, color, w, h, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { shapes } = useMood();
  const p = spring({ frame: frame - delay, fps, config: SPRINGS.land, durationInFrames: 38 });
  const r = shapes === 'glass' ? 14 : 0;
  const fill = h * Math.max(0, Math.min(1, frac)) * p;
  return (
    <div style={{ position: 'relative', width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, bottom: 0, width: w, height: fill, borderRadius: r, background: `linear-gradient(0deg, ${hexA(color, 0.7)}, ${color})`, boxShadow: `0 0 30px ${hexA(color, 0.5)}` }} />
    </div>
  );
};
