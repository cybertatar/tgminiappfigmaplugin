// Colors of Telegram's own system UI that are not theme params but still follow the theme.
// Stored in the Telegram Theme collection under `system/`, without CSS syntax, and computed
// per mode from the preset: either by scheme, or derived from theme params (e.g. contrast).
import { contrastRatio, hexToRgb } from './color';
import type { Scheme } from './preset';
import type { ResolvedThemeParams } from './theme-params';

export interface SystemColorValue {
  hex: string;
  alpha: number;
}

export interface SystemColorInfo {
  description: string;
  value: (params: ResolvedThemeParams, scheme: Scheme) => SystemColorValue;
}

const solid = (hex: string, alpha = 1): SystemColorValue => ({ hex, alpha });

/**
 * Kept for custom checks: `preferred` if it reads on `bg` (contrast >= min), otherwise white or black with `fallbackAlpha`.
 * White wins whenever it reaches 3:1: like Telegram and Material, saturated mid-tones
 * (e.g. the classic Android blue header #527da3) get white content even if black is
 * marginally higher by WCAG.
 */
export function readableOn(bg: string, preferred: string, min: number, fallbackAlpha = 1): SystemColorValue {
  const b = hexToRgb(bg);
  if (contrastRatio(hexToRgb(preferred), b) >= min) return solid(preferred);
  return solid(contrastRatio(WHITE, b) >= 3 ? '#ffffff' : '#000000', fallbackAlpha);
}

const WHITE = { r: 1, g: 1, b: 1 };

// Fullscreen pill colors depend on setHeaderColor (a component variant), and header content
// colors follow Telegram's own rules per variant, so no theme-derived system colors are needed
// right now. Variables removed from this list are deleted from files on the next sync.
export const SYSTEM_COLORS: Record<string, SystemColorInfo> = {};

export type SystemColorKey = string;
export const SYSTEM_COLOR_KEYS = Object.keys(SYSTEM_COLORS) as SystemColorKey[];
export const systemVariableName = (key: SystemColorKey) => `system/${key}`;
