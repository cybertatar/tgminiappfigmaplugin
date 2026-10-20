// B2: fullscreen mode — floating system controls and the safe area guide, as one screen-sized component.
// iOS: Telegram-iOS FullscreenControlsComponent.swift (+ iPhone 17 screenshots for positions):
//   pills 30pt tall, 16pt from the edges; left = 30pt icon area + "Close"/"Back" in SF Pro Rounded
//   13 semibold; right pill 72x30 (collapse + more); pressed alpha 0.6.
//   Colors depend on the status bar style, which follows setHeaderColor (WebAppController):
//   by default the status bar is light → pills white(0.45) at 25% with white content;
//   after setHeaderColor with a light color → pills white(0.7) at 35% with #808080 content.
// Android: DRAFT by analogy. Desktop has no fullscreen controls.
import type { Platform } from '../core';
import { DEVICE } from './device';

export interface PillSpec {
  height: number;
  paddingLeft: number;
  paddingRight: number;
  gap: number;
}

export interface FullscreenSpec {
  /** Screen size and system insets come from DEVICE. */
  width: number;
  screenHeight: number;
  safeTop: number;
  safeBottom: number;
  /** contentSafeAreaInset.top: the band the controls occupy below the safe area. */
  controlsRow: number;
  /** Gap above (and below) the pills inside that band. */
  controlsMargin: number;
  sideInset: number;
  left: PillSpec & { iconSize: number; iconWeight: number; fontSize: number };
  right: PillSpec & { chevronSize: number; dotsSize: number };
}

function screen(p: Platform) {
  const d = DEVICE[p];
  return { width: d.width, screenHeight: d.height, safeTop: d.safeTop, safeBottom: d.safeBottom };
}

export const FULLSCREEN: Partial<Record<Platform, FullscreenSpec>> = {
  ios: {
    ...screen('ios'),
    // WebAppController: controls at statusBarHeight + 8, contentSafeAreaInset.top = 30 + 8 * 2.
    controlsRow: 46,
    controlsMargin: 8,
    sideInset: 16,
    left: { height: 30, paddingLeft: 9, paddingRight: 12, gap: 10, iconSize: 11.5, iconWeight: 1.8, fontSize: 13 },
    right: { height: 30, paddingLeft: 9, paddingRight: 8, gap: 20, chevronSize: 15, dotsSize: 20 },
  },
  android: {
    ...screen('android'),
    controlsRow: 48,
    controlsMargin: 8,
    sideInset: 16,
    left: { height: 32, paddingLeft: 10, paddingRight: 12, gap: 10, iconSize: 12, iconWeight: 2, fontSize: 14 },
    right: { height: 32, paddingLeft: 10, paddingRight: 9, gap: 20, chevronSize: 15, dotsSize: 20 },
  },
};

export const FULLSCREEN_PLATFORMS = Object.keys(FULLSCREEN) as Platform[];

export const FULLSCREEN_LEFT = ['Close', 'Back'] as const;
export type FullscreenLeft = (typeof FULLSCREEN_LEFT)[number];

/** Status bar style: Light (default) or Dark (the app set a light header color). */
export const FULLSCREEN_STATUS = ['Light', 'Dark'] as const;
export type FullscreenStatus = (typeof FULLSCREEN_STATUS)[number];

export const PILL_COLORS: Record<FullscreenStatus, { bg: string; bgAlpha: number; fg: string }> = {
  Light: { bg: '#737373', bgAlpha: 0.25, fg: '#ffffff' },
  Dark: { bg: '#b3b3b3', bgAlpha: 0.35, fg: '#808080' },
};

export const FULLSCREEN_PRESSED_OPACITY = 0.6;

export const FULLSCREEN_STATES = ['Default', 'Left pressed', 'Right pressed'] as const;
export type FullscreenState = (typeof FULLSCREEN_STATES)[number];

export const FULLSCREEN_LABEL: Record<FullscreenLeft, string> = { Close: 'Close', Back: 'Back' };
