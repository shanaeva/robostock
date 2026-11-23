import { Application } from '@pixi/react';
import { type ComponentProps, useLayoutEffect, useState } from 'react';

type PixiCanvasProps = Pick<
  ComponentProps<typeof Application>,
  | 'children'
  | 'className'
  | 'width'
  | 'height'
  | 'backgroundAlpha'
  | 'backgroundColor'
  | 'antialias'
>;

// A restored route can keep its React state after Pixi has destroyed the canvas.
export function PixiCanvas({
  children,
  className,
  width = 800,
  height = 600,
  backgroundAlpha = 1,
  backgroundColor = 0x000000,
  antialias = false,
}: PixiCanvasProps) {
  const [session, setSession] = useState(0);
  const [readySession, setReadySession] = useState(0);
  useLayoutEffect(() => {
    // Replace the disposed WebGL canvas before the restored route can paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession((previous) => previous + 1);
  }, []);

  if (!session) {
    return null;
  }

  function onInit() {
    setReadySession((current) => Math.max(current, session));
  }

  return (
    <Application
      key={session}
      className={className}
      width={width}
      height={height}
      backgroundAlpha={backgroundAlpha}
      backgroundColor={backgroundColor}
      antialias={antialias}
      autoDensity
      resolution={window.devicePixelRatio}
      autoStart={false}
      onInit={onInit}
    >
      {readySession === session && children}
    </Application>
  );
}
