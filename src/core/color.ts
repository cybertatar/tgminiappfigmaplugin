// Pure color math: hex parsing, Figma RGB conversion, OKLab distance, WCAG 2.1 contrast.

/** Channels in 0..1, same shape as Figma's RGB / RGBA. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}
export interface RGBA extends RGB {
  a: number;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normalizes `#ABC`, `abc`, `#AABBCC` to `#aabbcc`. Returns null if invalid. */
export function normalizeHex(input: string): string | null {
  const m = HEX_RE.exec(input.trim());
  if (!m) return null;
  let h = m[1].toLowerCase();
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return `#${h}`;
}

export function hexToRgb(hex: string): RGB {
  const n = normalizeHex(hex);
  if (!n) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(n.slice(1, 3), 16) / 255,
    g: parseInt(n.slice(3, 5), 16) / 255,
    b: parseInt(n.slice(5, 7), 16) / 255,
  };
}

export function hexToRgba(hex: string, a = 1): RGBA {
  return { ...hexToRgb(hex), a };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Alpha-composites `fg` over an opaque `bg`. */
export function composite(fg: RGBA, bg: RGB): RGB {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  };
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/** WCAG 2.1 relative luminance. */
export function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2.1 contrast ratio, 1..21. */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * WCAG "large text": >= 24px, or >= 18.66px (14pt) and bold (>= 700).
 * Figma font sizes are in px.
 */
export function isLargeText(fontSizePx: number, fontWeight: number): boolean {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
}

export type ContrastLevel = 'pass' | 'fail';

/** AA threshold: 4.5 for normal text, 3 for large text. */
export function contrastThreshold(large: boolean): number {
  return large ? 3 : 4.5;
}

/** Whether light (white) or dark (black) content reads better on `bg`. */
export function preferredOnColor(bg: RGB): 'light' | 'dark' {
  const white = contrastRatio(bg, { r: 1, g: 1, b: 1 });
  const black = contrastRatio(bg, { r: 0, g: 0, b: 0 });
  return white >= black ? 'light' : 'dark';
}

export function isDark(bg: RGB): boolean {
  return preferredOnColor(bg) === 'light';
}

export interface OKLab {
  L: number;
  a: number;
  b: number;
}

/** sRGB -> OKLab (Björn Ottosson, 2020). */
export function rgbToOklab({ r, g, b }: RGB): OKLab {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Euclidean distance in OKLab. ~0.02 is barely noticeable, > 0.1 is clearly different. */
export function deltaEOK(x: RGB, y: RGB): number {
  const a = rgbToOklab(x);
  const b = rgbToOklab(y);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}
