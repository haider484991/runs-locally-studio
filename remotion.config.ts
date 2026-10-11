import { Config } from '@remotion/cli/config';

// Used by the Remotion Studio (npm run dev) and the remotion CLI. scripts/render.mjs sets the same options itself.
// JPEG frames render faster than PNG for opaque video. The ANGLE GL backend avoids a slow software-GL path on
// Windows and macOS; on Linux Remotion's default is used. RENDER_CONCURRENCY overrides Remotion's default thread count.
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
if (process.env.RENDER_CONCURRENCY) Config.setConcurrency(Number(process.env.RENDER_CONCURRENCY));
if (process.platform !== 'linux') Config.setChromiumOpenGlRenderer('angle');
