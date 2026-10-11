/**
 * CODE — an editor and a terminal that REPLAY a real run: the file is the file that ran, the output lines are the captured stdout.
 * A badge says so. Cues:  line {line:N} types line N · run {run:K} types the command, then the captured output appears line by line ·
 * point / focus / zoom (Overlay) with targets  line:N · line:N:a-b (characters a..b of the line) · code · term · cmd:K · out:K · out:K:J · out:K:J:a-b
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, hexA } from '../theme';
import { Overlay, Targets } from './Overlay';
import type { RCue } from './ctx';
import { MONO, NO_LIG } from './fonts';
import { Rect, measure } from './geometry';
import { COL, highlight } from './highlight';

type Run = { cmd: string; out: string[] };
type CodeData = { file: string; lines: string[]; lang?: string; runs?: Run[]; prompt?: string; badge?: string; typeCps?: number; outEvery?: number; fontSize?: number; termFontSize?: number; top?: number; lineHeight?: number };

export const CodeScene: React.FC<{ data: CodeData; cues: RCue[]; accent: string; dur: number }> = ({ data, cues, accent, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fs = data.fontSize ?? 38, lh = Math.round(fs * (data.lineHeight ?? 1.75)), cw = measure('M', `500 ${fs}px ${MONO}`);
  const tfs = data.termFontSize ?? fs, tlh = Math.round(tfs * 1.6), tcw = measure('M', `500 ${tfs}px ${MONO}`);
  const lang = data.lang ?? 'python';
  const cps = data.typeCps ?? 42, every = data.outEvery ?? 9;
  const prompt = data.prompt ?? '$';
  const typed = (at: number, len: number) => (frame < at ? 0 : Math.min(len, Math.floor(((frame - at) * cps) / fps) + 1));

  const hasLineCues = cues.some((c) => c.do === 'line');
  const lineAt = (i: number) => cues.find((c) => c.do === 'line' && c.line === i + 1)?.at ?? (hasLineCues ? Infinity : 6);
  const runAt = (k: number) => cues.find((c) => c.do === 'run' && c.run === k)?.at ?? Infinity;

  const ED = { x: 160, y: data.top ?? 200, w: 1600 }, GUT = 92, TOP = 64;
  const edH = TOP + data.lines.length * lh + 30;
  const TERM = { x: 160, y: ED.y + edH + 26, w: 1600 };
  const runs = data.runs ?? [];
  // terminal layout: each run = one command line + its output lines
  const tl: { cmdY: number; outY: number }[] = [];
  let ty = TERM.y + 34;
  runs.forEach((r) => { const cmdY = ty; const outY = cmdY + tlh; ty = outY + r.out.length * tlh + 6; tl.push({ cmdY, outY }); });
  const termH = Math.max(150, ty - TERM.y + 14);

  const targets: Targets = { code: { x: ED.x, y: ED.y, w: ED.w, h: edH }, term: { x: TERM.x, y: TERM.y, w: TERM.w, h: termH } };
  data.lines.forEach((l, i) => {
    targets[`line:${i + 1}`] = { x: ED.x + GUT - 12, y: ED.y + TOP + i * lh, w: Math.max(cw * l.length, 40) + 24, h: lh };
  });
  const lineRect = (n: number, a: number, b: number): Rect => ({ x: ED.x + GUT + a * cw - 6, y: ED.y + TOP + (n - 1) * lh, w: (b - a) * cw + 12, h: lh });
  const TX = TERM.x + 36;
  runs.forEach((r, k) => {
    targets[`cmd:${k}`] = { x: TX, y: tl[k].cmdY, w: tcw * (prompt.length + 1 + r.cmd.length) + 12, h: tlh };
    targets[`out:${k}`] = { x: TX, y: tl[k].outY, w: Math.max(...r.out.map((o) => o.length), 8) * tcw + 12, h: Math.max(1, r.out.length) * tlh };
    r.out.forEach((o, j) => { targets[`out:${k}:${j}`] = { x: TX, y: tl[k].outY + j * tlh, w: Math.max(o.length, 4) * tcw + 12, h: tlh }; });
  });
  // sub-ranges (characters a..b of a line) are derived on demand from the cues that ask for them
  const asked = cues.flatMap((c) => (Array.isArray(c.target) ? c.target : c.target ? [c.target] : []));
  for (const t of asked) {
    let m = String(t).match(/^line:(\d+):(\d+)-(\d+)$/);
    if (m) targets[t] = lineRect(Number(m[1]), Number(m[2]), Number(m[3]));
    m = String(t).match(/^out:(\d+):(\d+):(\d+)-(\d+)$/);
    if (m) targets[t] = { x: TX + Number(m[3]) * tcw - 6, y: tl[Number(m[1])].outY + Number(m[2]) * tlh, w: (Number(m[4]) - Number(m[3])) * tcw + 12, h: tlh };
  }

  // which line is being typed right now (caret)
  let caretLine = -1, caretCol = 0;
  data.lines.forEach((l, i) => { const at = lineAt(i); const n = typed(at, l.length); if (frame >= at && (n < l.length || frame - at < 20)) { caretLine = i; caretCol = n; } });
  const on = Math.floor(frame / 15) % 2 === 0;
  return (
    <Overlay cues={cues} targets={targets} accent={accent} dur={dur}>
      <div style={{ position: 'absolute', left: ED.x, top: ED.y, width: ED.w, height: edH, borderRadius: 22, background: 'rgba(8,11,22,0.94)', border: `1.5px solid ${hexA(accent, 0.35)}`, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 26, color: C.ink }}>{data.file}</div>
        </div>
      </div>
      {data.lines.map((l, i) => {
        const at = lineAt(i); if (frame < at) return null;
        const n = typed(at, l.length); const spans = highlight(l, lang);
        let rem = n;
        const y = ED.y + TOP + i * lh;
        return (
          <div key={i} style={{ position: 'absolute', left: ED.x, top: y, height: lh, width: ED.w, display: 'flex', alignItems: 'center', fontFamily: MONO, ...NO_LIG, fontWeight: 500, fontSize: fs, whiteSpace: 'pre' }}>
            <span style={{ width: GUT - 24, textAlign: 'right', color: '#586178', fontSize: fs * 0.8 }}>{i + 1}</span>
            <span style={{ width: 24 }} />
            {spans.map((s, k) => { const t = s.text.slice(0, Math.max(0, rem)); rem -= s.text.length; return t ? <span key={k} style={{ color: s.color }}>{t}</span> : null; })}
            {caretLine === i && <span style={{ display: 'inline-block', width: 4, height: fs * 1.15, background: accent, marginLeft: 2, opacity: on || caretCol < l.length ? 1 : 0 }} />}
          </div>
        );
      })}
      {runs.length > 0 && (
        <div style={{ position: 'absolute', left: TERM.x, top: TERM.y, width: TERM.w, height: termH, borderRadius: 22, background: 'rgba(3,5,12,0.96)', border: '1.5px solid rgba(255,255,255,0.14)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
          <div style={{ position: 'absolute', right: 24, top: 12, fontFamily: FONT.body, fontWeight: 600, fontSize: 20, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>terminal</div>
        </div>
      )}
      {runs.map((r, k) => {
        const at = runAt(k); if (frame < at) return null;
        const nCmd = typed(at, r.cmd.length);
        const doneAt = at + (r.cmd.length * fps) / cps + 16;
        const nOut = frame < doneAt ? 0 : Math.min(r.out.length, Math.floor((frame - doneAt) / every) + 1);
        return (
          <React.Fragment key={k}>
            <div style={{ position: 'absolute', left: TX, top: tl[k].cmdY, height: tlh, display: 'flex', alignItems: 'center', fontFamily: MONO, ...NO_LIG, fontWeight: 500, fontSize: tfs, whiteSpace: 'pre' }}>
              <span style={{ color: COL.str }}>{prompt}{' '}</span><span style={{ color: C.ink }}>{r.cmd.slice(0, nCmd)}</span>
              {nCmd < r.cmd.length || nOut === 0 ? <span style={{ display: 'inline-block', width: 4, height: tfs * 1.15, background: C.ink, marginLeft: 2, opacity: on ? 1 : 0.2 }} /> : null}
            </div>
            {r.out.slice(0, nOut).map((o, j) => (
              <div key={j} style={{ position: 'absolute', left: TX, top: tl[k].outY + j * tlh, height: tlh, display: 'flex', alignItems: 'center', fontFamily: MONO, ...NO_LIG, fontWeight: 500, fontSize: tfs, whiteSpace: 'pre', color: '#E6EAF5' }}>{o}</div>
            ))}
          </React.Fragment>
        );
      })}
    </Overlay>
  );
};
