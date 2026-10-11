/**
 * The theme — see docs/design.md. Fixed tokens, plus a MOOD per video: six dials that change together
 * so two videos from the same system never look like the same template.
 */
import React from 'react';
import { loadFont as loadGrotesk } from '@remotion/google-fonts/SpaceGrotesk';
import { loadFont as loadSerif } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as loadCondensed } from '@remotion/google-fonts/BebasNeue';
import { loadFont as loadBody } from '@remotion/google-fonts/Inter';

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const SAFE = { x0: 160, x1: 1760, y0: 120, y1: 960 };

export const C = {
  bg0: '#05070F',
  bg1: '#0B1020',
  ink: '#F5F7FF',
  muted: '#8B93A7',
  glass: 'rgba(255,255,255,0.06)',
  edge: 'rgba(255,255,255,0.14)',
  gold: '#FBBF24',
};

export type AccentName = 'cyan' | 'coral' | 'lime' | 'violet' | 'ember' | 'ice';
export const ACCENTS: Record<AccentName, { accent: string; second: string; bg1?: string }> = {
  cyan: { accent: '#22D3EE', second: '#FB7185' },
  coral: { accent: '#FB7185', second: '#22D3EE' },
  lime: { accent: '#A3E635', second: '#A78BFA' },
  violet: { accent: '#A78BFA', second: '#34D399', bg1: '#100B24' },
  ember: { accent: '#FB923C', second: '#38BDF8', bg1: '#1A0E0A' },
  ice: { accent: '#7DD3FC', second: '#F472B6', bg1: '#08131F' },
};

/* ── the six dials ─────────────────────────────────────────────────────────── */
export type Backdrop = 'nebula' | 'grid' | 'aurora' | 'dust';
export type TypeVoice = 'grotesk' | 'serif' | 'mono' | 'condensed';
export type TransitionName = 'sweep' | 'iris' | 'blinds' | 'slice';
export type Shapes = 'glass' | 'sharp' | 'naked';
export type Texture = 'grain' | 'scanlines' | 'none';

export type MoodSpec = Partial<{
  palette: AccentName; backdrop: Backdrop; type: TypeVoice; transition: TransitionName; shapes: Shapes; texture: Texture;
}>;
export type Mood = Required<MoodSpec> & {
  seed: number; accent: string; second: string; bg1: string;
  display: { family: string; scale: number; tracking: string; weight: number; upper: boolean };
};

const grotesk = loadGrotesk('normal', { weights: ['700'], subsets: ['latin'] });
const serif = loadSerif('normal', { weights: ['700'], subsets: ['latin'] });
const mono = loadMono('normal', { weights: ['700'], subsets: ['latin'] });
const condensed = loadCondensed('normal', { weights: ['400'], subsets: ['latin'] });
const body = loadBody('normal', { weights: ['500', '600'], subsets: ['latin'] });

export const FONT = {
  body: body.fontFamily,
  ready: () => Promise.all([grotesk.waitUntilDone(), serif.waitUntilDone(), mono.waitUntilDone(), condensed.waitUntilDone(), body.waitUntilDone()]),
};

const DISPLAY: Record<TypeVoice, Mood['display']> = {
  grotesk: { family: grotesk.fontFamily, scale: 1, tracking: '-0.02em', weight: 700, upper: false },
  serif: { family: serif.fontFamily, scale: 0.98, tracking: '-0.015em', weight: 700, upper: false },
  mono: { family: mono.fontFamily, scale: 0.8, tracking: '-0.04em', weight: 700, upper: false },
  condensed: { family: condensed.fontFamily, scale: 1.22, tracking: '0.01em', weight: 400, upper: true },
};

/** FNV-1a — a stable number from the slug, so an undeclared mood is still a *specific* mood. */
export const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
};
const pick = <T,>(arr: readonly T[], n: number) => arr[n % arr.length];

export const resolveMood = (slug: string, spec: MoodSpec = {}): Mood => {
  const seed = hash(slug);
  const palette = spec.palette ?? pick(['cyan', 'coral', 'lime', 'violet', 'ember', 'ice'] as const, seed);
  const type = spec.type ?? pick(['grotesk', 'serif', 'mono', 'condensed'] as const, seed >> 3);
  const p = ACCENTS[palette];
  return {
    palette, type,
    backdrop: spec.backdrop ?? pick(['nebula', 'grid', 'aurora', 'dust'] as const, seed >> 6),
    transition: spec.transition ?? pick(['sweep', 'iris', 'blinds', 'slice'] as const, seed >> 9),
    shapes: spec.shapes ?? pick(['glass', 'sharp', 'naked'] as const, seed >> 12),
    texture: spec.texture ?? pick(['grain', 'scanlines', 'none'] as const, seed >> 15),
    seed, accent: p.accent, second: p.second, bg1: p.bg1 ?? C.bg1, display: DISPLAY[type],
  };
};

export const MoodCtx = React.createContext<Mood>(resolveMood('default'));
export const useMood = () => React.useContext(MoodCtx);

export const glow = (color: string, px = 40, a = 0.55) => `drop-shadow(0 0 ${px}px ${hexA(color, a)})`;
export const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};
