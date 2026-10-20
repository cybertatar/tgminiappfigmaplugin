// B2: floating system controls in fullscreen mode and the safe area guide.
// iOS: measured from the official "SafeAreaInset / ContentSafeAreaInset explained" illustrations
//   (see /reference): two 30pt pills 16pt from the edges — "✕ App name" and "⌄ ⋯" — in a ~42pt row
//   right below the system safe area; translucent dark pills with white content.
// Android: DRAFT by analogy. Desktop has no fullscreen controls.
import type { Platform } from '../core';

export interface FullscreenSpec {
  width: number;
  screenHeight: number;
  /** Status bar / notch: safeAreaInset.top. */
  safeTop: number;
  /** Home indicator / navigation: safeAreaInset.bottom. */
  safeBottom: number;
  /** Row with the controls: contentSafeAreaInset.top. */
  controlsRow: number;
  sideInset: number;
  pill: { height: number; paddingLeft: number; paddingRight: number; gap: number; fontSize: number; iconSize: number };
  rightGap: number;
}

export const FULLSCREEN: Partial<Record<Platform, FullscreenSpec>> = {
  ios: {
    width: 393,
    screenHeight: 852,
    safeTop: 59,
    safeBottom: 34,
    controlsRow: 42,
    sideInset: 16,
    pill: { height: 30, paddingLeft: 10, paddingRight: 12, gap: 8, fontSize: 14, iconSize: 14 },
    rightGap: 18,
  },
  android: {
    width: 412,
    screenHeight: 915,
    safeTop: 40,
    safeBottom: 24,
    controlsRow: 48,
    sideInset: 16,
    pill: { height: 32, paddingLeft: 10, paddingRight: 12, gap: 8, fontSize: 14, iconSize: 16 },
    rightGap: 18,
  },
};

export const FULLSCREEN_PLATFORMS = Object.keys(FULLSCREEN) as Platform[];

export const FULLSCREEN_LEFT = ['Close', 'Back'] as const;
export type FullscreenLeft = (typeof FULLSCREEN_LEFT)[number];

/** Dark: dark pills with white content (over light or busy content); Light: the inverse. */
export const FULLSCREEN_TONES = ['Dark', 'Light'] as const;
export type FullscreenTone = (typeof FULLSCREEN_TONES)[number];

export const TONE_COLORS: Record<FullscreenTone, { pill: string; pillOpacity: number; fg: string }> = {
  Dark: { pill: '#000000', pillOpacity: 0.45, fg: '#ffffff' },
  Light: { pill: '#ffffff', pillOpacity: 0.7, fg: '#000000' },
};

export const FULLSCREEN_STATES = ['Default', 'Left pressed', 'Right pressed'] as const;
export type FullscreenState = (typeof FULLSCREEN_STATES)[number];
