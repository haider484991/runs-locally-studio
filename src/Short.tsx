/**
 * THE SHORT — 1080 x 1920, one point, 20-45 s, built from the same measured-timings clock as the long video.
 * Script = content/<slug>/script.json with beats: { id, narration, visual: { type: 'short', headline, sub?, clip?, code?, chips?, end? } }.
 *   clip   — path inside public/ of a real rendered animation (MP4), shown as it was rendered
 *   code   — the real code (verbatim, first lines), shown under the clip
 *   chips  — small facts under the code ("qwen3.5:4b", "22 s", "4 GB laptop")
 *   end    — true on the last beat: a pointer to the long video instead of a clip
 *   tokens — real chips ({text, id}) drawn big and wrapped to the Short's width; hi = index of the chip to light (the others dim); big / note = a number and a line under them
 *   rows   — real trials as squares ({label, results[bool]}), a score counting up per row
 * The bottom ~380 px belong to the Shorts app UI: captions ride above them. Nothing here may claim what the long video does not prove.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MoodCtx, glow, hexA, useMood } from './theme';
import { SPRINGS, enterStyle } from './kit/motion';
import { Words } from './kit/Type';
import { moodOf, plan } from './Video';
import { CHIP_COLORS, showTok } from './explain/chip';
import { MONO as CHIP_MONO, NO_LIG } from './explain/fonts';
import type { Script, Timings, TimedWord } from './types';

const MONO = '"JetBrains Mono", Consolas, "Courier New", monospace';
type ShortVisual = { type: 'short'; headline: string; sub?: string; clip?: string; code?: string; chips?: string[]; end?: boolean;
  tokens?: { text: string; id?: number | string }[]; hi?: number; big?: string; note?: string; rows?: { label: string; results: boolean[] }[] };

const ShortBg: React.FC = () => {
  const { accent, second } = useMood();
  const frame = useCurrentFrame();
  const t = frame / 900;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 30%, #0B1020 0%, #05070F 75%)' }}>
      <div style={{ position: 'absolute', left: 80 + Math.sin(t * Math.PI * 2) * 120, top: 300, width: 800, height: 800, borderRadius: 800, background: hexA(accent, 0.18), filter: 'blur(160px)' }} />
      <div style={{ position: 'absolute', left: 260 + Math.cos(t * Math.PI * 2) * 140, top: 1100, width: 800, height: 800, borderRadius: 800, background: hexA(second, 0.14), filter: 'blur(160px)' }} />
    </AbsoluteFill>
  );
};

const Beat: React.FC<{ v: ShortVisual; dur: number; accent: string; second: string }> = ({ v, dur, accent, second }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = v.code ? v.code.split('\n').slice(0, 10) : [];
  const pClip = spring({ frame: frame - 6, fps, config: SPRINGS.land });
  const fadeOut = interpolate(frame, [dur - 6, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity: frame < 4 ? 1 : fadeOut }}>
      <div style={{ position: 'absolute', left: 80, top: 150, width: 920 }}>
        <Words text={v.headline} size={v.end ? 92 : 80} delay={0} stagger={2} maxWidth={920} />
        {v.sub ? <div style={{ marginTop: 20 }}><Words text={v.sub} size={36} font="body" color={C.muted} delay={10} stagger={1} maxWidth={920} /></div> : null}
      </div>
      {v.clip ? (
        <div style={{ position: 'absolute', left: 60, top: 520, width: 960, height: 540, borderRadius: 28, overflow: 'hidden', border: `2px solid ${hexA(accent, 0.55)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 60px ${hexA(accent, 0.25)}`, background: '#05070F', ...enterStyle(pClip, 40) }}>
          <OffthreadVideo src={staticFile(v.clip)} muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      ) : null}
      {v.tokens && v.tokens.length > 0 && (() => {
        const hiAt = 14 + v.tokens.length * 4 + 8;
        const clampOpt = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
        return (
          <>
            <div style={{ position: 'absolute', left: 60, top: 620, width: 960, display: 'flex', flexWrap: 'wrap', gap: '26px 14px', alignItems: 'flex-start' }}>
              {v.tokens.map((t, i) => {
                const pop = spring({ frame: frame - (6 + i * 4), fps, config: SPRINGS.pop, durationInFrames: 18 });
                const isHi = v.hi === i;
                const dim = v.hi === undefined ? 1 : interpolate(frame, [hiAt, hiAt + 10], [1, isHi ? 1 : 0.25], clampOpt);
                const grow = isHi ? interpolate(frame, [hiAt, hiAt + 10], [1, 1.1], clampOpt) : 1;
                const col = CHIP_COLORS[i % CHIP_COLORS.length];
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: Math.min(1, pop * 1.5) * dim, transform: `scale(${(0.7 + 0.3 * pop) * grow})` }}>
                    <div style={{ height: 80, padding: '0 18px', borderRadius: 22, boxSizing: 'border-box', border: `2.5px solid ${hexA(col, 0.9)}`, background: hexA(col, 0.2), display: 'flex', alignItems: 'center', fontFamily: CHIP_MONO, ...NO_LIG, fontWeight: 500, fontSize: 48, color: C.ink, whiteSpace: 'pre', boxShadow: isHi ? `0 0 40px ${hexA(col, 0.6)}` : `0 0 18px ${hexA(col, 0.18)}` }}>{showTok(t.text)}</div>
                    {t.id !== undefined && <div style={{ marginTop: 6, fontFamily: CHIP_MONO, fontWeight: 500, fontSize: 28, color: isHi ? accent : C.muted }}>{t.id}</div>}
                  </div>
                );
              })}
            </div>
            {v.big ? <div style={{ position: 'absolute', left: 60, top: 960, width: 960, textAlign: 'center', fontFamily: CHIP_MONO, fontWeight: 700, fontSize: 160, lineHeight: 1, color: accent, filter: glow(accent, 24, 0.35), opacity: interpolate(frame, [hiAt + 6, hiAt + 18], [0, 1], clampOpt), transform: `scale(${0.9 + 0.1 * interpolate(frame, [hiAt + 6, hiAt + 18], [0, 1], clampOpt)})` }}>{v.big}</div> : null}
          </>
        );
      })()}
      {v.rows && v.rows.length > 0 && (
        <div style={{ position: 'absolute', left: 60, top: 640, width: 960 }}>
          {v.rows.map((r, i) => {
            const at = 8 + i * 36, n = r.results.length, rightN = r.results.filter(Boolean).length;
            const score = Math.round(interpolate(frame, [at + 4, at + 4 + n * 2], [0, rightN], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
            return (
              <div key={i} style={{ marginBottom: 56, opacity: interpolate(frame, [at - 4, at + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: FONT.body, fontWeight: 700, fontSize: 64, lineHeight: 1.1, color: C.ink }}>
                  <span>{r.label}</span>
                  <span style={{ color: score === n ? '#34D399' : C.ink }}>{score}<span style={{ color: C.muted, fontSize: 40 }}>/{n}</span></span>
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
                  {r.results.map((ok, j) => {
                    const t = at + 4 + j * 2;
                    const p = frame >= t ? spring({ frame: frame - t, fps, config: SPRINGS.pop, durationInFrames: 14 }) : 0;
                    return <div key={j} style={{ width: 41, height: 41, borderRadius: 10, background: hexA(ok ? '#34D399' : '#FB7185', 0.9), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CHIP_MONO, fontWeight: 700, fontSize: 26, color: '#05070F', opacity: Math.min(1, p * 1.6), transform: `scale(${0.5 + 0.5 * p})` }}>{ok ? '✓' : '✕'}</div>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {v.note ? <div style={{ position: 'absolute', left: 60, top: v.rows ? 1235 : 1170, width: 960, textAlign: 'center', fontFamily: FONT.body, fontWeight: 600, fontSize: 36, color: C.muted, opacity: interpolate(frame, [v.rows ? 30 : 60, (v.rows ? 30 : 60) + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{v.note}</div> : null}
      {lines.length > 0 && (
        <div style={{ position: 'absolute', left: 60, top: 1090, width: 960, height: 330, borderRadius: 24, padding: '22px 28px', boxSizing: 'border-box', overflow: 'hidden', background: 'rgba(6,9,18,0.78)', border: `1.5px solid ${hexA(second, 0.4)}`, fontFamily: MONO, fontSize: 25, lineHeight: 1.4, color: C.ink, whiteSpace: 'pre' }}>
          {lines.map((l, i) => {
            const p = interpolate(frame, [14 + i * 2, 18 + i * 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return <div key={i} style={{ opacity: p }}>{l || ' '}</div>;
          })}
        </div>
      )}
      {v.chips && v.chips.length > 0 && (
        <div style={{ position: 'absolute', left: 60, top: v.code ? 1440 : 1100, width: 960, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {v.chips.map((c, i) => <div key={i} style={{ padding: '8px 18px', borderRadius: 999, border: `1.5px solid ${hexA(C.ink, 0.25)}`, fontFamily: FONT.body, fontWeight: 600, fontSize: 28, color: C.ink }}>{c}</div>)}
        </div>
      )}
      {v.end ? <div style={{ position: 'absolute', left: 80, top: 640, width: 920, fontFamily: FONT.body, fontWeight: 600, fontSize: 44, lineHeight: 1.3, color: accent, filter: glow(accent, 24, 0.4) }}>Full walkthrough on the channel</div> : null}
    </AbsoluteFill>
  );
};

const ShortCaptions: React.FC<{ words: TimedWord[]; accent: string }> = ({ words, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cur = words.findIndex((w) => t >= w.start && t < w.end + 0.08);
  if (cur < 0) return null;
  const beatWords = words.filter((w) => w.beat === words[cur].beat);
  const idx = beatWords.indexOf(words[cur]);
  const c0 = Math.floor(idx / 5) * 5;
  const chunk = beatWords.slice(c0, c0 + 5);
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, bottom: 400, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', fontFamily: FONT.body, fontWeight: 700, fontSize: 56, gap: '0 0.3em', textShadow: '0 3px 22px rgba(0,0,0,0.9)' }}>
      {chunk.map((w, i) => <span key={i} style={{ color: w === words[cur] ? accent : t > w.end ? C.ink : C.muted }}>{w.word}</span>)}
    </div>
  );
};

export const Short: React.FC<{ script: Script; timings: Timings | null }> = ({ script, timings }) => {
  const mood = useMemo(() => moodOf(script), [script]);
  const p = useMemo(() => plan(script, timings), [script, timings]);
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  return (
    <MoodCtx.Provider value={mood}>
      <AbsoluteFill style={{ background: '#05070F' }}>
        <ShortBg />
        {p.beats.map((b, i) => {
          const v = script.beats[i].visual as unknown as ShortVisual;
          const dur = b.dur + (i < p.beats.length - 1 ? 0 : 60);
          return <Sequence key={b.id} from={b.start} durationInFrames={dur}><Beat v={v} dur={dur} accent={mood.accent} second={mood.second} /></Sequence>;
        })}
        {p.beats.map((b) => (b.audio ? <Sequence key={`a-${b.id}`} from={b.start} durationInFrames={b.dur}><Audio src={staticFile(b.audio)} /></Sequence> : null))}
        {p.words.length > 0 && <ShortCaptions words={p.words} accent={mood.accent} />}
        <div style={{ position: 'absolute', left: 0, top: 0, height: 8, width: `${(100 * frame) / Math.max(1, durationInFrames)}%`, background: mood.accent, boxShadow: `0 0 20px ${hexA(mood.accent, 0.8)}` }} />
      </AbsoluteFill>
    </MoodCtx.Provider>
  );
};
