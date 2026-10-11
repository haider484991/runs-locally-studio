/**
 * MEMORY — where a model sits: a to-scale box for the graphics card's own memory (VRAM) and, to its right, system memory (RAM).
 * Per row: what was already in use on the card before loading (grey, nvidia-smi), the part of the model in VRAM (cyan, Ollama /api/ps),
 * the rest of the increase nvidia-smi saw on the card (hatched "working space"), and the part of the model left in RAM (coral).
 * Every length is GB to the same scale in both boxes. A speed per row is shown in the label column.
 * data: { cardGB, scale?, rows: [{ label, sub?, desktop, vram, other?, ram, speed?, speedUnit? }], legend?: boolean, cardLabel?, ramLabel? }
 * Cues:  card · ram · legend (reveal those parts) · row {row:I} desktop, then the model fills the card, then the rest spills to RAM ·
 *        speed {row:I} the speed appears (otherwise it appears when the row finishes)
 *        point / focus / zoom with targets  card · ram · legend · row:I · label:I · desktop:I · model:I · other:I · spill:I · speed:I · free:I
 */
import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, hexA } from '../theme';
import { Overlay, Targets } from './Overlay';
import type { RCue } from './ctx';
import { MONO } from './fonts';

type Row = { label: string; sub?: string; desktop: number; vram: number; other?: number; ram: number; speed?: number; speedUnit?: string };
type MemoryData = { cardGB: number; scale?: number; rows: Row[]; legend?: boolean; cardLabel?: string; ramLabel?: string; y0?: number; pitch?: number };

export const MEM_COLORS = { desktop: '#8B93A7', model: '#22D3EE', other: '#A78BFA', ram: '#FB7185' };
const ease = Easing.out(Easing.cubic);
const c01 = (x: number) => Math.max(0, Math.min(1, x));

export const MemoryScene: React.FC<{ data: MemoryData; cues: RCue[]; accent: string; dur: number }> = ({ data, cues, accent, dur }) => {
  const frame = useCurrentFrame();
  const S = data.scale ?? 135;                       // px per GB, the same in both boxes
  const LX = 160, CX = 560, CW = data.cardGB * S, RX = CX + CW + 50, H = 92;
  const Y0 = data.y0 ?? 360, PITCH = data.pitch ?? 150, n = data.rows.length;
  const top = Y0 - 34, bottom = Y0 + (n - 1) * PITCH + H + 22;
  const cueAt = (d: string, row?: number) => cues.find((c) => c.do === d && (row === undefined || c.row === row))?.at;
  const cardAt = cueAt('card') ?? 0, ramAt = cueAt('ram') ?? cueAt('row', 0) ?? 0, legendAt = cueAt('legend') ?? Infinity;
  const fade = (a: number) => c01((frame - a) / 10);
  const maxRam = Math.max(0, ...data.rows.map((r) => r.ram));
  const RW = Math.max(300, maxRam * S + 40);

  const targets: Targets = {
    card: { x: CX - 12, y: top - 70, w: CW + 24, h: bottom - top + 82 },
    ram: { x: RX - 12, y: top - 70, w: RW + 24, h: bottom - top + 82 },
    legend: { x: 150, y: 140, w: 1620, h: 50 },
  };
  data.rows.forEach((r, i) => {
    const y = Y0 + i * PITCH, o = r.other ?? 0;
    targets[`row:${i}`] = { x: LX - 10, y: y - 14, w: RX + RW - LX + 20, h: H + 28 };
    targets[`label:${i}`] = { x: LX - 8, y: y - 8, w: CX - LX - 24, h: H + 16 };
    targets[`speed:${i}`] = { x: LX - 8, y: y + 40, w: CX - LX - 30, h: 66 };
    targets[`desktop:${i}`] = { x: CX, y, w: Math.max(8, r.desktop * S), h: H };
    targets[`model:${i}`] = { x: CX + r.desktop * S, y, w: Math.max(8, r.vram * S), h: H };
    targets[`other:${i}`] = { x: CX + (r.desktop + r.vram) * S, y, w: Math.max(8, o * S), h: H };
    targets[`free:${i}`] = { x: CX + (r.desktop + r.vram + o) * S, y, w: Math.max(8, (data.cardGB - r.desktop - r.vram - o) * S), h: H };
    targets[`spill:${i}`] = { x: RX, y, w: Math.max(8, r.ram * S), h: H };
  });

  const seg = (x: number, y: number, w: number, color: string, hatch = false, dashed = false) => (
    <div style={{ position: 'absolute', left: x, top: y, width: Math.max(0, w), height: H, borderRadius: 10, boxSizing: 'border-box',
      background: hatch ? `repeating-linear-gradient(135deg, ${hexA(color, 0.42)} 0 10px, ${hexA(color, 0.12)} 10px 20px)` : hexA(color, dashed ? 0.45 : 0.34),
      border: w > 4 ? `3px ${dashed ? 'dashed' : 'solid'} ${hexA(color, 0.95)}` : 'none' }} />
  );

  return (
    <Overlay cues={cues} targets={targets} accent={accent} dur={dur}>
      {/* the card box: drawn to scale, cardGB wide */}
      <div style={{ opacity: fade(cardAt) }}>
        <div style={{ position: 'absolute', left: CX, top: top - 84, width: CW, fontFamily: FONT.body, whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 700, fontSize: 38, color: C.ink, lineHeight: 1.05 }}>{data.cardLabel ?? `VRAM · ${data.cardGB} GB`}</div>
          <div style={{ fontWeight: 500, fontSize: 26, color: C.muted }}>graphics card memory</div>
        </div>
        <div style={{ position: 'absolute', left: CX - 8, top, width: CW + 16, height: bottom - top, borderRadius: 18, border: `3px solid ${hexA(C.ink, 0.75)}`, boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)' }} />
        {Array.from({ length: Math.floor(data.cardGB) + 1 }, (_, k) => (
          <div key={k} style={{ position: 'absolute', left: CX + k * S - 40, top: bottom + 4, width: 80, textAlign: 'center', fontFamily: FONT.body, fontWeight: 600, fontSize: 24, color: C.muted }}>{k} GB</div>
        ))}
      </div>
      <div style={{ opacity: fade(ramAt) }}>
        <div style={{ position: 'absolute', left: RX, top: top - 84, width: RW, fontFamily: FONT.body, whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 700, fontSize: 38, color: C.ink, lineHeight: 1.05 }}>{data.ramLabel ?? 'RAM'}</div>
          <div style={{ fontWeight: 500, fontSize: 26, color: C.muted }}>system memory</div>
        </div>
        <div style={{ position: 'absolute', left: RX - 8, top, width: RW + 16, height: bottom - top, borderRadius: 18, border: `3px dashed ${hexA(C.ink, 0.4)}`, boxSizing: 'border-box' }} />
      </div>

      {data.rows.map((r, i) => {
        const y = Y0 + i * PITCH, a = cueAt('row', i) ?? 20 + i * 70, o = r.other ?? 0;
        const vis = fade(a - 4);
        const pD = ease(c01((frame - a) / 12)), pM = ease(c01((frame - a - 12) / 22)), pO = ease(c01((frame - a - 30) / 10)), pR = ease(c01((frame - a - 38) / 20));
        const sAt = cueAt('speed', i) ?? a + 60;
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: LX, top: y - 4, width: CX - LX - 30, opacity: vis }}>
              <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 34, lineHeight: 1.1, color: C.ink, whiteSpace: 'nowrap' }}>{r.label}</div>
              {r.speed !== undefined
                ? <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 44, color: accent, marginTop: 6, opacity: fade(sAt), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.speed}<span style={{ fontFamily: FONT.body, fontSize: 28, color: C.muted }}> {r.speedUnit ?? 'chips/s'}</span></div>
                : r.sub && <div style={{ fontFamily: FONT.body, fontWeight: 500, fontSize: 28, color: C.muted, marginTop: 6 }}>{r.sub}</div>}
            </div>
            <div style={{ opacity: vis }}>
              {seg(CX, y, r.desktop * S * pD, MEM_COLORS.desktop)}
              {r.vram > 0 && seg(CX + r.desktop * S, y, r.vram * S * pM, MEM_COLORS.model)}
              {o > 0 && seg(CX + (r.desktop + r.vram) * S, y, o * S * pO, MEM_COLORS.other, true)}
              {r.ram > 0 && seg(RX, y, r.ram * S * pR, MEM_COLORS.ram, false, true)}
              {r.ram > 0 && pR > 0.9 && (r.ram * S > 150
                ? <div style={{ position: 'absolute', left: RX, top: y + 26, width: r.ram * S, textAlign: 'center', fontFamily: FONT.body, fontWeight: 700, fontSize: 32, color: C.ink }}>{r.ram.toFixed(2)} GB</div>
                : <div style={{ position: 'absolute', left: RX + r.ram * S + 14, top: y + 26, fontFamily: FONT.body, fontWeight: 700, fontSize: 32, color: C.ink, whiteSpace: 'nowrap' }}>{r.ram.toFixed(2)} GB</div>)}
              {r.vram > 0 && pM > 0.9 && r.vram * S > 110 && <div style={{ position: 'absolute', left: CX + r.desktop * S, top: y + 26, width: r.vram * S, textAlign: 'center', fontFamily: FONT.body, fontWeight: 700, fontSize: 32, color: C.ink }}>{r.vram.toFixed(2)} GB</div>}
            </div>
          </React.Fragment>
        );
      })}

      {data.legend !== false && (
        <div style={{ position: 'absolute', left: 160, top: 146, width: 1600, display: 'flex', gap: 40, fontFamily: FONT.body, fontWeight: 600, fontSize: 30, color: C.ink, opacity: fade(legendAt) }}>
          {[['desktop', 'in use before loading'], ['model', 'the model, on the card'], ['other', 'working space'], ['ram', 'the model, in RAM']].map(([k, t]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
              <b style={{ display: 'inline-block', width: 34, height: 34, borderRadius: 8, boxSizing: 'border-box', border: `3px ${k === 'ram' ? 'dashed' : 'solid'} ${(MEM_COLORS as any)[k]}`, background: k === 'other' ? `repeating-linear-gradient(135deg, ${hexA(MEM_COLORS.other, 0.5)} 0 6px, transparent 6px 12px)` : hexA((MEM_COLORS as any)[k], 0.34) }} />{t}
            </span>
          ))}
        </div>
      )}
    </Overlay>
  );
};
