/**
 * Coarse public cell for a private point: a fixed ~1 km grid, so repeated requests or jitter
 * averaging cannot reveal the exact spot (docs/06 "مکان"). T11 may switch to a hierarchical index.
 */
export const PUBLIC_CELL_DEG = 0.01;

export function publicCellId(lng: number, lat: number): string {
  const x = Math.min(Math.floor(lng / PUBLIC_CELL_DEG), 17_999);
  const y = Math.min(Math.floor(lat / PUBLIC_CELL_DEG), 8_999);
  return `g${PUBLIC_CELL_DEG}:${x}:${y}`;
}

/** Center of the cell, the only coordinate a public DTO may carry. */
export function publicCellCenter(cellId: string): [number, number] {
  const match = /^g([\d.]+):(-?\d+):(-?\d+)$/.exec(cellId);
  if (!match) throw new Error(`invalid cell id: ${cellId}`);
  const size = Number(match[1]);
  return [(Number(match[2]) + 0.5) * size, (Number(match[3]) + 0.5) * size];
}
