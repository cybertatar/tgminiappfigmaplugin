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
 * `preferred` if it reads on `bg` (contrast >= min), otherwise white or black with `fallbackAlpha`.
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

export const SYSTEM_COLORS = {
  // Measured on iPhone 17 (Telegram iOS, fullscreen Mini App): pills read as #1c1c1c over black
  // in the dark theme and #dcdcdc over white in the light theme; content is white in both.
  fullscreen_control_bg: {
    description: 'Fullscreen floating controls background (system UI, not a theme param)',
    value: (_, scheme) => (scheme === 'dark' ? solid('#ffffff', 0.11) : solid('#000000', 0.14)),
  },
  fullscreen_control_fg: {
    description: 'Fullscreen floating controls icons and text (system UI, not a theme param)',
    value: () => solid('#ffffff'),
  },
  status_bar_fg: {
    description: 'Status bar time and icons over Mini App content in fullscreen (system UI)',
    value: (_, scheme) => solid(scheme === 'dark' ? '#ffffff' : '#000000'),
  },
  // Header content over header_bg_color: theme color when readable, else white/black.
  header_title: {
    description: 'Header title over header_bg_color: text_color, or white/black when it lacks contrast',
    value: (p) => readableOn(p.header_bg_color, p.text_color, 4.5),
  },
  header_accent: {
    description: 'Header buttons over header_bg_color: accent_text_color, or white/black when it lacks contrast',
    value: (p) => readableOn(p.header_bg_color, p.accent_text_color, 3),
  },
  header_hint: {
    description: 'Header subtitle over header_bg_color: hint_color, or translucent white/black when it lacks contrast',
    value: (p) => readableOn(p.header_bg_color, p.hint_color, 3, 0.7),
  },
} satisfies Record<string, SystemColorInfo>;

export type SystemColorKey = keyof typeof SYSTEM_COLORS;
export const SYSTEM_COLOR_KEYS = Object.keys(SYSTEM_COLORS) as SystemColorKey[];
export const systemVariableName = (key: SystemColorKey) => `system/${key}`;
