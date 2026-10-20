// B3: geometry of the bottom bar and its Main/Secondary buttons per platform.
// DRAFT: values are approximations, not yet measured from client screenshots (see /reference).
// Update the numbers here — the plugin rebuilds components in place.
import type { Platform } from '../core';

export interface BottomBarSpec {
  /** Bar width = typical Mini App viewport width on the platform. */
  width: number;
  padding: { top: number; right: number; bottom: number; left: number };
  /** Space between Main and Secondary buttons. */
  gap: number;
  buttonHeight: number;
  radius: number;
  fontSize: number;
  textCase: 'ORIGINAL' | 'UPPER';
  spinnerSize: number;
  /** System safe area below the bar (iOS home indicator). 0 = none. */
  safeAreaBottom: number;
}

export const BOTTOM_BAR: Record<Platform, BottomBarSpec> = {
  ios: {
    width: 393,
    padding: { top: 8, right: 16, bottom: 8, left: 16 },
    gap: 10,
    buttonHeight: 50,
    radius: 12,
    fontSize: 17,
    textCase: 'ORIGINAL',
    spinnerSize: 22,
    safeAreaBottom: 34,
  },
  android: {
    width: 412,
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    gap: 8,
    buttonHeight: 48,
    radius: 10,
    fontSize: 15,
    textCase: 'ORIGINAL',
    spinnerSize: 20,
    safeAreaBottom: 0,
  },
  desktop: {
    width: 400,
    padding: { top: 10, right: 12, bottom: 10, left: 12 },
    gap: 8,
    buttonHeight: 42,
    radius: 8,
    fontSize: 14,
    textCase: 'ORIGINAL',
    spinnerSize: 18,
    safeAreaBottom: 0,
  },
};

export const PLATFORM_LABEL: Record<Platform, string> = { ios: 'iOS', android: 'Android', desktop: 'Desktop' };

export const BUTTON_TYPES = ['Main', 'Secondary'] as const;
export type ButtonType = (typeof BUTTON_TYPES)[number];

/** `is_active=false` → Inactive, `showProgress()` → Loading, `has_shine_effect` → Shine. */
export const BUTTON_STATES = ['Default', 'Pressed', 'Inactive', 'Loading', 'Shine'] as const;
export type ButtonState = (typeof BUTTON_STATES)[number];

/** Secondary position follows `SecondaryButton.position` (left/right/top/bottom). */
export const BAR_LAYOUTS = [
  'Main only',
  'Secondary only',
  'Secondary left',
  'Secondary right',
  'Secondary top',
  'Secondary bottom',
] as const;
export type BarLayout = (typeof BAR_LAYOUTS)[number];

export function barArrangement(layout: BarLayout): { direction: 'HORIZONTAL' | 'VERTICAL'; order: ButtonType[] } {
  switch (layout) {
    case 'Main only':
      return { direction: 'HORIZONTAL', order: ['Main'] };
    case 'Secondary only':
      return { direction: 'HORIZONTAL', order: ['Secondary'] };
    case 'Secondary left':
      return { direction: 'HORIZONTAL', order: ['Secondary', 'Main'] };
    case 'Secondary right':
      return { direction: 'HORIZONTAL', order: ['Main', 'Secondary'] };
    case 'Secondary top':
      return { direction: 'VERTICAL', order: ['Secondary', 'Main'] };
    case 'Secondary bottom':
      return { direction: 'VERTICAL', order: ['Main', 'Secondary'] };
  }
}

/** Default colors per Telegram docs (BottomButton). */
export const BUTTON_COLORS = {
  Main: { bg: 'button_color', fg: 'button_text_color' },
  Secondary: { bg: 'bottom_bar_bg_color', fg: 'button_color' },
} as const;

export const DEFAULT_LABEL: Record<ButtonType, string> = { Main: 'Continue', Secondary: 'Cancel' };
