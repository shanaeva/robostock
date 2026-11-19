import type { Application } from 'pixi.js';
import { useLayoutEffect, useState } from 'react';

export function useViewportSize(app: Application) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const viewport = app?.renderer?.canvas.parentElement;

    if (!viewport) {
      return;
    }

    const resize = () => {
      if (!app.renderer) {
        return;
      }

      const { clientWidth: width, clientHeight: height } = viewport;
      app.renderer.resize(width, height);
      setSize({ width, height });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();

    return () => observer.disconnect();
  }, [app]);

  return size;
}
