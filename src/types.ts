import type { AccentName, MoodSpec } from './theme';

export type Movement = 'open' | 'trap' | 'turn' | 'proof' | 'landing';

export type Visual =
  | { type: 'title'; kicker?: string; headline: string; sub?: string; source?: string }
  | { type: 'stat'; label: string; value: number; decimals?: number; unit?: string; prefix?: string; sub?: string; source?: string; tone?: 'accent' | 'second' | 'gold' | 'ink' }
  | { type: 'compare'; headline?: string; left: Side; right: Side; unit?: string; decimals?: number; verdict?: string; source?: string }
  | { type: 'bars'; headline: string; items: BarItem[]; unit?: string; decimals?: number; source?: string }
  | { type: 'formula'; kicker?: string; lhs: string; op: string; rhs: string; result: string; sub?: string; source?: string }
  | { type: 'list'; headline: string; items: string[]; source?: string }
  | { type: 'callout'; text: string; sub?: string; source?: string }
  | { type: 'verdict'; headline: string; sub?: string; source?: string }
  | { type: 'end'; series: string; line: string }
  | { type: 'capture'; src: string; media: 'image' | 'video'; caption: string; source: string; kind: 'measured' | 'documented' | 'illustration'; startFrom?: number; focus?: {x:number;y:number;width:number;height:number} }
  /** A lesson scene: declarative data + cues that name the spoken word that triggers each step (src/explain). */
  | { type: 'explain'; scene: 'chips' | 'code' | 'race' | 'vocab' | 'trials' | 'window' | 'bars' | 'memory' | 'nextword'; title?: string; badge?: string; data: Record<string, unknown>; cues?: { at: number | string; do: string; target?: string | string[] | null; label?: string; [k: string]: unknown }[]; source?: string }
  /** A scene written for one video only — `src/heroes/<slug>.tsx`, registered in src/heroes/index.ts. */
  | { type: 'hero'; props?: Record<string, unknown>; source?: string };

export type Side = { name: string; value: number; note?: string; tone?: 'accent' | 'second' | 'muted' };
export type BarItem = { label: string; value: number; tone?: 'accent' | 'second' | 'muted' | 'gold'; note?: string };

export type Beat = { id: string; movement?: Movement; narration: string; visual: Visual; purpose?: 'hook'|'answer'|'proof'|'demonstration'|'caveat'|'next'; evidenceIds?: string[]; mode?: 'FAST'|'SLOW'; speed?: number };

export type Thumb = { kicker: string; hero: { value: string; label: string }; headline: string; verdict: string };

export type Script = {
  version?: 2;
  format?: 'explainer'|'guide';
  endScreenSeconds?: number;
  slug: string;
  title: string;
  /** Kept for old scripts; `mood.palette` wins when both are present. */
  accent?: AccentName;
  mood?: MoodSpec;
  thumb?: Thumb;
  beats: Beat[];
};

export type Timings = Record<string, { durationInSeconds: number; audioSrc: string; words: { word: string; start: number; end: number }[] }>;
export type TimedWord = { word: string; start: number; end: number; beat: string };

