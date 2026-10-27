import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const videoPath = path.join(here, 'bg.mp4');
const routePath = '/deepseek-wallpaper/bg.mp4';

/**
 * The layer is injected into the served index.html instead of a Client slot:
 * `shell.overlay` renders above every column, so a video placed there would
 * cover the UI. A fixed, negative-z-index element that is a direct child of
 * body paints below #root but above the canvas, which is the only seat that
 * behaves like a wallpaper.
 */
const markup = `
<style id="dsh-wallpaper-style">
  #dsh-wallpaper {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
    background: #0b1528;
  }
  #dsh-wallpaper > video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  #dsh-wallpaper > .dsh-wallpaper-veil {
    position: absolute;
    inset: 0;
    background: var(--dsw-alias-bg-base, rgba(8, 15, 30, 0.28));
    opacity: 0;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --dsw-alias-bg-base: rgba(8, 15, 30, 0.28) !important;
      --dsw-alias-bg-layer-1: rgba(13, 23, 43, 0.45) !important;
      --dsw-alias-bg-layer-2: rgba(16, 30, 54, 0.55) !important;
      --dsw-alias-bg-overlay: rgba(9, 17, 33, 0.80) !important;
      --dsw-specific-sidebar-fill: rgba(7, 13, 27, 0.38) !important;
      --dsw-alias-brand-primary: #4d6bfe !important;
    }
  }
  @media (prefers-color-scheme: light) {
    :root {
      --dsw-alias-bg-base: rgba(250, 251, 255, 0.60) !important;
      --dsw-alias-bg-layer-1: rgba(255, 255, 255, 0.86) !important;
      --dsw-alias-bg-layer-2: rgba(255, 255, 255, 0.92) !important;
      --dsw-alias-bg-overlay: rgba(255, 255, 255, 0.97) !important;
      --dsw-specific-sidebar-fill: rgba(250, 251, 255, 0.74) !important;
      --dsw-alias-brand-primary: #2f56d9 !important;
    }
  }
</style>
<div id="dsh-wallpaper" aria-hidden="true">
  <video src="${routePath}" autoplay muted loop playsinline preload="auto"></video>
  <div class="dsh-wallpaper-veil"></div>
</div>`;

/** Serve bg.mp4 with Range support so Chromium can seek and loop it smoothly. */
const serveVideo = (req, res) => {
  let size;
  try {
    size = fs.statSync(videoPath).size;
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('wallpaper video missing');
    return;
  }

  const headers = {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400'
  };

  const range = req.headers.range;
  if (typeof range === 'string') {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      const start = match[1] ? Number.parseInt(match[1], 10) : 0;
      const end = match[2] ? Number.parseInt(match[2], 10) : size - 1;
      if (Number.isFinite(start) && Number.isFinite(end) && start <= end && end < size) {
        res.writeHead(206, {
          ...headers,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': end - start + 1
        });
        fs.createReadStream(videoPath, { start, end }).pipe(res);
        return;
      }
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      res.end();
      return;
    }
  }

  res.writeHead(200, { ...headers, 'Content-Length': size });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(videoPath).pipe(res);
};

const injectWallpaper = (html) => {
  if (html.includes('id="dsh-wallpaper"')) return html;
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/(<body[^>]*>)/i, (openTag) => `${openTag}\n${markup}`);
  }
  return html.replace('</head>', `${markup}\n</head>`);
};

export const inject = ['webServer'];

/** Host half: serve the loop and patch the served index with the backdrop layer. */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: routePath,
    handler: serveVideo
  }));

  ctx.effect(() => ctx.webServer.tapIndex(injectWallpaper));
}
