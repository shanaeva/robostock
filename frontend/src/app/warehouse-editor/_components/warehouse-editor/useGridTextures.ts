import { Assets, Rectangle, Texture } from 'pixi.js';
import { useEffect, useState } from 'react';
import atlas from './grid-atlas.png';
import { ATLAS_SCALE, SLICES } from './constants';
import type { GridTile } from './types';

export function useGridTextures() {
  const [tiles, setTiles] = useState<GridTile[]>([]);

  useEffect(() => {
    let disposed = false;
    const frames: GridTile[] = [];
    void Assets.load<Texture>(atlas.src).then(({ source }) => {
      if (disposed) {
        return;
      }

      for (const [row, vertical] of SLICES.entries()) {
        for (const [column, horizontal] of SLICES.entries()) {
          const frame = new Rectangle(
            horizontal.offset * ATLAS_SCALE,
            vertical.offset * ATLAS_SCALE,
            horizontal.size * ATLAS_SCALE,
            vertical.size * ATLAS_SCALE,
          );
          frames.push({ row, column, texture: new Texture({ source, frame }) });
        }
      }
      setTiles(frames);
    });

    return () => {
      disposed = true;
      frames.forEach(({ texture }) => texture.destroy());
    };
  }, []);

  return tiles;
}
