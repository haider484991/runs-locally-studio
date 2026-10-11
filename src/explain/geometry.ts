export type Rect = { x: number; y: number; w: number; h: number };
export const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
export const pad = (r: Rect, p: number): Rect => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p });
export const union = (rs: Rect[]): Rect => {
  const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

let _ctx: CanvasRenderingContext2D | null = null;
/** Width of `text` in `font` ("700 40px 'JetBrains Mono'"). Deterministic once the fonts are loaded (FONT.ready is awaited before any frame). */
export const measure = (text: string, font: string): number => {
  if (!_ctx) _ctx = document.createElement('canvas').getContext('2d');
  if (!_ctx) return text.length * 20;
  _ctx.font = font;
  return _ctx.measureText(text).width;
};
