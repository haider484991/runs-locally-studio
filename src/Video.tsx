/**
 * The data-driven video. Beats → scenes joined by the mood's transition; narration and captions
 * ride on the measured timings. Each visual scene is `beatDur + T` long so, after the T-frame
 * overlap, every scene starts exactly where its narration starts.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { Bg } from './kit/Bg';
import { Captions } from './kit/Captions';
import { Scene } from './scenes';
import { BeatWordsCtx, type BeatWord } from './explain/ctx';
import { transition } from './kit/Transitions';
import { FPS, MoodCtx, resolveMood } from './theme';
import type { Script, Timings, TimedWord } from './types';

export const T = 14;
export const BREATH = 8;
const TAIL = 60;

export type Plan = { beats: { id: string; start: number; dur: number; audio?: string }[]; words: TimedWord[]; total: number };

export const plan = (script: Script, timings: Timings | null, fps = FPS): Plan => {
  let start = 0;
  const words: TimedWord[] = [];
  const beats = script.beats.map((b) => {
    const t = timings?.[b.id];
    const secs = t ? t.durationInSeconds : b.narration.split(/\s+/).length / 2.7;
    const dur = Math.round(secs * fps) + BREATH;
    if (t) for (const w of t.words) words.push({ ...w, start: start / fps + w.start, end: start / fps + w.end, beat: b.id });
    const row = { id: b.id, start, dur, audio: t?.audioSrc };
    start += dur;
    return row;
  });
  return { beats, words, total: start + TAIL };
};

/** Words of one beat in seconds from the beat's start: measured when timings exist, an even 2.7 words/s estimate for previews. */
export const beatWords = (script: Script, timings: Timings | null, i: number): BeatWord[] => {
  const b = script.beats[i], t = timings?.[b.id];
  if (t) return t.words.map((w) => ({ word: w.word, start: w.start, end: w.end }));
  const ws = b.narration.split(/\s+/).filter(Boolean);
  return ws.map((word, k) => ({ word, start: k / 2.7, end: (k + 1) / 2.7 }));
};

export const moodOf = (script: Script) => resolveMood(script.slug, { ...(script.accent ? { palette: script.accent } : {}), ...(script.mood ?? {}) });

export const Video: React.FC<{ script: Script; timings: Timings | null }> = ({ script, timings }) => {
  const mood = useMemo(() => moodOf(script), [script]);
  const p = useMemo(() => plan(script, timings), [script, timings]);
  const n = p.beats.length;
  return (
    <MoodCtx.Provider value={mood}>
      <AbsoluteFill style={{ background: '#05070F' }}>
        <Bg />
        <TransitionSeries>
          {p.beats.map((b, i) => {
            const dur = b.dur + (i < n - 1 ? T : TAIL);
            return (
              <React.Fragment key={b.id}>
                <TransitionSeries.Sequence durationInFrames={dur}>
                  <BeatWordsCtx.Provider value={{ words: beatWords(script, timings, i), fps: FPS }}>
                    <Scene beat={script.beats[i]} accent={mood.accent} second={mood.second} dur={dur} slug={script.slug} index={i} />
                  </BeatWordsCtx.Provider>
                </TransitionSeries.Sequence>
                {i < n - 1 && <TransitionSeries.Transition presentation={transition(mood.transition, { accent: mood.accent })} timing={linearTiming({ durationInFrames: T })} />}
              </React.Fragment>
            );
          })}
        </TransitionSeries>
        {p.beats.map((b) => b.audio ? <Sequence key={`a-${b.id}`} from={b.start} durationInFrames={b.dur}><Audio src={staticFile(b.audio)} /></Sequence> : null)}
        {p.words.length > 0 && <Captions words={p.words} accent={mood.accent} />}
      </AbsoluteFill>
    </MoodCtx.Provider>
  );
};
