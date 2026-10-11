import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

/** Remotion leaves its bundle (a copy of public/, tens to hundreds of MB) in the temp folder after every bundle() call and never
 *  removes it. Remove ours when the script ends (only a remotion-webpack-bundle-* folder directly inside the temp dir). */
export const removeBundle = (serveUrl) => {
  try {
    const dir = path.resolve(serveUrl);
    if (path.dirname(dir).toLowerCase() === path.resolve(os.tmpdir()).toLowerCase() && path.basename(dir).startsWith('remotion-webpack-bundle-')) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
    }
  } catch (e) { console.warn(`temp bundle not removed (${e.message}); delete ${serveUrl} by hand`); }
};
