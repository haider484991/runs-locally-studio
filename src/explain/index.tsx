/**
 * EXPLAIN — the scene family for lessons ("how it works", "how to code it"). Every scene is declarative DATA plus CUES that name the
 * spoken word which triggers each step (see ctx.tsx). `scene` picks the component; the Overlay draws the cursor / spotlight / zoom.
 */
import React from 'react';
import { C, FONT, hexA } from '../theme';
import type { Visual } from '../types';
import { Words } from '../kit/Type';
import { useCues } from './ctx';
import { useFontsReady } from './fonts';
import { ChipsScene } from './chips';
import { CodeScene } from './code';
import { RaceScene } from './race';
import { VocabScene } from './vocab';
import { TrialsScene } from './trials';
import { WindowScene } from './window';
import { BarsScene } from './bars';
import { MemoryScene } from './memory';
import { NextwordScene } from './nextword';

export const EXPLAIN_SCENES = ['chips', 'code', 'race', 'vocab', 'trials', 'window', 'bars', 'memory', 'nextword'] as const;

export const ExplainScene: React.FC<{ v: Extract<Visual, { type: 'explain' }>; accent: string; second: string; dur: number }> = ({ v, accent, second, dur }) => {
  const cues = useCues(v.cues, `explain:${v.scene}`);
  const fontsReady = useFontsReady();
  if (!fontsReady) return null;
  const common = { cues, accent, second, dur, data: v.data as any };
  let body: React.ReactNode;
  switch (v.scene) {
    case 'chips': body = <ChipsScene {...common} />; break;
    case 'code': body = <CodeScene {...common} />; break;
    case 'race': body = <RaceScene {...common} />; break;
    case 'vocab': body = <VocabScene {...common} />; break;
    case 'trials': body = <TrialsScene {...common} />; break;
    case 'window': body = <WindowScene {...common} />; break;
    case 'bars': body = <BarsScene {...common} />; break;
    case 'memory': body = <MemoryScene {...common} />; break;
    case 'nextword': body = <NextwordScene {...common} />; break;
    default: throw new Error(`unknown explain scene "${(v as any).scene}" (known: ${EXPLAIN_SCENES.join(', ')})`);
  }
  return (
    <>
      {body}
      {v.title && <div style={{ position: 'absolute', left: 160, top: 44, width: 1250 }}><Words text={v.title} size={52} delay={4} stagger={2} maxWidth={1250} lineHeight={1.05} /></div>}
      {v.badge && (
        <div style={{ position: 'absolute', right: 160, top: 62, fontFamily: FONT.body, fontWeight: 600, fontSize: 22, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent, border: `1.5px solid ${hexA(accent, 0.6)}`, borderRadius: 999, padding: '7px 20px', background: 'rgba(8,12,26,0.7)' }}>{v.badge}</div>
      )}
    </>
  );
};

