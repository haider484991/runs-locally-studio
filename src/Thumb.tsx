/**
 * The thumbnail, generated from `script.thumb` in the video's mood: its face, its palette, its
 * backdrop, and one of two layouts chosen by the seed. No faces, no arrows, no red circles.
 * For a hand-made thumbnail, write it as HTML and shoot it with scripts/thumb-shot.mjs instead.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, FONT, glow, hexA, MoodCtx } from './theme';
import { moodOf } from './Video';
import type { Script } from './types';

export const Thumb: React.FC<{ script: Script }> = ({ script }) => {
  const m = moodOf(script);
  const { accent, second, display: d } = m;
  // A script without `thumb` still gets a thumbnail: its title as the headline.
  const t = script.thumb ?? { kicker: '', hero: { value: '', label: '' }, headline: script.title, verdict: '' };
  const variant = (m.seed >>> 20) % 2;
  const face: React.CSSProperties = { fontFamily: d.family, fontWeight: d.weight, letterSpacing: d.tracking, textTransform: d.upper ? 'uppercase' : 'none' };
  const box: React.CSSProperties = m.shapes === 'sharp'
    ? { borderRadius: 0, background: 'rgba(6,9,18,0.86)', borderLeft: `10px solid ${accent}` }
    : m.shapes === 'naked' ? { borderRadius: 0, background: 'transparent', borderBottom: `3px solid ${hexA(accent, 0.6)}`, padding: '0 0 18px 0' }
    : { borderRadius: 28, background: 'rgba(255,255,255,0.07)', border: `1.5px solid ${C.edge}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 30px 80px rgba(0,0,0,0.5)' };
  return (
    <MoodCtx.Provider value={m}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${m.bg1} 0%, ${C.bg0} 75%)`, overflow: 'hidden' }}>
        {m.backdrop === 'aurora' ? (
          <>
            <div style={{ position: 'absolute', left: 120, top: -200, width: 300, height: 1100, background: `linear-gradient(180deg, ${hexA(accent, 0)}, ${hexA(accent, 0.45)} 45%, ${hexA(accent, 0)})`, transform: 'rotate(-20deg)', filter: 'blur(60px)' }} />
            <div style={{ position: 'absolute', left: 700, top: -200, width: 340, height: 1100, background: `linear-gradient(180deg, ${hexA(second, 0)}, ${hexA(second, 0.3)} 45%, ${hexA(second, 0)})`, transform: 'rotate(-22deg)', filter: 'blur(60px)' }} />
          </>
        ) : m.backdrop === 'grid' ? (
          <div style={{ position: 'absolute', left: -600, top: 380, width: 2500, height: 900, transformOrigin: '50% 0%', transform: 'perspective(600px) rotateX(64deg)', backgroundImage: `linear-gradient(${hexA(accent, 0.25)} 2px, transparent 2px), linear-gradient(90deg, ${hexA(accent, 0.18)} 2px, transparent 2px)`, backgroundSize: '60px 60px', maskImage: 'linear-gradient(180deg, #000 0%, transparent 70%)', WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 70%)' }} />
        ) : (
          <>
            <div style={{ position: 'absolute', left: 820, top: -260, width: 760, height: 760, borderRadius: 760, background: hexA(accent, 0.28), filter: 'blur(120px)' }} />
            <div style={{ position: 'absolute', left: -200, top: 380, width: 620, height: 620, borderRadius: 620, background: hexA(second, 0.18), filter: 'blur(120px)' }} />
          </>
        )}
        {m.texture !== 'none' && (
          <svg width={1280} height={720} style={{ position: 'absolute', inset: 0, opacity: 0.05, mixBlendMode: 'overlay' }}>
            <filter id="tg"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" /><feColorMatrix type="saturate" values="0" /></filter>
            <rect width={1280} height={720} filter="url(#tg)" />
          </svg>
        )}

        {variant === 0 ? (
          <>
            <div style={{ position: 'absolute', left: 56, top: 48, fontFamily: FONT.body, fontWeight: 600, fontSize: 26, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>{t.kicker}</div>
            <div style={{ position: 'absolute', right: 56, top: 60, textAlign: 'right' }}>
              <div style={{ ...face, fontSize: 250 * d.scale, lineHeight: 0.9, color: accent, filter: glow(accent, 36, 0.6), fontVariantNumeric: 'tabular-nums' }}>{t.hero.value}</div>
              <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 34, letterSpacing: '0.14em', color: C.ink, marginTop: 6 }}>{t.hero.label}</div>
            </div>
            <div style={{ position: 'absolute', left: 40, bottom: 40, padding: '34px 44px', maxWidth: 900, ...box }}>
              <div style={{ ...face, fontSize: 84 * d.scale, lineHeight: 0.98, color: C.ink, whiteSpace: 'pre-line' }}>{t.headline}</div>
              <div style={{ ...face, fontSize: 44 * d.scale, color: C.gold, marginTop: 18, filter: glow(C.gold, 18, 0.4) }}>{t.verdict}</div>
            </div>
          </>
        ) : (
          <>
            {/* variant B: the number is the backdrop; the headline sits on it */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 40, textAlign: 'center', ...face, fontSize: 420 * d.scale, lineHeight: 0.9, color: hexA(accent, 0.92), filter: glow(accent, 50, 0.5), fontVariantNumeric: 'tabular-nums' }}>{t.hero.value}</div>
            <div style={{ position: 'absolute', left: 56, top: 44, fontFamily: FONT.body, fontWeight: 600, fontSize: 26, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>{t.kicker}</div>
            <div style={{ position: 'absolute', right: 56, top: 44, padding: '10px 22px', fontFamily: FONT.body, fontWeight: 600, fontSize: 26, letterSpacing: '0.14em', color: '#05070F', background: C.gold, borderRadius: m.shapes === 'glass' ? 40 : 0 }}>{t.hero.label}</div>
            <div style={{ position: 'absolute', left: 40, right: 40, bottom: 40, padding: '30px 44px', ...box }}>
              <div style={{ ...face, fontSize: 92 * d.scale, lineHeight: 0.96, color: C.ink, whiteSpace: 'pre-line' }}>{t.headline}</div>
              <div style={{ ...face, fontSize: 44 * d.scale, color: C.gold, marginTop: 14, filter: glow(C.gold, 18, 0.4) }}>{t.verdict}</div>
            </div>
          </>
        )}
      </AbsoluteFill>
    </MoodCtx.Provider>
  );
};
