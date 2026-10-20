// Colors of Telegram's own system UI that are not theme params but still follow the theme's
// light/dark scheme. Stored in the Telegram Theme collection under `system/`, without CSS syntax.
import type { Scheme } from './preset';

export interface SystemColorValue {
  hex: string;
  alpha: number;
}

export interface SystemColorInfo {
  description: string;
  values: Record<Scheme, SystemColorValue>;
}

export const SYSTEM_COLORS = {
  // Measured on iPhone 17 (Telegram iOS, fullscreen Mini App): pills read as #1c1c1c over black
  // in the dark theme and #dcdcdc over white in the light theme.
  fullscreen_control_bg: {
    description: 'Fullscreen floating controls background (system UI, not a theme param)',
    values: { dark: { hex: '#ffffff', alpha: 0.11 }, light: { hex: '#000000', alpha: 0.14 } },
  },
  fullscreen_control_fg: {
    description: 'Fullscreen floating controls icons and text (system UI, not a theme param)',
    values: { dark: { hex: '#ffffff', alpha: 1 }, light: { hex: '#ffffff', alpha: 1 } },
  },
} satisfies Record<string, SystemColorInfo>;

export type SystemColorKey = keyof typeof SYSTEM_COLORS;
export const SYSTEM_COLOR_KEYS = Object.keys(SYSTEM_COLORS) as SystemColorKey[];
export const systemVariableName = (key: SystemColorKey) => `system/${key}`;
