/**
 * THE POINTING LAYER. Everything that tells the viewer where to look, driven by cues that name a spoken word:
 *   point  {target, click?, anchor?}   a cursor glides to the target and arrives ON the word; a click ripples
 *   focus  {target|[targets]|null, label?, pad?}   the rest of the frame dims, the target stays bright, a label says what it is
 *   zoom   {target|null, scale?}       the camera pushes in on the target (null = back out)
 * `targets` is the scene's own geometry (it knows where it drew things), so a cue can say "chip:8" or "line:3:11-24".
 * The cursor is an annotation pointer (it is drawn here, it did not click anything), the scenes label replays as replays.
 */
import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, hexA } from '../theme';
import type { RCue } from './ctx';
import { Rect, center, pad as padRect, union } from './geometry';

const ease = Easing.inOut(Easing.cubic);
const c01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });

export type Targets = Record<string, Rect>;
const rectOf = (targets: Targets, t: string | string[], where: string): Rect => {
  const names = Array.isArray(t) ? t : [t];
  const rs = names.map((n) => {
    const r = targets[n];
    if (!r) throw new Error(`explain: unknown target "${n}" in ${where}. Known: ${Object.keys(targets).slice(0, 60).join(', ')}`);
    return r;
  });
  return rs.length === 1 ? rs[0] : union(rs);
};

/* ── camera ───────────────────────────────────────────────────────────────────────────────────── */
const cameraAt = (frame: number, cues: RCue[], targets: Targets) => {
  type S = { s: number; cx: number; cy: number };
  let prev: S = { s: 1, cx: 960, cy: 540 }, cur: S = prev;
  for (const c of cues.filter((x) => x.do === 'zoom')) {
    if (frame < c.at) break;
    const to: S = c.target ? { s: c.scale ?? 1.35, ...(() => { const k = center(rectOf(targets, c.target!, 'zoom')); return { cx: k.x, cy: k.y }; })() } : { s: 1, cx: prev.cx, cy: prev.cy };
    const p = ease(c01((frame - c.at) / 26));
    cur = { s: lerp(prev.s, to.s, p), cx: lerp(prev.cx, to.cx, p), cy: lerp(prev.cy, to.cy, p) };
    if (p >= 1) prev = to;
  }
  return cur;
};

/* ── cursor ───────────────────────────────────────────────────────────────────────────────────── */
type KF = { arrive: number; x: number; y: number; click: boolean };
const travelFrames = (d: number) => Math.max(14, Math.min(40, Math.round(d / 18) + 12));

const Cursor: React.FC<{ cues: RCue[]; targets: Targets; frame: number; dur: number; accent: string }> = ({ cues, targets, frame, dur, accent }) => {
  const kfs: KF[] = cues.filter((c) => c.do === 'point').map((c) => {
    const r = rectOf(targets, c.target!, 'point');
    const a = (c.anchor as [number, number] | undefined) ?? [0.5, 0.62];
    return { arrive: c.at, x: r.x + r.w * a[0], y: r.y + r.h * a[1], click: !!c.click };
  });
  if (!kfs.length) return null;
  const enter = { x: kfs[0].x + 280, y: kfs[0].y + 210 };
  const start = (i: number) => {
    const from = i === 0 ? enter : kfs[i - 1];
    const d = Math.hypot(kfs[i].x - from.x, kfs[i].y - from.y);
    const t = travelFrames(d);
    return i === 0 ? kfs[0].arrive - t : Math.max(kfs[i - 1].arrive + 6, kfs[i].arrive - t);
  };
  let x = kfs[kfs.length - 1].x, y = kfs[kfs.length - 1].y, opacity = 1;
  for (let i = 0; i < kfs.length; i++) {
    if (frame < kfs[i].arrive) {
      const from = i === 0 ? enter : kfs[i - 1];
      const s = start(i);
      if (i === 0) opacity = interpolate(frame, [s - 6, s + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      const p = ease(c01((frame - s) / Math.max(1, kfs[i].arrive - s)));
      const dx = kfs[i].x - from.x, dy = kfs[i].y - from.y, dist = Math.hypot(dx, dy) || 1;
      const bend = 0.1 * dist * (dx >= 0 ? -1 : 1);
      const mx = (from.x + kfs[i].x) / 2 + (-dy / dist) * bend, my = (from.y + kfs[i].y) / 2 + (dx / dist) * bend;
      const q = 1 - p;
      x = q * q * from.x + 2 * q * p * mx + p * p * kfs[i].x;
      y = q * q * from.y + 2 * q * p * my + p * p * kfs[i].y;
      break;
    }
  }
  opacity *= interpolate(frame, [dur - 12, dur - 3], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // clicks: a ring grows from the arrival point, the arrow dips
  let dip = 1; const rings: { x: number; y: number; age: number }[] = [];
  for (const k of kfs) {
    const age = frame - k.arrive;
    if (k.click && age >= 0 && age <= 20) { rings.push({ x: k.x, y: k.y, age }); if (age <= 7) dip = 1 - 0.14 * Math.sin((age / 7) * Math.PI); }
  }
  return (
    <>
      {rings.map((r, i) => (
        <div key={i} style={{ position: 'absolute', left: r.x - (14 + r.age * 3.4), top: r.y - (14 + r.age * 3.4), width: 2 * (14 + r.age * 3.4), height: 2 * (14 + r.age * 3.4), borderRadius: '50%', border: `4px solid ${accent}`, opacity: 1 - r.age / 20 }} />
      ))}
      <svg width={46} height={46} viewBox="0 0 24 24" style={{ position: 'absolute', left: x - 3 * (46 / 24), top: y - 2 * (46 / 24), opacity, transform: `scale(${dip})`, transformOrigin: `${3 * (46 / 24)}px ${2 * (46 / 24)}px`, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.55))' }}>
        <path d="M3 2 L3 19 L7.6 14.8 L11 22 L14.2 20.6 L10.9 13.5 L17.5 13.2 Z" fill="#FFFFFF" stroke="#05070F" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </>
  );
};

/* ── spotlight + label ────────────────────────────────────────────────────────────────────────── */
type F = { at: number; rect: Rect | null; label?: string; pad: number; side?: 'right' | 'above' | 'below' };
const Spotlight: React.FC<{ cues: RCue[]; targets: Targets; frame: number; accent: string }> = ({ cues, targets, frame, accent }) => {
  const fs: F[] = cues.filter((c) => c.do === 'focus').map((c) => ({
    at: c.at, rect: c.target ? padRect(rectOf(targets, c.target as string | string[], 'focus'), c.pad ?? 14) : null, label: c.label as string | undefined, pad: c.pad ?? 14, side: c.side as F['side'],
  }));
  let i = -1;
  for (let k = 0; k < fs.length; k++) if (frame >= fs[k].at) i = k;
  if (i < 0) return null;
  const cur = fs[i], prev = i > 0 ? fs[i - 1] : null;
  const t = ease(c01((frame - cur.at) / 14));
  let rect: Rect | null, alpha: number;
  if (cur.rect) { rect = prev?.rect ? lerpRect(prev.rect, cur.rect, t) : cur.rect; alpha = prev?.rect ? 1 : t; }
  else { rect = prev?.rect ?? null; alpha = prev?.rect ? 1 - t : 0; }
  if (!rect || alpha <= 0.01) return null;
  const labelT = cur.label && cur.rect ? ease(c01((frame - cur.at - 6) / 12)) : 0;
  const right = cur.side === 'right' && rect.x + rect.w + 24 + 340 <= 1800;      // side: 'right' puts the bubble beside the target (rows)
  const below = cur.side === 'below' ? true : cur.side === 'above' ? false : rect.y + rect.h < 790;
  return (
    <>
      <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: 18, boxShadow: `0 0 0 6000px rgba(5,7,15,${0.64 * alpha})`, border: `3px solid ${hexA(accent, 0.95 * alpha)}`, filter: `drop-shadow(0 0 18px ${hexA(accent, 0.45 * alpha)})` }} />
      {cur.label && cur.rect && (
        <div style={{
          position: 'absolute', ...(right ? { left: rect.x + rect.w + 24 + (1 - labelT) * 14, top: rect.y + rect.h / 2 - 34, maxWidth: 1800 - (rect.x + rect.w + 24), whiteSpace: 'nowrap' as const }
            : { left: Math.max(120, Math.min(1800 - 760, rect.x)), maxWidth: 760, ...(below ? { top: rect.y + rect.h + 20 + (1 - labelT) * 14 } : { bottom: 1080 - (rect.y - 20) + (1 - labelT) * 14 }) }),
          opacity: labelT, padding: '12px 24px', borderRadius: 16, background: 'rgba(8,12,26,0.94)', border: `1.5px solid ${hexA(accent, 0.7)}`,
          fontFamily: FONT.body, fontWeight: 600, fontSize: 36, color: C.ink, boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
        }}>{cur.label}</div>
      )}
    </>
  );
};

/** Wraps a scene's content: camera zoom → content → spotlight → cursor. Targets are in the 1920x1080 canvas. */
export const Overlay: React.FC<{ cues: RCue[]; targets: Targets; accent: string; dur: number; children: React.ReactNode }> = ({ cues, targets, accent, dur, children }) => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, cues, targets);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${cam.cx}px, ${cam.cy}px) scale(${cam.s}) translate(${-cam.cx}px, ${-cam.cy}px)` }}>
      {children}
      <Spotlight cues={cues} targets={targets} frame={frame} accent={accent} />
      <Cursor cues={cues} targets={targets} frame={frame} dur={dur} accent={accent} />
    </div>
  );
};
