/**
 * The scene vocabulary. Every scene type has LAYOUT VARIANTS chosen by the mood seed, so the same
 * beat type lands differently in different videos. Plus `hero`, the one scene written for a single
 * video (src/heroes/<slug>.tsx). Add a TYPE here, never a one-off — one-offs go in heroes.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { C, FONT, glow, hexA, useMood } from '../theme';
import type { Beat, Visual, BarItem, Side } from '../types';
import { Words, Kicker, Source, toneColor } from '../kit/Type';
import { Counter } from '../kit/Counter';
import { Panel, Fill, Column } from '../kit/Glass';
import { SPRINGS, enterStyle, fmt, useCamera, useExit } from '../kit/motion';
import { HEROES } from '../heroes';
import { Evidence } from './Evidence';
import { ExplainScene } from '../explain';

export type SceneCtx = { accent: string; second: string; dur: number; slug: string; index: number };
type P<T extends Visual['type']> = { v: Extract<Visual, { type: T }> } & SceneCtx;

const L = 160;

/** Which layout variant this scene gets: stable per video, different across videos. */
const useVariant = (n: number, salt: number) => (useMood().seed >>> (salt % 24)) % n;

/* ── the frame every scene lives in: camera push + exit ease ────────────────── */
const Stage: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const cam = useCamera(dur);
  const out = useExit(dur, 10);
  return <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: '50% 50%', opacity: 1 - out * 0.9 }}>{children}</AbsoluteFill>;
};

/* ── TITLE ──────────────────────────────────────────────────────────────────── */
const Title: React.FC<P<'title'>> = ({ v, dur }) => {
  const variant = useVariant(2, 1);
  const center = variant === 1;
  return (
    <Stage dur={dur}>
      <div style={{ position: 'absolute', left: center ? 0 : L, right: center ? 0 : undefined, top: 300, width: center ? undefined : 1500, display: 'flex', flexDirection: 'column', alignItems: center ? 'center' : 'flex-start' }}>
        {v.kicker && <Kicker text={v.kicker} />}
        <div style={{ height: 28 }} />
        <Words text={v.headline} size={112} delay={6} maxWidth={1500} align={center ? 'center' : 'left'} />
        {v.sub && <div style={{ marginTop: 36 }}><Words text={v.sub} size={40} font="body" color={C.muted} delay={30} stagger={2} maxWidth={1300} align={center ? 'center' : 'left'} /></div>}
      </div>
      <Source text={v.source} />
    </Stage>
  );
};

/* ── STAT: three layouts — left, centred giant, split ────────────────────────── */
const Stat: React.FC<P<'stat'>> = ({ v, accent, second, dur }) => {
  const color = toneColor(v.tone ?? 'accent', accent, second);
  const variant = useVariant(3, 4);
  if (variant === 1) return (
    <Stage dur={dur}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 200, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Kicker text={v.label} />
        <div style={{ height: 30 }} />
        <Counter value={v.value} decimals={v.decimals} unit={v.unit} prefix={v.prefix} size={330} color={color} delay={8} lit align="center" />
        {v.sub && <div style={{ marginTop: 40 }}><Words text={v.sub} size={44} font="body" color={C.ink} delay={34} stagger={2} maxWidth={1300} align="center" /></div>}
      </div>
      <Source text={v.source} />
    </Stage>
  );
  if (variant === 2) return (
    <Stage dur={dur}>
      <div style={{ position: 'absolute', left: L, top: 330, width: 760 }}>
        <Kicker text={v.label} />
        {v.sub && <div style={{ marginTop: 28 }}><Words text={v.sub} size={56} delay={30} stagger={3} maxWidth={760} /></div>}
      </div>
      <div style={{ position: 'absolute', right: L, top: 300, width: 800, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <Counter value={v.value} decimals={v.decimals} prefix={v.prefix} size={260} color={color} delay={8} lit align="right" />
        {/* the unit sits UNDER the number here — beside a 260 px figure it wrapped into a column */}
        {v.unit && <div style={{ marginTop: 18 }}><Words text={v.unit} size={40} font="body" color={C.muted} delay={26} stagger={2} align="right" maxWidth={800} /></div>}
      </div>
      <Source text={v.source} />
    </Stage>
  );
  return (
    <Stage dur={dur}>
      <div style={{ position: 'absolute', left: L, top: 250 }}>
        <Kicker text={v.label} />
        <div style={{ height: 40 }} />
        <Counter value={v.value} decimals={v.decimals} unit={v.unit} prefix={v.prefix} size={260} color={color} delay={8} lit />
        {v.sub && <div style={{ marginTop: 48 }}><Words text={v.sub} size={44} font="body" color={C.ink} delay={34} stagger={2} maxWidth={1300} /></div>}
      </div>
      <Source text={v.source} />
    </Stage>
  );
};

/* ── COMPARE: side-by-side panels, or stacked rows, or an offset pair ────────── */
const SidePanel: React.FC<{ s: Side; x: number; y: number; w: number; h: number; delay: number; max: number; unit?: string; decimals?: number; accent: string; second: string; fallback: 'accent' | 'second' }> =
  ({ s, x, y, w, h, delay, max, unit, decimals = 0, accent, second, fallback }) => {
    const color = toneColor(s.tone ?? fallback, accent, second);
    return (
      <Panel x={x} y={y} w={w} h={h} delay={delay} tint={color}>
        <Kicker text={s.name} delay={delay + 6} color={color} size={26} />
        <div style={{ height: 30 }} />
        <Counter value={s.value} decimals={decimals} unit={unit} size={150} color={C.ink} delay={delay + 10} unitSize={40} />
        <div style={{ height: 34 }} />
        <Fill frac={s.value / max} color={color} w={w - 80} h={20} delay={delay + 18} />
        {s.note && <div style={{ marginTop: 28 }}><Words text={s.note} size={30} font="body" color={C.muted} delay={delay + 28} stagger={2} /></div>}
      </Panel>
    );
  };
const Compare: React.FC<P<'compare'>> = ({ v, accent, second, dur }) => {
  const max = Math.max(v.left.value, v.right.value);
  const variant = useVariant(3, 7);
  const head = v.headline && <div style={{ position: 'absolute', left: L, top: 170 }}><Words text={v.headline} size={72} maxWidth={1600} /></div>;
  const verdict = v.verdict && <div style={{ position: 'absolute', left: L, top: 850 }}><Words text={v.verdict} size={48} delay={48} color={C.gold} maxWidth={1600} /></div>;
  if (variant === 1) {
    // stacked rows: name left, number right, a full-width fill under each
    const Row: React.FC<{ s: Side; y: number; delay: number; fb: 'accent' | 'second' }> = ({ s, y, delay, fb }) => {
      const color = toneColor(s.tone ?? fb, accent, second);
      return (
        <div style={{ position: 'absolute', left: L, top: y, width: 1600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div><Kicker text={s.name} delay={delay} color={color} size={28} />{s.note && <div style={{ marginTop: 10 }}><Words text={s.note} size={28} font="body" color={C.muted} delay={delay + 20} stagger={2} /></div>}</div>
            <Counter value={s.value} decimals={v.decimals} unit={v.unit} size={130} color={C.ink} delay={delay + 6} unitSize={36} align="right" />
          </div>
          <div style={{ marginTop: 18 }}><Fill frac={s.value / max} color={color} w={1600} h={22} delay={delay + 14} /></div>
        </div>
      );
    };
    return <Stage dur={dur}>{head}<Row s={v.left} y={320} delay={10} fb="accent" /><Row s={v.right} y={580} delay={22} fb="second" />{verdict}<Source text={v.source} /></Stage>;
  }
  if (variant === 2) {
    return (
      <Stage dur={dur}>
        {head}
        <SidePanel s={v.left} x={L} y={300} w={760} h={430} delay={10} max={max} unit={v.unit} decimals={v.decimals} accent={accent} second={second} fallback="accent" />
        <SidePanel s={v.right} x={L + 840} y={400} w={760} h={430} delay={20} max={max} unit={v.unit} decimals={v.decimals} accent={accent} second={second} fallback="second" />
        {verdict}<Source text={v.source} />
      </Stage>
    );
  }
  return (
    <Stage dur={dur}>
      {head}
      <SidePanel s={v.left} x={L} y={330} w={720} h={460} delay={10} max={max} unit={v.unit} decimals={v.decimals} accent={accent} second={second} fallback="accent" />
      <SidePanel s={v.right} x={L + 800} y={330} w={720} h={460} delay={18} max={max} unit={v.unit} decimals={v.decimals} accent={accent} second={second} fallback="second" />
      {verdict}<Source text={v.source} />
    </Stage>
  );
};

/* ── BARS: horizontal rows or vertical columns ──────────────────────────────── */
const Bars: React.FC<P<'bars'>> = ({ v, accent, second, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = useMood().display;
  const items = v.items.slice(0, 7);
  const max = Math.max(...items.map((i) => i.value));
  const variant = useVariant(2, 10);
  const colorOf = (it: BarItem) => { const muted = (it.tone ?? 'muted') === 'muted'; return { muted, color: muted ? '#5B637A' : toneColor(it.tone, accent, second) }; };
  const head = <div style={{ position: 'absolute', left: L, top: 170 }}><Words text={v.headline} size={72} maxWidth={1600} /></div>;
  if (variant === 1) {
    const n = items.length, colW = Math.min(240, 1400 / n), gap = (1600 - colW * n) / Math.max(1, n - 1);
    return (
      <Stage dur={dur}>
        {head}
        {items.map((it, i) => {
          const delay = 14 + i * 6, { muted, color } = colorOf(it);
          const p = spring({ frame: frame - delay, fps, config: SPRINGS.land });
          const x = L + i * (colW + gap);
          return (
            <div key={i} style={{ position: 'absolute', left: x, top: 320, width: colW, ...enterStyle(p, 30) }}>
              <div style={{ fontFamily: d.family, fontWeight: d.weight, fontSize: 44 * d.scale, color: muted ? C.muted : color, textAlign: 'center', fontVariantNumeric: 'tabular-nums', filter: muted ? undefined : glow(color, 20, 0.5), marginBottom: 14, whiteSpace: 'nowrap' }}>
                {fmt(it.value, v.decimals ?? 0)}{v.unit ? <span style={{ fontSize: 22, fontFamily: FONT.body, color: C.muted, marginLeft: 6 }}>{v.unit}</span> : null}
              </div>
              <Column frac={it.value / max} color={color} w={colW} h={380} delay={delay + 4} />
              <div style={{ marginTop: 16, fontFamily: FONT.body, fontWeight: 600, fontSize: 24, color: muted ? C.muted : C.ink, textAlign: 'center', lineHeight: 1.2 }}>{it.label}</div>
              {/* The column layout used to drop notes silently; a note like "does not fit" is the point of the bar. */}
              {it.note && <div style={{ marginTop: 6, fontFamily: FONT.body, fontSize: 22, color: C.muted, textAlign: 'center', lineHeight: 1.2 }}>{it.note}</div>}
            </div>
          );
        })}
        <Source text={v.source} />
      </Stage>
    );
  }
  const top = 330, rowH = Math.min(120, ((items.length > 5 ? 890 : 960) - top) / items.length), barW = 1200;
  return (
    <Stage dur={dur}>
      {head}
      {items.map((it, i) => {
        const delay = 14 + i * 6, { muted, color } = colorOf(it);
        const p = spring({ frame: frame - delay, fps, config: SPRINGS.land });
        return (
          <div key={i} style={{ position: 'absolute', left: L, top: top + i * rowH, width: 1600, ...enterStyle(p, 30) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: barW, marginBottom: 12 }}>
              <span style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 30, color: muted ? C.ink : color }}>{it.label}</span>
              {it.note && <span style={{ fontFamily: FONT.body, fontSize: 24, color: C.muted }}>{it.note}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <Fill frac={it.value / max} color={color} w={barW} h={26} delay={delay + 4} />
              <span style={{ fontFamily: d.family, fontWeight: d.weight, fontSize: 40 * d.scale, color: muted ? C.muted : color, fontVariantNumeric: 'tabular-nums', filter: muted ? undefined : glow(color, 20, 0.5) }}>
                {fmt(it.value, v.decimals ?? 0)}{v.unit ? <span style={{ fontSize: 24, fontFamily: FONT.body, color: C.muted, marginLeft: 8 }}>{v.unit}</span> : null}
              </span>
            </div>
          </div>
        );
      })}
      <Source text={v.source} />
    </Stage>
  );
};

/* ── FORMULA: a row of chips, or a stacked fraction ─────────────────────────── */
const Chip: React.FC<{ text: string; delay: number; color?: string; big?: boolean; lit?: boolean }> = ({ text, delay, color = C.ink, big, lit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { shapes, display: d } = useMood();
  const p = spring({ frame: frame - delay, fps, config: lit ? SPRINGS.pop : SPRINGS.land });
  const box: React.CSSProperties = shapes === 'naked'
    ? { borderBottom: `3px solid ${lit ? color : C.edge}`, padding: big ? '10px 6px' : '8px 4px' }
    : { padding: big ? '28px 48px' : '22px 40px', borderRadius: shapes === 'glass' ? 24 : 0, background: lit ? hexA(color, 0.14) : C.glass, border: `1.5px solid ${lit ? hexA(color, 0.5) : C.edge}` };
  return (
    <div style={{ ...box, fontFamily: d.family, fontWeight: d.weight, fontSize: (big ? 84 : 64) * d.scale, color, letterSpacing: d.tracking, textTransform: d.upper ? 'uppercase' : 'none', filter: lit ? glow(color, 30, 0.5) : undefined, ...enterStyle(p, 40) }}>{text}</div>
  );
};
const Op: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: SPRINGS.land });
  return <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 72, color: C.muted, ...enterStyle(p, 20) }}>{text}</div>;
};
const Formula: React.FC<P<'formula'>> = ({ v, accent, dur }) => {
  const variant = useVariant(2, 13);
  if (variant === 1 && v.op === '÷') {
    return (
      <Stage dur={dur}>
        <div style={{ position: 'absolute', left: L, top: 200 }}>{v.kicker && <Kicker text={v.kicker} />}</div>
        <div style={{ position: 'absolute', left: L, top: 300, display: 'flex', alignItems: 'center', gap: 60 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <Chip text={v.lhs} delay={6} />
            <div style={{ width: 340, height: 4, background: C.muted }} />
            <Chip text={v.rhs} delay={18} />
          </div>
          <Op text="=" delay={30} />
          <Chip text={v.result} delay={38} color={accent} big lit />
        </div>
        {v.sub && <div style={{ position: 'absolute', left: L, top: 720 }}><Words text={v.sub} size={40} font="body" color={C.muted} delay={56} stagger={2} maxWidth={1500} /></div>}
        <Source text={v.source} />
      </Stage>
    );
  }
  return (
    <Stage dur={dur}>
      <div style={{ position: 'absolute', left: L, top: 240 }}>{v.kicker && <Kicker text={v.kicker} />}</div>
      <div style={{ position: 'absolute', left: L, top: 400, display: 'flex', alignItems: 'center', gap: 36, flexWrap: 'wrap', width: 1600 }}>
        <Chip text={v.lhs} delay={6} /><Op text={v.op} delay={14} /><Chip text={v.rhs} delay={20} /><Op text="=" delay={30} /><Chip text={v.result} delay={38} color={accent} big lit />
      </div>
      {v.sub && <div style={{ position: 'absolute', left: L, top: 660 }}><Words text={v.sub} size={40} font="body" color={C.muted} delay={56} stagger={2} maxWidth={1500} /></div>}
      <Source text={v.source} />
    </Stage>
  );
};

/* ── LIST ───────────────────────────────────────────────────────────────────── */
const List: React.FC<P<'list'>> = ({ v, accent, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { shapes, display: d } = useMood();
  const items = v.items.slice(0, 5);
  const variant = useVariant(2, 16);
  return (
    <Stage dur={dur}>
      <div style={{ position: 'absolute', left: L, top: 170 }}><Words text={v.headline} size={72} maxWidth={1600} /></div>
      {items.map((t, i) => {
        const delay = 16 + i * 6;
        const p = spring({ frame: frame - delay, fps, config: SPRINGS.land });
        return (
          <div key={i} style={{ position: 'absolute', left: L, top: 330 + i * 110, display: 'flex', alignItems: 'center', gap: 28, ...enterStyle(p, 30) }}>
            {variant === 1
              ? <div style={{ fontFamily: d.family, fontWeight: d.weight, fontSize: 40 * d.scale, color: accent, width: 70 }}>{String(i + 1).padStart(2, '0')}</div>
              : <div style={{ width: 18, height: 18, borderRadius: shapes === 'glass' ? 18 : 0, background: accent, boxShadow: `0 0 20px ${hexA(accent, 0.7)}` }} />}
            <Words text={t} size={44} font="body" color={C.ink} delay={delay + 4} stagger={2} maxWidth={1400} />
          </div>
        );
      })}
      <Source text={v.source} />
    </Stage>
  );
};

/* ── CALLOUT ────────────────────────────────────────────────────────────────── */
const Callout: React.FC<P<'callout'>> = ({ v, dur }) => {
  const variant = useVariant(2, 19);
  const center = variant === 1;
  return (
    <Stage dur={dur}>
      <div style={{ position: 'absolute', left: center ? 160 : L, right: center ? 160 : undefined, top: 300, width: center ? undefined : 1600 }}>
        <Words text={v.text} size={104} maxWidth={1600} align={center ? 'center' : 'left'} />
        {v.sub && <div style={{ marginTop: 40 }}><Words text={v.sub} size={40} font="body" color={C.muted} delay={40} stagger={2} maxWidth={1400} align={center ? 'center' : 'left'} /></div>}
      </div>
      <Source text={v.source} />
    </Stage>
  );
};

/* ── VERDICT: gold, the only scene allowed to be centred ─────────────────────── */
const Verdict: React.FC<P<'verdict'>> = ({ v, dur }) => (
  <Stage dur={dur}>
    {/* ⚠ ENDZONE: the verdict often sits inside YouTube's last 20 s, so it stays below y 500 and inside x 340–1580 —
        clear of the subscribe zone (x<310, y<410) and the playlist zone (x>1270, y<490). check.mjs enforces the timing half. */}
    <Panel x={340} y={500} w={1240} h={400} delay={4} tint={C.gold} pad={56}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <Words text={v.headline} size={84} delay={14} color={C.gold} align="center" maxWidth={1120} />
        {v.sub && <div style={{ marginTop: 24 }}><Words text={v.sub} size={34} font="body" color={C.ink} delay={44} stagger={2} align="center" maxWidth={1100} /></div>}
      </div>
    </Panel>
    <Source text={v.source} />
  </Stage>
);

/* ── END: keeps YouTube's end-screen zones (top-left, top-right) clear ──────── */
const End: React.FC<P<'end'>> = ({ v, accent, dur }) => (
  <Stage dur={dur}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Kicker text={v.series} delay={4} color={accent} size={30} />
      <div style={{ height: 24 }} />
      <Words text={v.line} size={64} delay={16} align="center" maxWidth={1200} />
    </div>
  </Stage>
);

/* ── HERO: the scene that exists only in this video ─────────────────────────── */
const Hero: React.FC<P<'hero'>> = ({ v, slug, dur, ...ctx }) => {
  const H = HEROES[slug];
  if (!H) throw new Error(`beat uses a hero scene but src/heroes/${slug}.tsx is not registered in src/heroes/index.ts`);
  return <Stage dur={dur}><H {...ctx} dur={dur} props={v.props ?? {}} /><Source text={v.source} /></Stage>;
};

export const Scene: React.FC<{ beat: Beat } & SceneCtx> = ({ beat, ...ctx }) => {
  const v = beat.visual;
  switch (v.type) {
    case 'title': return <Title v={v} {...ctx} />;
    case 'stat': return <Stat v={v} {...ctx} />;
    case 'compare': return <Compare v={v} {...ctx} />;
    case 'bars': return <Bars v={v} {...ctx} />;
    case 'formula': return <Formula v={v} {...ctx} />;
    case 'list': return <List v={v} {...ctx} />;
    case 'callout': return <Callout v={v} {...ctx} />;
    case 'verdict': return <Verdict v={v} {...ctx} />;
    case 'end': return <End v={v} {...ctx} />;
    case 'hero': return <Hero v={v} {...ctx} />;
    case 'capture': return <Evidence v={v} accent={ctx.accent} />;
    case 'explain': return <Stage dur={ctx.dur}><ExplainScene v={v} accent={ctx.accent} second={ctx.second} dur={ctx.dur} /><Source text={v.source} /></Stage>;
  }
};
