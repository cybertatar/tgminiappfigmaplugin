// B3: geometry of the bottom bar and its Main/Secondary buttons per platform.
// iOS: Telegram-iOS AttachmentPanel.swift, "legacy" panel style used by Mini Apps:
//   buttons 50pt, corner radius 12, 16pt side insets, 16pt between buttons, 8pt above and the
//   home indicator inset right below (panel = 8 + 50 + 34), semibold 17, progress diameter
//   height-22 with a 3pt line, hairline separator (tab bar separator color) on top.
//   Pressed: whole button at alpha 0.65. Shine: white band ~70pt at 50% (overlay) + border at 75%.
// Android: Telegram Android BotButtons.java: buttons 44dp, radius 9, 8dp side insets,
//   10dp between side-by-side buttons, 7dp above/between/below, bold 14, 1px black 10% line above.
//   Pressed: ripple in the text color at 15%. Shine (CellFlickerDrawable): 160dp band in the text
//   color at 25% + 2dp inner border at 80%. Progress (CircularProgressDrawable): 18dp, 2.25dp line.
// Both: an inactive button (is_active=false) looks the same; only taps are ignored. The SDK
//   turns the shine off while inactive or loading.
// Desktop: DRAFT approximations, not yet checked against tdesktop sources.
// Update the numbers here — the plugin rebuilds components in place.
import type { Platform } from '../core';
import { DEVICE } from './device';

export interface BottomBarSpec {
  /** Bar width = typical Mini App viewport width on the platform. */
  width: number;
  padding: { top: number; right: number; bottom: number; left: number };
  /** Space between side-by-side buttons. */
  gap: number;
  /** Space between stacked buttons. */
  gapVertical: number;
  buttonHeight: number;
  radius: number;
  fontSize: number;
  textCase: 'ORIGINAL' | 'UPPER';
  spinnerSize: number;
  spinnerWeight: number;
  /** System inset below the bar (iOS home indicator, Android navigation bar). 0 = none. */
  safeAreaBottom: number;
  /** Line above the bar (system/bottom_bar_separator), its weight in px; 0 = none. */
  separatorWeight: number;
  pressed: 'opacity' | 'ripple';
  shine: 'ios' | 'android';
}

export const BOTTOM_BAR: Record<Platform, BottomBarSpec> = {
  ios: {
    width: DEVICE.ios.width,
    padding: { top: 8, right: 16, bottom: 0, left: 16 },
    gap: 16,
    gapVertical: 16,
    buttonHeight: 50,
    radius: 12,
    fontSize: 17,
    textCase: 'ORIGINAL',
    spinnerSize: 28,
    spinnerWeight: 3,
    safeAreaBottom: DEVICE.ios.safeBottom,
    separatorWeight: 0.5,
    pressed: 'opacity',
    shine: 'ios',
  },
  android: {
    width: DEVICE.android.width,
    padding: { top: 7, right: 8, bottom: 7, left: 8 },
    gap: 10,
    gapVertical: 7,
    buttonHeight: 44,
    radius: 9,
    fontSize: 14,
    textCase: 'ORIGINAL',
    spinnerSize: 18,
    spinnerWeight: 2.25,
    safeAreaBottom: DEVICE.android.safeBottom,
    separatorWeight: 1,
    pressed: 'ripple',
    shine: 'android',
  },
  desktop: {
    width: DEVICE.desktop.width,
    padding: { top: 10, right: 12, bottom: 10, left: 12 },
    gap: 8,
    gapVertical: 8,
    buttonHeight: 42,
    radius: 8,
    fontSize: 14,
    textCase: 'ORIGINAL',
    spinnerSize: 18,
    spinnerWeight: 2,
    safeAreaBottom: DEVICE.desktop.safeBottom,
    separatorWeight: 0,
    pressed: 'ripple',
    shine: 'android',
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
