/**
 * Kinetic type. Words land one by one on the `land` spring. The display face comes from the mood.
 * `*words*` render in the accent, `_words_` in gold; both may span words and carry punctuation.
 */
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, useMood } from '../theme';
import { SPRINGS, enterStyle } from './motion';

type Tone = 'ink' | 'muted' | 'accent' | 'second' | 'gold';

export const useDisplay = () => useMood().display;

export const Words: React.FC<{
  text: string; size?: number; delay?: number; stagger?: number; color?: string; accent?: string;
  font?: 'display' | 'body'; weight?: number; maxWidth?: number; align?: 'left' | 'center' | 'right'; lineHeight?: number; rise?: number;
}> = ({ text, size = 96, delay = 0, stagger = 3, color = C.ink, accent, font = 'display', weight, maxWidth, align = 'left', lineHeight = 1.06, rise = 48 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mood = useMood();
  const d = mood.display;
  const acc = accent ?? mood.accent;
  const isDisplay = font === 'display';
  const lines = text.split('\n');
  let k = 0;
  return (
    <div style={{
      fontFamily: isDisplay ? d.family : FONT.body,
      fontWeight: weight ?? (isDisplay ? d.weight : 500),
      fontSize: isDisplay ? size * d.scale : size, lineHeight: isDisplay && d.upper ? 0.98 : lineHeight,
      letterSpacing: isDisplay ? d.tracking : 0, textTransform: isDisplay && d.upper ? 'uppercase' : 'none',
      /* body face (Inter) widens hyphens under tnum — "amd-ttm --set" rendered as "amd - ttm - -set",
         which a viewer could copy wrongly. Found on strix-halo-gpu-memory-setup by looking at a still. */
      color, maxWidth, textAlign: align, fontVariantNumeric: isDisplay ? 'tabular-nums' : 'normal',
    }}>
      {lines.map((line, li) => {
        let emph: 'accent' | 'gold' | null = null;
        const tokens = line.split(/\s+/).filter(Boolean).map((raw) => {
          let word = raw, closes = false;
          if (word.startsWith('*')) { emph = 'accent'; word = word.slice(1); }
          else if (word.startsWith('_')) { emph = 'gold'; word = word.slice(1); }
          const m = word.match(/^(.*?)([*_])([^\w*_]*)$/);
          if (m && emph) { word = m[1] + m[3]; closes = true; }
          const c = emph === 'accent' ? acc : emph === 'gold' ? C.gold : color;
          if (closes) emph = null;
          return { word, c };
        });
        return (
          <div key={li} style={{ display: 'flex', flexWrap: 'wrap', gap: '0 0.26em', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
            {tokens.map(({ word, c }, wi) => {
              const i = k++;
              const p = spring({ frame: frame - delay - i * stagger, fps, config: SPRINGS.land });
              return <span key={wi} style={{ display: 'inline-block', color: c, ...enterStyle(p, rise) }}>{word}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
};

/** Uppercase kicker line, tracked. In the mono mood it is the mono face. */
export const Kicker: React.FC<{ text: string; delay?: number; color?: string; size?: number }> = ({ text, delay = 0, color = C.muted, size = 24 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mood = useMood();
  const p = spring({ frame: frame - delay, fps, config: SPRINGS.land });
  return (
    <div style={{
      fontFamily: mood.type === 'mono' ? mood.display.family : FONT.body, fontWeight: 600, fontSize: size,
      letterSpacing: mood.type === 'mono' ? '0.04em' : '0.12em', textTransform: 'uppercase', color, ...enterStyle(p, 24),
    }}>{mood.type === 'mono' ? `// ${text}` : text}</div>
  );
};

export const Source: React.FC<{ text?: string; delay?: number }> = ({ text, delay = 10 }) => {
  if (!text) return null;
  /* width is the SAFE-AREA width, not auto: without it a long source runs straight off the right
     edge of the frame. Found on a770-room-beats-road by looking at a still — no gate sees it. */
  return <div style={{ position: 'absolute', left: 160, bottom: 150, width: 1600 }}><Kicker text={`Source · ${text}`} delay={delay} size={22} /></div>;
};

export const toneColor = (tone: Tone | undefined, accent: string, second: string) =>
  tone === 'accent' ? accent : tone === 'second' ? second : tone === 'gold' ? C.gold : tone === 'muted' ? C.muted : C.ink;
