window.__ModuleLoader__.load({
  id: '@local/deepseek-wallpaper',
  factory(require) {
    const VARS_ID = 'deepseek-wallpaper-vars';
    const STYLE_ID = 'dsh-wallpaper-style';
    const LAYER_ID = 'dsh-wallpaper';
    const VIDEO_ROUTE = '/deepseek-wallpaper/bg.mp4';

    /**
     * Surface colours are re-derived here, not only in the injected stylesheet:
     * the Theme service is the mode-aware owner (light/dark/system), so the
     * palette follows a theme switch instead of being frozen at load time.
     */
    const TOKENS = {
      dark: {
        '--dsw-alias-bg-base': 'rgba(8, 15, 30, 0.28)',
        '--dsw-alias-bg-layer-1': 'rgba(13, 23, 43, 0.45)',
        '--dsw-alias-bg-layer-2': 'rgba(16, 30, 54, 0.55)',
        '--dsw-alias-bg-overlay': 'rgba(9, 17, 33, 0.80)',
        '--dsw-specific-sidebar-fill': 'rgba(7, 13, 27, 0.38)',
        '--dsw-alias-brand-primary': '#4d6bfe'
      },
      light: {
        '--dsw-alias-bg-base': 'rgba(250, 251, 255, 0.60)',
        '--dsw-alias-bg-layer-1': 'rgba(255, 255, 255, 0.86)',
        '--dsw-alias-bg-layer-2': 'rgba(255, 255, 255, 0.92)',
        '--dsw-alias-bg-overlay': 'rgba(255, 255, 255, 0.97)',
        '--dsw-specific-sidebar-fill': 'rgba(250, 251, 255, 0.74)',
        '--dsw-alias-brand-primary': '#2f56d9'
      }
    };

    const modes = {};
    for (const name of Object.keys(TOKENS.dark)) {
      modes[name] = { light: TOKENS.light[name], dark: TOKENS.dark[name] };
    }

    const LAYER_CSS = [
      '#dsh-wallpaper{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;background:#0b1528}',
      '#dsh-wallpaper>video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}',
      '#dsh-wallpaper>.dsh-wallpaper-veil{position:absolute;inset:0;background:var(--dsw-alias-bg-base,rgba(8,15,30,.28));opacity:0}'
    ].join('\n');

    const paintVars = (doc, scheme) => {
      let el = doc.getElementById(VARS_ID);
      if (!el) {
        el = doc.createElement('style');
        el.id = VARS_ID;
        doc.head.appendChild(el);
      }
      const tokens = TOKENS[scheme] || TOKENS.dark;
      el.textContent = ':root{' + Object.keys(tokens).map((k) => k + ':' + tokens[k] + ' !important').join(';') + '}';
    };

    /**
     * Fallback for the case where the index tap did not run: build the layer
     * ourselves. The id check keeps the injected markup and this path from
     * producing two videos.
     */
    const ensureLayer = (doc) => {
      if (!doc.getElementById(STYLE_ID)) {
        const style = doc.createElement('style');
        style.id = STYLE_ID;
        style.textContent = LAYER_CSS;
        doc.head.appendChild(style);
      }
      const existing = doc.getElementById(LAYER_ID);
      if (existing) return existing;

      const layer = doc.createElement('div');
      layer.id = LAYER_ID;
      layer.setAttribute('aria-hidden', 'true');
      const video = doc.createElement('video');
      video.src = VIDEO_ROUTE;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.preload = 'auto';
      const veil = doc.createElement('div');
      veil.className = 'dsh-wallpaper-veil';
      layer.appendChild(video);
      layer.appendChild(veil);
      doc.body.insertBefore(layer, doc.body.firstChild);

      const attempt = () => {
        const played = video.play();
        if (played && typeof played.catch === 'function') played.catch(function () {});
      };
      attempt();
      doc.addEventListener('visibilitychange', attempt, { once: true });
      return layer;
    };

    return {
      inject: ['theme'],
      apply(ctx) {
        const doc = document;

        ctx.effect(() => {
          doc.documentElement.setAttribute('data-deepseek-wallpaper', 'on');
          return () => doc.documentElement.removeAttribute('data-deepseek-wallpaper');
        });

        ctx.effect(() => ctx.theme.overrideTokens('deepseek-wallpaper', modes));

        ctx.effect(() => {
          const sync = () => {
            const snapshot = ctx.theme.getTheme();
            const scheme = snapshot && snapshot.active && snapshot.active.colorScheme === 'light' ? 'light' : 'dark';
            paintVars(doc, scheme);
          };
          sync();
          let off = () => {};
          try {
            const listener = ctx.on('theme/change', sync);
            if (typeof listener === 'function') off = listener;
          } catch (error) {
            off = () => {};
          }
          return () => {
            off();
            const el = doc.getElementById(VARS_ID);
            if (el) el.remove();
          };
        });

        ctx.effect(() => {
          ensureLayer(doc);
          return () => {
            const layer = doc.getElementById(LAYER_ID);
            if (layer) layer.remove();
          };
        });
      }
    };
  }
});
