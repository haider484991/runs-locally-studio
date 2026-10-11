/**
 * TRIALS — every real trial as one square: green tick = right, red cross = wrong. A row per model, filled left to right when its cue arrives.
 * Cues:  show {row:I} shows the model's label and empty track · row {row:I} fills row I · point / focus / zoom with targets  prompt · row:I · score:I · sq:I.J
 */
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, hexA } from '../theme';
import { SPRINGS, tick } from '../kit/motion';
import { Overlay, Targets } from './Overlay';
import type { RCue } from './ctx';
import { MONO } from './fonts';

type TrialsData = { prompt: string; rows: { label: string; sub?: string; results: boolean[] }[]; rightColor?: string; wrongColor?: string; unit?: string; legend?: { right: string; wrong: string }; heading?: string; pitch?: number; sq?: number; y0?: number; labelFont?: number; subFont?: number };

export const TrialsScene: React.FC<{ data: TrialsData; cues: RCue[]; accent: string; second: string; dur: number }> = ({ data, cues, accent, second, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const right = data.rightColor ?? '#34D399', wrong = data.wrongColor ?? '#FB7185';
  const SQ = data.sq ?? 44, GAP = 8, SX = 500, Y0 = data.y0 ?? 330, PITCH = data.pitch ?? 150, LF = data.labelFont ?? 44;
  const revealAt = (i: number) => cues.find((c) => c.do === 'row' && c.row === i)?.at ?? 20 + i * 90;
  const showAt = (i: number) => cues.find((c) => c.do === 'show' && c.row === i)?.at ?? revealAt(i) - 8;
  const targets: Targets = { prompt: { x: 160, y: 168, w: 1640, h: 100 }, legend: { x: 160, y: 800, w: 1640, h: 48 } };
  data.rows.forEach((r, i) => {
    const y = Y0 + i * PITCH;
    targets[`row:${i}`] = { x: 160, y: y - 14, w: 1640, h: SQ + 44 };
    targets[`score:${i}`] = { x: SX + r.results.length * (SQ + GAP) + 18, y: y - 14, w: 190, h: SQ + 28 };
    r.results.forEach((_, j) => { targets[`sq:${i}.${j}`] = { x: SX + j * (SQ + GAP), y, w: SQ, h: SQ }; });
  });
  return (
    <Overlay cues={cues} targets={targets} accent={accent} dur={dur}>
      <div style={{ position: 'absolute', left: 160, top: 158, fontFamily: FONT.body, fontWeight: 600, fontSize: 22, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }}>{data.heading ?? `The question, asked ${data.rows[0].results.length} times to each model`}</div>
      {data.legend && (
        <div style={{ position: 'absolute', left: 160, top: 806, display: 'flex', gap: 48, alignItems: 'center', fontFamily: FONT.body, fontWeight: 600, fontSize: 30, color: C.ink, opacity: Math.min(1, Math.max(0, (frame - 10) / 10)) }}>
          <span><b style={{ display: 'inline-block', width: 38, height: 38, lineHeight: '38px', textAlign: 'center', borderRadius: 10, background: hexA(right, 0.9), color: '#05070F', marginRight: 14, fontFamily: MONO }}>✓</b>{data.legend.right}</span>
          <span><b style={{ display: 'inline-block', width: 38, height: 38, lineHeight: '38px', textAlign: 'center', borderRadius: 10, background: hexA(wrong, 0.9), color: '#05070F', marginRight: 14, fontFamily: MONO }}>✕</b>{data.legend.wrong}</span>
        </div>
      )}
      <div style={{ position: 'absolute', left: 160, top: 196, width: 1640, fontFamily: FONT.body, fontWeight: 500, fontSize: 38, lineHeight: 1.25, color: C.ink }}>{data.prompt}</div>
      {data.rows.map((r, i) => {
        const at = revealAt(i), y = Y0 + i * PITCH;
        const n = r.results.length, rightN = r.results.filter(Boolean).length;
        const sAt = showAt(i);
        const doneAt = at + 6 + n * 2;
        const shownScore = Math.round(tick(frame, at + 6, n * 2, 0, rightN));
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: 160, top: y - 8, width: 320, opacity: Math.min(1, Math.max(0, (frame - sAt) / 8)) }}>
              <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: LF, color: C.ink, lineHeight: 1 }}>{r.label}</div>
              {r.sub && <div style={{ fontFamily: FONT.body, fontWeight: 500, fontSize: data.subFont ?? 22, color: C.muted, marginTop: 2 }}>{r.sub}</div>}
            </div>
            <div style={{ position: 'absolute', left: SX - 22, top: y - 14, width: n * (SQ + GAP) + 12, height: SQ + 28, borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)', opacity: frame >= sAt ? 1 : 0 }} />
            {r.results.map((ok, j) => {
              const t = at + 6 + j * 2;
              if (frame < t) return null;
              const p = spring({ frame: frame - t, fps, config: SPRINGS.pop, durationInFrames: 14 });
              const col = ok ? right : wrong;
              return (
                <div key={j} style={{ position: 'absolute', left: SX + j * (SQ + GAP), top: y, width: SQ, height: SQ, borderRadius: 12, background: hexA(col, 0.9), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 700, fontSize: Math.round(SQ * 0.64), color: '#05070F', transform: `scale(${0.5 + 0.5 * p})`, opacity: Math.min(1, p * 1.6) }}>{ok ? '✓' : '✕'}</div>
              );
            })}
            {frame >= at + 6 && (
              <div style={{ position: 'absolute', left: SX + n * (SQ + GAP) + 30, top: y - 8, fontFamily: FONT.body, fontWeight: 700, fontSize: Math.round(SQ * 1.27), color: rightN === n ? right : C.ink, opacity: Math.min(1, (frame - at - 6) / 6), whiteSpace: 'nowrap' }}>{shownScore}<span style={{ color: C.muted, fontSize: Math.round(SQ * 0.82) }}>/{n}</span></div>
            )}
          </React.Fragment>
        );
      })}
    </Overlay>
  );
};


