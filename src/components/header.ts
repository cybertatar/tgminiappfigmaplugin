// B1: Mini App header in windowed mode (compact / fullsize).
// iOS: measured from the official "WebViewColors explained" illustration (see /reference):
//   56pt tall, 16pt side insets, text "Cancel" left, title + "bot" centered, ⋯ in a ~22pt circle right.
// Default color (no setHeaderColor), from client sources:
//   iOS: navigation bar = header_bg_color (WebAppController.updateHeaderBackgroundColor);
//   Android: windowBackgroundWhite = section_bg_color (BotWebViewAttachedSheet), title text_color.
// Custom setHeaderColor(#hex): content is black or white by the color's lightness (iOS > 0.5,
//   Android luminance >= 0.5), secondary text at 0.5–0.64 alpha on iOS.
// Android: action bar 56dp, close/back icon (BackDrawable), ⋮ menu. Desktop: DRAFT.
import type { Platform, ThemeParamKey } from '../core';
import { DEVICE } from './device';

export interface HeaderSpec {
  width: number;
  height: number;
  paddingX: number;
  /** Space between left button, title and right button. */
  gap: number;
  /** iOS keeps the title centered: both side slots get this fixed width. 0 = hug content. */
  sideWidth: number;
  titleSize: number;
  subtitleSize: number;
  titleAlign: 'CENTER' | 'LEFT';
  /** iOS: text button ("Cancel" / "‹ Back"); others: icon button (✕ / ←). */
  leftStyle: 'text' | 'icon';
  leftTextSize: number;
  menuIcon: 'dots-circle' | 'dots-v';
  iconSize: number;
  /** Header color when the app hasn't called setHeaderColor. */
  defaultBg: ThemeParamKey;
  /** Theme colors of the content when the header uses a theme color. */
  fg: { title: ThemeParamKey; subtitle: ThemeParamKey; buttons: ThemeParamKey };
}

export const HEADER: Record<Platform, HeaderSpec> = {
  ios: {
    width: DEVICE.ios.width,
    height: 56,
    paddingX: 16,
    gap: 8,
    sideWidth: 88,
    titleSize: 17,
    subtitleSize: 13,
    titleAlign: 'CENTER',
    leftStyle: 'text',
    leftTextSize: 17,
    menuIcon: 'dots-circle',
    iconSize: 22,
    defaultBg: 'header_bg_color',
    fg: { title: 'text_color', subtitle: 'accent_text_color', buttons: 'accent_text_color' },
  },
  android: {
    width: DEVICE.android.width,
    height: 56,
    paddingX: 16,
    gap: 32,
    sideWidth: 0,
    titleSize: 18,
    subtitleSize: 14,
    titleAlign: 'LEFT',
    leftStyle: 'icon',
    leftTextSize: 0,
    menuIcon: 'dots-v',
    iconSize: 24,
    defaultBg: 'section_bg_color',
    fg: { title: 'text_color', subtitle: 'hint_color', buttons: 'text_color' },
  },
  desktop: {
    width: DEVICE.desktop.width,
    height: 48,
    paddingX: 12,
    gap: 16,
    sideWidth: 0,
    titleSize: 15,
    subtitleSize: 12,
    titleAlign: 'LEFT',
    leftStyle: 'icon',
    leftTextSize: 0,
    menuIcon: 'dots-v',
    iconSize: 20,
    defaultBg: 'header_bg_color',
    fg: { title: 'text_color', subtitle: 'hint_color', buttons: 'text_color' },
  },
};

/** Close by default; Back when the app calls `BackButton.show()`. */
export const HEADER_LEFT = ['Close', 'Back'] as const;
export type HeaderLeft = (typeof HEADER_LEFT)[number];

/**
 * Header color as set by `setHeaderColor`: a theme key, or a custom hex.
 * Custom colors can't follow the theme, so content contrast is picked per variant.
 */
export const HEADER_COLORS = ['Default', 'Background', 'Secondary', 'Custom dark', 'Custom light'] as const;
export type HeaderColor = (typeof HEADER_COLORS)[number];

export const HEADER_COLOR_PARAM: Partial<Record<HeaderColor, ThemeParamKey>> = {
  Background: 'bg_color',
  Secondary: 'secondary_bg_color',
};

/** Placeholder colors for custom headers: designers override the fill on the instance. */
export const CUSTOM_HEADER: Record<'Custom dark' | 'Custom light', { bg: string; fg: string; subtitleOpacity: number }> =
  {
    'Custom dark': { bg: '#1c1c1e', fg: '#ffffff', subtitleOpacity: 0.64 },
    'Custom light': { bg: '#ffffff', fg: '#000000', subtitleOpacity: 0.64 },
  };

export const HEADER_STATES = ['Default', 'Left pressed', 'Menu pressed'] as const;
export type HeaderState = (typeof HEADER_STATES)[number];

export const LEFT_TEXT: Record<HeaderLeft, string> = { Close: 'Cancel', Back: 'Back' };

export const PRESSED_OPACITY = 0.4;
