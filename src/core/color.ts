// Pure color math: hex parsing, Figma RGB conversion, CIEDE2000 distance, WCAG 2.1 contrast.

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

export interface Lab {
  L: number;
  a: number;
  b: number;
}

/** sRGB -> CIELAB (D65). */
export function rgbToLab({ r, g, b }: RGB): Lab {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / 0.95047;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb;
  const z = (0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => {
  const d = (r * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
};

/** CIEDE2000 color difference (Sharma, Wu, Dalal 2005). ~1 is a just-noticeable difference. */
export function deltaE2000Lab(x: Lab, y: Lab): number {
  const C1 = Math.hypot(x.a, x.b);
  const C2 = Math.hypot(y.a, y.b);
  const Cb7 = Math.pow((C1 + C2) / 2, 7);
  const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + Math.pow(25, 7))));
  const a1 = (1 + G) * x.a;
  const a2 = (1 + G) * y.a;
  const C1p = Math.hypot(a1, x.b);
  const C2p = Math.hypot(a2, y.b);
  const h1 = C1p === 0 ? 0 : deg(Math.atan2(x.b, a1));
  const h2 = C2p === 0 ? 0 : deg(Math.atan2(y.b, a2));

  const dL = y.L - x.L;
  const dC = C2p - C1p;
  let dh = 0;
  if (C1p * C2p !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dh / 2));

  const Lb = (x.L + y.L) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hb = h1 + h2;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1 - h2) <= 180) hb = (h1 + h2) / 2;
    else hb = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos(rad(hb - 30)) +
    0.24 * Math.cos(rad(2 * hb)) +
    0.32 * Math.cos(rad(3 * hb + 6)) -
    0.2 * Math.cos(rad(4 * hb - 63));
  const dTheta = 30 * Math.exp(-Math.pow((hb - 275) / 25, 2));
  const Cbp7 = Math.pow(Cbp, 7);
  const Rc = 2 * Math.sqrt(Cbp7 / (Cbp7 + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lb - 50, 2)) / Math.sqrt(20 + Math.pow(Lb - 50, 2));
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;
  return Math.sqrt(
    Math.pow(dL / Sl, 2) + Math.pow(dC / Sc, 2) + Math.pow(dH / Sh, 2) + Rt * (dC / Sc) * (dH / Sh),
  );
}

export function deltaE2000(x: RGB, y: RGB): number {
  return deltaE2000Lab(rgbToLab(x), rgbToLab(y));
}

/** Contrast of text color `fg` (possibly translucent) drawn over an opaque `bg`. */
export function textContrast(fg: RGBA, bg: RGB): number {
  return contrastRatio(composite(fg, bg), bg);
}
