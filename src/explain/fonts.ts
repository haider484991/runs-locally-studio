import { useEffect, useRef, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
/** The base theme loads JetBrains Mono at 700 only; code and chips need 500 as well. Root.tsx awaits this before the first frame. */
const mono = loadMono('normal', { weights: ['500', '700'], subsets: ['latin', 'latin-ext'] });
export const EXPLAIN_FONTS = { ready: () => mono.waitUntilDone() };
export const MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace';
/** Code ligatures would turn the literal characters  <|  |>  ->  !=  into one drawn symbol; a lesson must show exactly what was typed. */
export const NO_LIG = { fontVariantLigatures: 'none', fontFeatureSettings: '"liga" 0, "calt" 0' } as const;

/** Text is measured with canvas.measureText, which only knows a font once it is loaded: hold the first paint until it is. */
export const useFontsReady = () => {
  const [handle] = useState(() => delayRender('explain fonts'));
  const [ready, setReady] = useState(false);
  const released = useRef(false);
  const release = () => { if (!released.current) { released.current = true; continueRender(handle); } };
  useEffect(() => {
    let alive = true;
    Promise.all([document.fonts.load(`500 30px ${MONO}`), document.fonts.load(`700 30px ${MONO}`), document.fonts.ready]).then(() => { if (alive) setReady(true); });
    return () => { alive = false; release(); };
  }, []);
  useEffect(() => { if (ready) release(); }, [ready]);
  return ready;
};
