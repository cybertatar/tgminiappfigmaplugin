// A3: geometry of the theme matrix section — one row of screen copies with labels above.

export interface MatrixLayoutOptions {
  padding: number;
  gap: number;
  labelHeight: number;
  labelGap: number;
}

export const MATRIX_LAYOUT: MatrixLayoutOptions = { padding: 80, gap: 80, labelHeight: 56, labelGap: 24 };

export interface Point {
  x: number;
  y: number;
}

export interface MatrixLayout {
  /** Positions relative to the section. */
  cells: { label: Point; screen: Point }[];
  width: number;
  height: number;
}

export function layoutMatrix(
  count: number,
  screen: { width: number; height: number },
  o: MatrixLayoutOptions = MATRIX_LAYOUT,
): MatrixLayout {
  const cells = Array.from({ length: count }, (_, i) => {
    const x = o.padding + i * (screen.width + o.gap);
    return { label: { x, y: o.padding }, screen: { x, y: o.padding + o.labelHeight + o.labelGap } };
  });
  return {
    cells,
    width: o.padding * 2 + count * screen.width + Math.max(0, count - 1) * o.gap,
    height: o.padding * 2 + o.labelHeight + o.labelGap + screen.height,
  };
}
