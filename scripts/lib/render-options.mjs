// Render settings shared by render.mjs, render-short.mjs and frames.mjs.
// RENDER_CONCURRENCY: frames rendered in parallel (default: Remotion picks, about half the CPU threads).
// REMOTION_GL: Chrome's GL backend (default: "angle" on Windows/macOS, Remotion's default on Linux).
export const concurrency = process.env.RENDER_CONCURRENCY ? Number(process.env.RENDER_CONCURRENCY) : null;
const gl = process.env.REMOTION_GL ?? (process.platform === 'linux' ? null : 'angle');
export const chromiumOptions = gl ? { gl } : {};
