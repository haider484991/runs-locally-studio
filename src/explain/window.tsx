/**
 * WINDOW — a chat as a row of squares (1 square = `unit` chips, oldest at the left) and a fixed-size frame (the context window) that
 * covers only the newest `window` chips. What is left of the frame is not read. Everything on screen is derived from ONE number, the
 * chat length L at this frame, so the counters, the squares, the frame and the READ / NOT READ stamp never disagree.
 * Cues:  grow {to, frames?}  the chat grows to `to` chips · windowOn the frame appears · say {text, ok, label?} a reply card
 *        point / focus / zoom with targets  rule · row · old · frame · frame:start · newest · sq:I · count · size · reads · reply
 */
import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, hexA } from '../theme';
import { Overlay, Targets } from './Overlay';
import type { RCue } from './ctx';
import { MONO } from './fonts';

type WindowData = { unit: number; window: number; start: number; rule: string; maxChips: number; caption?: string };

const ease = Easing.inOut(Easing.cubic);
const SQ = 38, PITCH = 46, X0 = 160, ROW_Y = 528, SQ_H = 64;
const IN = '#22D3EE', RULE = '#FBBF24', OUT = '#7C8296', RIGHT = '#34D399', WRONG = '#FB7185';

/** chat length (in chips) at a frame: starts at `start`, every grow cue moves it to `to` over `frames` */
export const lengthAt = (frame: number, start: number, cues: RCue[]): number => {
  let prev = start;
  for (const c of cues.filter((x) => x.do === 'grow')) {
    const n = c.frames ?? 90;
    if (frame < c.at) return prev;
    if (frame < c.at + n) return prev + (c.to - prev) * ease((frame - c.at) / n);
    prev = c.to;
  }
  return prev;
};

export const WindowScene: React.FC<{ data: WindowData; cues: RCue[]; accent: string; dur: number }> = ({ data, cues, accent, dur }) => {
  const frame = useCurrentFrame();
  const { unit, window: W } = data;
  const L = Math.round(lengthAt(frame, data.start, cues));
  const winCue = cues.find((c) => c.do === 'windowOn');
  const winAt = winCue?.at ?? 0;
  const winOn = !!winCue && frame >= winAt;
  const nSq = Math.max(1, Math.ceil(L / unit));
  const maxSq = Math.ceil(data.maxChips / unit);
  const winStart = Math.max(0, L - W);                         // chips before this are not read
  const read = Math.min(L, W);
  const squares = Array.from({ length: nSq }, (_, i) => {
    const filled = Math.min(1, (L - i * unit) / unit);
    const inWin = (i + 1) * unit > winStart;
    return { i, x: X0 + i * PITCH, w: Math.max(18, SQ * filled), inWin };
  });
  const ruleRead = unit > winStart;                            // square 0 holds the rule
  const winX = X0 + (winStart / unit) * PITCH - 8;
  const winW = (W / unit) * PITCH + 10;
  const finalWinStart = Math.max(0, data.maxChips - W);
  const oldSq = Math.max(1, Math.ceil(finalWinStart / unit) - 1);
  const targets: Targets = {
    rule: { x: 160, y: 176, w: 860, h: 84 },
    row: { x: X0 - 10, y: ROW_Y - 14, w: maxSq * PITCH + 10, h: SQ_H + 28 },
    old: { x: X0 - 6, y: ROW_Y - 12, w: oldSq * PITCH + 4, h: SQ_H + 24 },
    frame: { x: X0 + (finalWinStart / unit) * PITCH - 8, y: ROW_Y - 22, w: winW, h: SQ_H + 44 },
    'frame:start': { x: X0 - 8, y: ROW_Y - 22, w: winW, h: SQ_H + 44 },
    newest: { x: X0 + (maxSq - 1) * PITCH - 6, y: ROW_Y - 12, w: SQ + 12, h: SQ_H + 24 },
    count: { x: 160, y: 290, w: 520, h: 130 },
    size: { x: 700, y: 290, w: 520, h: 130 },
    reads: { x: 1240, y: 290, w: 520, h: 130 },
    reply: { x: 160, y: 690, w: 1640, h: 140 },
  };
  for (let i = 0; i < maxSq; i++) targets[`sq:${i}`] = { x: X0 + i * PITCH - 3, y: ROW_Y - 3, w: SQ + 6, h: SQ_H + 6 };
  const say = [...cues].filter((c) => c.do === 'say' && c.at <= frame).pop();
  const fade = (at: number) => interpolate(frame, [at, at + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const stat = (x: number, label: string, value: number, color: string) => (
    <div style={{ position: 'absolute', left: x, top: 290, width: 520 }}>
      <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 92, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{value.toLocaleString('en-US')}</div>
      <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 28, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginTop: 6 }}>{label}</div>
    </div>
  );
  return (
    <Overlay cues={cues} targets={targets} accent={accent} dur={dur}>
      <div style={{ position: 'absolute', left: 160, top: 176, display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ padding: '14px 26px', borderRadius: 18, background: hexA(RULE, 0.16), border: `2.5px solid ${hexA(RULE, 0.9)}`, fontFamily: FONT.body, fontWeight: 600, fontSize: 36, color: C.ink, whiteSpace: 'nowrap' }}>{data.rule}</div>
        {winOn && <div style={{ padding: '10px 22px', borderRadius: 14, fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: '0.06em', color: '#05070F', background: ruleRead ? RIGHT : WRONG }}>{ruleRead ? 'READ' : 'NOT READ'}</div>}
      </div>
      {stat(160, 'chips in the chat', L, C.ink)}
      {winOn && stat(700, 'window size', W, accent)}
      {winOn && stat(1240, 'chips inside the window', read, read < L ? WRONG : RIGHT)}
      <div style={{ position: 'absolute', left: X0, top: ROW_Y - 48, fontFamily: FONT.body, fontWeight: 600, fontSize: 28, color: C.muted }}>oldest</div>
      <div style={{ position: 'absolute', left: X0 + (nSq - 1) * PITCH + SQ - 130, top: ROW_Y + SQ_H + 22, width: 130, textAlign: 'right', fontFamily: FONT.body, fontWeight: 600, fontSize: 28, color: C.muted }}>newest</div>
      <div style={{ position: 'absolute', left: 1800 - 760, top: ROW_Y - 48, width: 760, textAlign: 'right', fontFamily: FONT.body, fontWeight: 600, fontSize: 28, color: C.muted }}>{data.caption ?? `one square = ${unit} chips`}</div>
      {squares.map((s) => {
        const col = s.i === 0 ? RULE : s.inWin || !winOn ? IN : OUT;
        const out = winOn && !s.inWin;
        return (
          <div key={s.i} style={{ position: 'absolute', left: s.x, top: ROW_Y, width: s.w, height: SQ_H, borderRadius: 10, boxSizing: 'border-box', background: hexA(col, out ? 0.08 : 0.28), border: `2.5px ${out ? 'dashed' : 'solid'} ${hexA(col, out ? 0.55 : 0.95)}`, opacity: out ? 0.7 : 1 }} />
        );
      })}
      {winOn && (
        <div style={{ position: 'absolute', left: winX, top: ROW_Y - 22, width: winW, height: SQ_H + 44, borderRadius: 16, boxSizing: 'border-box', border: `4px solid ${hexA(accent, 0.95)}`, background: hexA(accent, 0.06), boxShadow: `0 0 28px ${hexA(accent, 0.3)}`, opacity: fade(winAt) }} />
      )}
      {winOn && winStart > 0 && (
        <div style={{ position: 'absolute', left: X0, top: ROW_Y + SQ_H + 30, width: Math.max(80, winX - X0 - 10), fontFamily: FONT.body, fontWeight: 700, fontSize: 30, color: WRONG, whiteSpace: 'nowrap' }}>fell out of the window</div>
      )}
      {say && (
        <div style={{ position: 'absolute', left: 160, top: 690, width: 1640, minHeight: 130, boxSizing: 'border-box', padding: '20px 32px', borderRadius: 20, background: 'rgba(8,12,26,0.9)', border: `3px solid ${hexA(say.ok ? RIGHT : WRONG, 0.9)}`, opacity: fade(say.at) }}>
          <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 26, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{say.label ?? 'The AI replied (real reply)'}</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 52, color: say.ok ? RIGHT : WRONG, marginTop: 6 }}>{say.text}</div>
        </div>
      )}
    </Overlay>
  );
};

