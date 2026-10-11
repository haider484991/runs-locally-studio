/**
 * The backdrop — four of them, plus three textures. Chosen by the mood, persists under every scene.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, W, H, hexA, useMood } from '../theme';

const Nebula: React.FC = () => {
  const { accent, second } = useMood();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / (fps * 30);
  const ax = W * 0.28 + Math.sin(t * Math.PI * 2) * 140, ay = H * 0.35 + Math.cos(t * Math.PI * 2 * 0.7) * 90;
  const bx = W * 0.74 + Math.cos(t * Math.PI * 2 * 0.8) * 160, by = H * 0.72 + Math.sin(t * Math.PI * 2 * 0.6) * 100;
  return (
    <>
      <div style={{ position: 'absolute', left: ax - 450, top: ay - 450, width: 900, height: 900, borderRadius: 900, background: hexA(accent, 0.18), filter: 'blur(180px)' }} />
      <div style={{ position: 'absolute', left: bx - 450, top: by - 450, width: 900, height: 900, borderRadius: 900, background: hexA(second, 0.14), filter: 'blur(180px)' }} />
    </>
  );
};

/** A perspective floor that rolls toward the camera, with an accent horizon. */
const Grid: React.FC = () => {
  const { accent } = useMood();
  const frame = useCurrentFrame();
  const shift = (frame * 1.6) % 80;
  return (
    <>
      <div style={{ position: 'absolute', left: -W, top: H * 0.52, width: W * 3, height: H * 1.4, transformOrigin: '50% 0%', transform: 'perspective(900px) rotateX(64deg)',
        backgroundImage: `linear-gradient(${hexA(accent, 0.22)} 2px, transparent 2px), linear-gradient(90deg, ${hexA(accent, 0.16)} 2px, transparent 2px)`,
        backgroundSize: '80px 80px', backgroundPosition: `0 ${shift}px, 0 0`,
        maskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)', WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: H * 0.40, height: 240, background: `radial-gradient(ellipse at 50% 60%, ${hexA(accent, 0.28)} 0%, rgba(0,0,0,0) 65%)`, filter: 'blur(30px)' }} />
    </>
  );
};

/** Three wide bands of colour drifting at different speeds. */
const Aurora: React.FC = () => {
  const { accent, second } = useMood();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const band = (x: number, color: string, w: number, rot: number, a: number) => (
    <div style={{ position: 'absolute', left: x, top: -300, width: w, height: H + 600, background: `linear-gradient(180deg, ${hexA(color, 0)} 0%, ${hexA(color, a)} 45%, ${hexA(color, 0)} 100%)`, transform: `rotate(${rot}deg)`, filter: 'blur(90px)' }} />
  );
  return (
    <>
      {band(W * 0.15 + Math.sin(t * 0.21) * 220, accent, 360, -18, 0.32)}
      {band(W * 0.55 + Math.sin(t * 0.17 + 2) * 300, second, 420, -22, 0.22)}
      {band(W * 0.80 + Math.sin(t * 0.13 + 4) * 200, accent, 260, -15, 0.20)}
    </>
  );
};

/** A field of slow-rising motes, positions from the mood seed. */
const Dust: React.FC = () => {
  const { accent, second, seed } = useMood();
  const frame = useCurrentFrame();
  const motes = React.useMemo(() => {
    let s = seed;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    return Array.from({ length: 70 }, (_, i) => ({ x: rnd() * W, y: rnd() * H, r: 2 + rnd() * 5, v: 0.15 + rnd() * 0.5, c: i % 3 === 0 ? second : accent, ph: rnd() * 6.28 }));
  }, [seed, accent, second]);
  return (
    <>
      {motes.map((m, i) => {
        const y = ((m.y - frame * m.v) % (H + 40) + H + 40) % (H + 40) - 20;
        const x = m.x + Math.sin(frame / 60 + m.ph) * 18;
        const a = 0.35 + 0.35 * Math.sin(frame / 40 + m.ph);
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: m.r * 2, height: m.r * 2, borderRadius: m.r * 2, background: m.c, opacity: a, boxShadow: `0 0 ${m.r * 5}px ${hexA(m.c, 0.8)}` }} />;
      })}
    </>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: 0.045, mixBlendMode: 'overlay' }}>
      <filter id="lumen-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" seed={frame % 7} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width={W} height={H} filter="url(#lumen-grain)" />
    </svg>
  );
};
const Scanlines: React.FC = () => (
  <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0.22) 4px)', mixBlendMode: 'multiply' }} />
);

export const Bg: React.FC = () => {
  const m = useMood();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${m.bg1} 0%, ${C.bg0} 75%)`, overflow: 'hidden' }}>
      {m.backdrop === 'nebula' && <Nebula />}
      {m.backdrop === 'grid' && <Grid />}
      {m.backdrop === 'aurora' && <Aurora />}
      {m.backdrop === 'dust' && <Dust />}
      {m.texture === 'grain' && <Grain />}
      {m.texture === 'scanlines' && <Scanlines />}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)' }} />
    </AbsoluteFill>
  );
};
