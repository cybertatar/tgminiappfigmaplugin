// B2: fullscreen mode — floating system controls and the safe area guide, as one screen-sized component.
// iOS: measured on iPhone 17 (402x874pt) from client screenshots, dark and light themes:
//   "✕ Close" pill 76x30 and "⌄ ⋯" pill 72x30, 16pt from the edges, top edge at the system
//   safe area (62pt). Pill colors follow the theme scheme (system/fullscreen_control_* variables).
// Android: DRAFT by analogy. Desktop has no fullscreen controls.
import type { Platform } from '../core';

export interface PillSpec {
  height: number;
  paddingLeft: number;
  paddingRight: number;
  gap: number;
}

export interface FullscreenSpec {
  width: number;
  screenHeight: number;
  /** Status bar / notch: safeAreaInset.top. */
  safeTop: number;
  /** Home indicator / navigation: safeAreaInset.bottom. */
  safeBottom: number;
  /** contentSafeAreaInset.top: the band the controls occupy below the safe area. */
  controlsRow: number;
  sideInset: number;
  left: PillSpec & { iconSize: number; iconWeight: number; fontSize: number };
  right: PillSpec & { chevronSize: number; dotsSize: number };
}

export const FULLSCREEN: Partial<Record<Platform, FullscreenSpec>> = {
  ios: {
    width: 402,
    screenHeight: 874,
    safeTop: 62,
    safeBottom: 34,
    // Not measurable from screenshots; check with the sniffer (contentSafeAreaInset.top).
    controlsRow: 42,
    sideInset: 16,
    left: { height: 30, paddingLeft: 9, paddingRight: 12, gap: 10, iconSize: 11.5, iconWeight: 1.8, fontSize: 13 },
    right: { height: 30, paddingLeft: 9, paddingRight: 8, gap: 20, chevronSize: 15, dotsSize: 20 },
  },
  android: {
    width: 412,
    screenHeight: 915,
    safeTop: 40,
    safeBottom: 24,
    controlsRow: 48,
    sideInset: 16,
    left: { height: 32, paddingLeft: 10, paddingRight: 12, gap: 10, iconSize: 12, iconWeight: 2, fontSize: 14 },
    right: { height: 32, paddingLeft: 10, paddingRight: 9, gap: 20, chevronSize: 15, dotsSize: 20 },
  },
};

export const FULLSCREEN_PLATFORMS = Object.keys(FULLSCREEN) as Platform[];

export const FULLSCREEN_LEFT = ['Close', 'Back'] as const;
export type FullscreenLeft = (typeof FULLSCREEN_LEFT)[number];

export const FULLSCREEN_STATES = ['Default', 'Left pressed', 'Right pressed'] as const;
export type FullscreenState = (typeof FULLSCREEN_STATES)[number];

export const FULLSCREEN_LABEL: Record<FullscreenLeft, string> = { Close: 'Close', Back: 'Back' };
