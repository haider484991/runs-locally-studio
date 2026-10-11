/**
 * The spring is the brand. Every entrance is one of these four presets (docs/design.md).
 */
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const SPRINGS = {
  land: { damping: 18, stiffness: 170, mass: 0.9 },
  pop: { damping: 11, stiffness: 220 },
  settle: { damping: 200 },
  heavy: { damping: 16, stiffness: 90, mass: 1.6 },
} as const;
export type Preset = keyof typeof SPRINGS;

/** 0→1 spring starting `delay` frames into the current sequence. */
export const useEnter = (delay = 0, preset: Preset = 'land') => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: SPRINGS[preset] });
};

/** The standard entrance: rise 48 px, scale from 0.94, fade. */
export const enterStyle = (p: number, rise = 48): React.CSSProperties => ({
  opacity: Math.min(1, p * 1.4),
  transform: `translateY(${(1 - p) * rise}px) scale(${0.94 + 0.06 * p})`,
});

/** 0→1 over the last `len` frames of a scene of `dur` frames. Use for exits. */
export const useExit = (dur: number, len = 10) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [dur - len, dur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad),
  });
};

/** The camera push: scale 1.00→1.035 across the whole scene, no bounce. */
export const useCamera = (dur: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, Math.max(1, dur)], [1, 1.035], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
  });
};

/** A counter ticks on an ease-out, never a spring — an overshot number is a wrong number. */
export const tick = (frame: number, start: number, len: number, from: number, to: number) =>
  interpolate(frame, [start, start + len], [from, to], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });

/** Bar / fill growth: an eased ramp with a little spring on the tail. */
export const grow = (frame: number, fps: number, delay: number) =>
  spring({ frame: frame - delay, fps, config: SPRINGS.land, durationInFrames: 34 });

export const fmt = (n: number, decimals = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
