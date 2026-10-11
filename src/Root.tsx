import React from 'react';
import { Composition, Still, staticFile } from 'remotion';
import { Video, plan } from './Video';
import { Thumb } from './Thumb';
import { Short } from './Short';
import { FONT, FPS, W, H } from './theme';
import { SLUGS, SHORTS } from './registry';
import { EXPLAIN_FONTS } from './explain/fonts';
import type { Script, Timings } from './types';

const load = async (slug: string) => {
  const get = async (f: string, optional = false) => {
    const res = await fetch(staticFile(`${slug}/${f}`));
    if (!res.ok) { if (optional) return null; throw new Error(`missing public/${slug}/${f} — run scripts/stage.mjs ${slug}`); }
    return res.json();
  };
  const [script, timings] = await Promise.all([get('script.json') as Promise<Script>, get('timings.json', true) as Promise<Timings | null>]);
  await Promise.all([FONT.ready(), EXPLAIN_FONTS.ready()]);
  return { script, timings };
};

export const Root: React.FC = () => (
  <>
    {SHORTS.map((slug) => (
      <Composition
        key={`short-${slug}`}
        id={`Short-${slug}`}
        component={Short}
        durationInFrames={900}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ script: null as unknown as Script, timings: null }}
        calculateMetadata={async () => {
          const { script, timings } = await load(slug);
          return { durationInFrames: plan(script, timings).total, props: { script, timings } };
        }}
      />
    ))}
    {SLUGS.map((slug) => (
      <React.Fragment key={slug}>
        <Composition
          id={`Video-${slug}`}
          component={Video}
          durationInFrames={300}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{ script: null as unknown as Script, timings: null }}
          calculateMetadata={async () => {
            const { script, timings } = await load(slug);
            return { durationInFrames: plan(script, timings).total, props: { script, timings } };
          }}
        />
        <Still
          id={`Thumb-${slug}`}
          component={Thumb}
          width={1280}
          height={720}
          defaultProps={{ script: null as unknown as Script }}
          calculateMetadata={async () => {
            const { script } = await load(slug);
            return { props: { script } };
          }}
        />
      </React.Fragment>
    ))}
  </>
);
