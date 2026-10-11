/**
 * HEROES — a scene written for ONE video, the thing that makes it not a template.
 * A hero receives the mood colours, the scene duration and the beat's `props`.
 *
 * To add one: create src/heroes/<slug>.tsx exporting a React.FC<HeroProps>, import it here and
 * register it under the video's slug. A beat then uses it with  { "visual": { "type": "hero", "props": { ... } } }.
 * If the picture could teach in another video too, make it an explain scene instead (src/explain/README.md).
 */
import type React from 'react';

export type HeroProps = { accent: string; second: string; dur: number; props: Record<string, unknown> };

export const HEROES: Record<string, React.FC<HeroProps>> = {
  // 'my-video-slug': MyHero,
};
