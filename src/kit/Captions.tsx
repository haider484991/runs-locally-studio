/**
 * Word-highlight captions from the measured timings. Shows the chunk of up to 7 words that
 * contains the current word; the current word is in the accent.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../theme';
import type { TimedWord } from '../types';

export const Captions: React.FC<{ words: TimedWord[]; accent: string }> = ({ words, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cur = words.findIndex((w) => t >= w.start && t < w.end + 0.08);
  if (cur < 0) return null;
  // chunk boundaries: 7 words, aligned to the word's beat
  const beatWords = words.filter((w) => w.beat === words[cur].beat);
  const idxInBeat = beatWords.indexOf(words[cur]);
  const c0 = Math.floor(idxInBeat / 7) * 7;
  const chunk = beatWords.slice(c0, c0 + 7);
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 56, display: 'flex', justifyContent: 'center',
      fontFamily: FONT.body, fontWeight: 600, fontSize: 40, color: C.ink, gap: '0 0.3em',
      textShadow: '0 2px 18px rgba(0,0,0,0.8)',
    }}>
      {chunk.map((w, i) => (
        <span key={i} style={{ color: w === words[cur] ? accent : t > w.end ? C.ink : C.muted }}>{w.word}</span>
      ))}
    </div>
  );
};
