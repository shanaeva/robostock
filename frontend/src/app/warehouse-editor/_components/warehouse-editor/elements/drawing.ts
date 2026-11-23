import { extend } from '@pixi/react';
import { FillGradient, Graphics, GraphicsContext } from 'pixi.js';

extend({ Graphics });

export function verticalGradient(...stops: [number, number][]) {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: stops.map(([offset, color]) => ({ offset, color })),
  });
}

// All instances of the same part reuse its drawing instructions and geometry.
export function sharedDrawing(build: (context: GraphicsContext) => void) {
  let context: GraphicsContext | undefined;

  return (graphics: Graphics) => {
    if (!context) {
      context = new GraphicsContext();
      build(context);
    }
    graphics.context = context;
  };
}
