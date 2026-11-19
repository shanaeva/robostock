import type { PaletteElement } from '../types';

export const PREVIEW_WIDTH = 40;
export const PALETTE_ROW_HEIGHT = 60;
export const PALETTE_ELEMENTS = [
  { id: 'rack', label: 'Стеллаж' },
  { id: 'robot', label: 'Робот' },
  { id: 'charger', label: 'Зарядная станция' },
  { id: 'receiving', label: 'Приёмка' },
  { id: 'shipping', label: 'Отгрузка' },
] as const satisfies readonly PaletteElement[];
