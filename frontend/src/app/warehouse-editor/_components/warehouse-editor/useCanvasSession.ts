import { useLayoutEffect, useState } from 'react';

// A restored route can keep its React state after Pixi has destroyed the canvas.
export function useCanvasSession() {
  const [session, setSession] = useState(0);
  const [readySession, setReadySession] = useState(0);
  useLayoutEffect(() => {
    // Replace the disposed WebGL canvas before the restored route can paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession((previous) => previous + 1);
  }, []);

  function onInit() {
    setReadySession((current) => Math.max(current, session));
  }

  return { session, ready: readySession === session, onInit };
}
