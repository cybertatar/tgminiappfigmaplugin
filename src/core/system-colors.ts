// Colors of Telegram's own system UI that are not theme params but still follow the theme.
// Stored in the Telegram Theme collection under `system/`, without CSS syntax, and computed
// per mode from the preset: either by scheme, or derived from theme params (e.g. contrast).
import { contrastRatio, hexToRgb } from './color';
import type { Platform, Scheme } from './preset';
import type { ResolvedThemeParams } from './theme-params';

export interface SystemColorValue {
  hex: string;
  alpha: number;
}

export interface SystemColorInfo {
  description: string;
  value: (params: ResolvedThemeParams, scheme: Scheme, platform: Platform) => SystemColorValue;
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

// Variables removed from this list are deleted from files on the next sync.
export const SYSTEM_COLORS: Record<string, SystemColorInfo> = {
  // Line above the bottom bar. iOS: tabBar.separatorColor (DefaultDay/DarkPresentationTheme);
  // Android: BotButtons separatorPaint = black at 10%.
  bottom_bar_separator: {
    description: 'Line above the bottom bar (system UI, not a theme param)',
    value: (_, scheme, platform) =>
      platform === 'ios'
        ? scheme === 'dark'
          ? solid('#545458', 0.55)
          : solid('#b2b2b2')
        : solid('#000000', 0.1),
  },
};

export type SystemColorKey = string;
export const SYSTEM_COLOR_KEYS = Object.keys(SYSTEM_COLORS) as SystemColorKey[];
export const systemVariableName = (key: SystemColorKey) => `system/${key}`;
