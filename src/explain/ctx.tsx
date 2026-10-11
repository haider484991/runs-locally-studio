/**
 * EXPLAIN / cue plumbing. A scene never hard-codes a time: every animation step names the WORD that should trigger it
 * ("@strawberry", "@how many", "@r#2", optional frame offset "-4") and is resolved against the measured word timings of
 * its own beat when the frame is rendered. Re-voicing or re-aligning therefore moves every cue by itself.
 */
import React, { createContext, useContext, useMemo } from 'react';

export type BeatWord = { word: string; start: number; end: number };            // seconds from the START of the beat
export const BeatWordsCtx = createContext<{ words: BeatWord[]; fps: number }>({ words: [], fps: 30 });
export const useBeatWords = () => useContext(BeatWordsCtx);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** "@word", "@word#2" (2nd occurrence, -1 = last), "@two words" (a phrase), plus an optional frame offset: "@word-4", "@word+10". */
export function resolveAt(at: number | string, words: BeatWord[], fps: number, where = ''): number {
  if (typeof at === 'number') return at;
  const m = String(at).match(/^@(.+?)(?:#(-?\d+))?(?:([+-]\d+))?$/);
  if (!m) throw new Error(`cue ${where}: cannot read "${at}" (use a frame number or "@word", "@word#2", "@two words", "@word-4")`);
  const phrase = m[1].split(/\s+/).map(norm).filter(Boolean);
  const nth = m[2] ? Number(m[2]) : 1;
  const off = m[3] ? Number(m[3]) : 0;
  const hits: number[] = [];
  for (let i = 0; i + phrase.length <= words.length; i++) {
    if (phrase.every((p, k) => norm(words[i + k].word) === p)) hits.push(i);
  }
  const i = nth > 0 ? hits[nth - 1] : hits[hits.length + nth];
  if (i === undefined) throw new Error(`cue ${where}: "${m[1]}" (occurrence ${nth}) is not in this beat's narration`);
  return Math.max(0, Math.round(words[i].start * fps) + off);
}

export type Cue = { at: number | string; do: string; target?: string | string[] | null; label?: string; [k: string]: any };
export type RCue = Omit<Cue, 'at'> & { at: number };

export const useCues = (cues: Cue[] | undefined, where = ''): RCue[] => {
  const { words, fps } = useBeatWords();
  return useMemo(() => (cues ?? []).map((c, i) => ({ ...c, at: resolveAt(c.at, words, fps, `${where}#${i} (${c.do})`) })).sort((a, b) => a.at - b.at), [cues, words, fps, where]);
};

/** For scripts/check.mjs: resolve every cue of a beat against its words; returns the list of problems instead of throwing. */
export const cueProblems = (cues: Cue[] | undefined, words: BeatWord[], fps = 30): string[] => {
  const out: string[] = [];
  (cues ?? []).forEach((c, i) => { try { resolveAt(c.at, words, fps, `#${i}`); } catch (e: any) { out.push(e.message); } });
  return out;
};
