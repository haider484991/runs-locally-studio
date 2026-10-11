/**
 * RACE — the same prompt streamed by several models, REPLAYED from the captured stream: every chip appears at the moment its real chunk
 * arrived (data.lanes[i].chunks[k] = {t seconds since the request, text}). Real time, no speed-up unless data.speed says so.
 * The chips flow like text (browser line-wrapping), hidden until their moment so nothing jumps.
 * Cues:  start {at} the clock starts · point / focus / zoom with targets  lane:I · text:I · rate:I · prompt · timer
 */
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, hexA } from '../theme';
import { SPRINGS } from '../kit/motion';
import { Overlay, Targets } from './Overlay';
import type { RCue } from './ctx';
import { CHIP_COLORS } from './chip';
import { MONO } from './fonts';
import { measure } from './geometry';

type Lane = { label: string; sub?: string; chunks: { t: number; text: string }[]; tokensPerSecond: number; seconds: number };
type RaceData = { prompt: string; lanes: Lane[]; speed?: number; rateLabel?: string; countLabel?: string; note?: string };

const shown = (t: string) => t.replace(/^ +/, '').replace(/\n/g, '↵');

export const RaceScene: React.FC<{ data: RaceData; cues: RCue[]; accent: string; second: string; dur: number }> = ({ data, cues, accent, second, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const startAt = cues.find((c) => c.do === 'start')?.at ?? 20;
  const speed = data.speed ?? 1;
  const tReal = Math.max(0, ((frame - startAt) / fps) * speed);
  const LANE_H = 190, Y0 = 262, GAP = 12, TX = 450, TW = 1040;
  const CHIP = { font: 23, padX: 9, h: 34, gap: 6, line: 40 };            // line pitch = chip height + gap
  const VISIBLE = Math.floor((LANE_H - 28) / CHIP.line);                   // whole lines that fit in a lane; older lines scroll up, no line is ever cut
  const targets: Targets = { prompt: { x: 160, y: 168, w: 1230, h: 62 }, timer: { x: 1330, y: 160, w: 470, h: 98 } };
  const maxSecs = Math.max(...data.lanes.map((l) => l.seconds));
  return (
    <Overlay cues={cues} targets={targets} accent={accent} dur={dur}>
      <div style={{ position: 'absolute', left: 160, top: 158, fontFamily: FONT.body, fontWeight: 600, fontSize: 22, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }}>Same prompt to every model</div>
      <div style={{ position: 'absolute', left: 160, top: 188, width: 1300, fontFamily: FONT.body, fontWeight: 500, fontSize: 34, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.prompt}</div>
      <div style={{ position: 'absolute', left: 1540, top: 168, width: 260, textAlign: 'right', fontFamily: MONO, fontWeight: 700, fontSize: 56, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{Math.min(tReal, maxSecs).toFixed(1)}<span style={{ fontSize: 28, color: C.muted }}> s</span></div>
      {data.note && <div style={{ position: 'absolute', left: 160, top: 233, width: 1040, fontFamily: FONT.body, fontWeight: 500, fontSize: 21, color: C.muted }}>{data.note}</div>}
      <div style={{ position: 'absolute', left: 1230, top: 226, width: 570, textAlign: 'right', fontFamily: FONT.body, fontWeight: 600, fontSize: 20, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>stopwatch: seconds since the request</div>
      {data.lanes.map((ln, i) => {
        const y = Y0 + i * (LANE_H + GAP);
        targets[`lane:${i}`] = { x: 160, y, w: 1640, h: LANE_H };
        targets[`text:${i}`] = { x: TX, y: y + 8, w: TW, h: LANE_H - 16 };
        targets[`rate:${i}`] = { x: 1530, y: y + 8, w: 270, h: LANE_H - 16 };
        const n = ln.chunks.filter((c) => c.t <= tReal).length;
        const done = tReal >= ln.chunks[ln.chunks.length - 1].t;
        // line breaks are computed here (measured text), so the scroll agrees with what is drawn
        let lx = 0, line = 0;
        const pos = ln.chunks.map((c) => { const w = measure(shown(c.text), `500 ${CHIP.font}px ${FONT.body}`) + 2 * CHIP.padX + 3; if (lx > 0 && lx + w > TW) { line++; lx = 0; } const q = { x: lx, line, w }; lx += w + CHIP.gap; return q; });
        const starts: number[] = [];
        pos.forEach((q, k) => { if (starts[q.line] === undefined) starts[q.line] = startAt + (ln.chunks[k].t / speed) * fps; });
        let scrollLines = 0;
        for (let L = VISIBLE; L < starts.length; L++) scrollLines += Math.max(0, Math.min(1, (frame - starts[L]) / 8));
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: 160, top: y, width: 1640, height: LANE_H, borderRadius: 24, background: 'rgba(255,255,255,0.045)', border: `1.5px solid ${hexA(done ? second : accent, done ? 0.55 : 0.25)}` }} />
            <div style={{ position: 'absolute', left: 190, top: y, width: 240, height: LANE_H, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 52, color: C.ink, lineHeight: 1.05 }}>{ln.label}</div>
              {ln.sub && <div style={{ fontFamily: FONT.body, fontWeight: 500, fontSize: 24, color: C.muted, marginTop: 6 }}>{ln.sub}</div>}
              {done && <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 26, color: second, marginTop: 8 }}>done in {ln.seconds.toFixed(1)} s</div>}
            </div>
            <div style={{ position: 'absolute', left: TX, top: y + 14, width: TW, height: LANE_H - 28, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, transform: `translateY(${-scrollLines * CHIP.line}px)` }}>
                {ln.chunks.map((c, k) => {
                  const at = startAt + (c.t / speed) * fps;
                  const p = frame >= at ? spring({ frame: frame - at, fps, config: SPRINGS.pop, durationInFrames: 14 }) : 0;
                  const col = CHIP_COLORS[k % CHIP_COLORS.length];
                  return (
                    <span key={k} style={{ position: 'absolute', left: pos[k].x, top: pos[k].line * CHIP.line, width: pos[k].w, textAlign: 'center', visibility: frame >= at ? 'visible' : 'hidden', height: CHIP.h, lineHeight: '30px', borderRadius: 9, boxSizing: 'border-box', background: hexA(col, 0.2), border: `1.5px solid ${hexA(col, 0.85)}`, fontFamily: FONT.body, fontWeight: 500, fontSize: CHIP.font, color: C.ink, whiteSpace: 'pre', opacity: Math.min(1, p * 1.5), transform: `scale(${0.7 + 0.3 * p})` }}>{shown(c.text)}</span>
                  );
                })}
              </div>
            </div>
            <div style={{ position: 'absolute', left: 1530, top: y, width: 250, height: LANE_H, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: done ? 88 : 80, lineHeight: 1, color: done ? second : C.ink, fontVariantNumeric: 'tabular-nums' }}>{done ? ln.tokensPerSecond.toFixed(1) : n}</div>
              <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 24, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginTop: 6, textAlign: 'right' }}>{done ? (data.rateLabel ?? 'chips per second') : (n === 1 ? (data.countLabel ?? 'chips so far').replace(/^chips/, 'chip') : (data.countLabel ?? 'chips so far'))}</div>
            </div>
          </React.Fragment>
        );
      })}
    </Overlay>
  );
};
