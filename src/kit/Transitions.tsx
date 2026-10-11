/**
 * Four transitions, one per mood: THE SWEEP (diagonal band), THE IRIS (a lit circle opens),
 * THE BLINDS (six vertical strips), THE SLICE (the frame splits and the halves slide apart).
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions';
import { hexA, W } from '../theme';
import type { TransitionName } from '../theme';

type P = { accent: string };
type Props = TransitionPresentationComponentProps<P>;

const Sweep: React.FC<Props> = ({ children, presentationDirection, presentationProgress: p, passedProps }) => {
  const entering = presentationDirection === 'entering';
  const S = 18, edge = -S + p * (100 + S * 2);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={entering ? { clipPath: `polygon(0 0, ${edge}% 0, ${edge - S}% 100%, 0 100%)` } : undefined}>{children}</AbsoluteFill>
      {entering && p > 0 && p < 1 && (
        <>
          <AbsoluteFill style={{ clipPath: `polygon(${edge}% 0, ${edge + 4}% 0, ${edge + 4 - S}% 100%, ${edge - S}% 100%)`, background: passedProps.accent, filter: 'blur(2px)' }} />
          <AbsoluteFill style={{ clipPath: `polygon(${edge - 1}% 0, ${edge + 9}% 0, ${edge + 9 - S}% 100%, ${edge - 1 - S}% 100%)`, background: `linear-gradient(90deg, ${hexA(passedProps.accent, 0)}, ${hexA(passedProps.accent, 0.55)})`, filter: 'blur(28px)' }} />
        </>
      )}
    </AbsoluteFill>
  );
};

const Iris: React.FC<Props> = ({ children, presentationDirection, presentationProgress: p, passedProps }) => {
  const entering = presentationDirection === 'entering';
  const r = p * 78; // percent of the diagonal — 78 covers the corners
  const px = (r / 100) * Math.hypot(W, 1080);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={entering ? { clipPath: `circle(${r}% at 50% 50%)` } : undefined}>{children}</AbsoluteFill>
      {entering && p > 0 && p < 1 && (
        <div style={{ position: 'absolute', left: W / 2 - px, top: 540 - px, width: px * 2, height: px * 2, borderRadius: px * 2, border: `10px solid ${passedProps.accent}`, boxShadow: `0 0 60px ${hexA(passedProps.accent, 0.8)}, inset 0 0 60px ${hexA(passedProps.accent, 0.5)}`, boxSizing: 'border-box' }} />
      )}
    </AbsoluteFill>
  );
};

/**
 * ⚠ ONE CLIP PER STRIP, NEVER ONE POLYGON FOR ALL SIX.
 * This was first written as a single `polygon()` holding all six rectangles' corners in sequence.
 * A CSS polygon is ONE closed path, so those corners zig-zag into a self-intersecting comb that
 * never covers the frame — not even at progress 1. Every scene of `newer-and-narrower` rendered
 * with wedges bitten out of it, and no gate caught it because the marks were all present in the
 * DOM; only a still showed the holes. Six wrappers, each with its own `inset()`, tile exactly.
 */
const Blinds: React.FC<Props> = ({ children, presentationDirection, presentationProgress: p, passedProps }) => {
  const entering = presentationDirection === 'entering';
  if (!entering) return <AbsoluteFill>{children}</AbsoluteFill>;
  const N = 6, sw = 100 / N;
  const widths = Array.from({ length: N }, (_, i) => sw * Math.min(1, Math.max(0, p * 1.35 - i * 0.07)));
  return (
    <AbsoluteFill>
      {widths.map((w, i) => (
        <AbsoluteFill key={i} style={{ clipPath: `inset(0 ${100 - (i * sw + w)}% 0 ${i * sw}%)` }}>{children}</AbsoluteFill>
      ))}
      {p > 0 && p < 1 && widths.map((w, i) => (w < sw - 0.001 ? (
        <div key={`e${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${i * sw + w}% - 3px)`, width: 6, background: passedProps.accent, boxShadow: `0 0 24px ${hexA(passedProps.accent, 0.9)}` }} />
      ) : null))}
    </AbsoluteFill>
  );
};

const Slice: React.FC<Props> = ({ children, presentationDirection, presentationProgress: p, passedProps }) => {
  const entering = presentationDirection === 'entering';
  if (!entering) return <AbsoluteFill>{children}</AbsoluteFill>;
  const ease = 1 - Math.pow(1 - p, 3);
  const dx = (1 - ease) * W;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: 'inset(0 0 50% 0)', transform: `translateX(${-dx}px)` }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: 'inset(50% 0 0 0)', transform: `translateX(${dx}px)` }}>{children}</AbsoluteFill>
      {p > 0 && p < 1 && <div style={{ position: 'absolute', left: 0, right: 0, top: 538, height: 4, background: passedProps.accent, boxShadow: `0 0 30px ${hexA(passedProps.accent, 0.9)}`, opacity: 1 - ease }} />}
    </AbsoluteFill>
  );
};

const COMPONENTS: Record<TransitionName, React.FC<Props>> = { sweep: Sweep, iris: Iris, blinds: Blinds, slice: Slice };

export const transition = (name: TransitionName, props: P): TransitionPresentation<P> => ({ component: COMPONENTS[name], props });
