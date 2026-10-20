// System status bar drawn above the header (windowed mode) and over content (fullscreen).
// iOS: measured on iPhone 17 (402pt wide) from client screenshots: 62pt tall (= safeAreaInset.top),
//   time centered at x≈74, icons end ≈34pt from the right edge, Dynamic Island 125x37 at 11pt.
// Android: DRAFT (Material 24dp status bar, time left, punch-hole camera). Desktop has none.
// Height = DEVICE[platform].safeTop.
import type { Platform } from '../core';

export interface StatusBarSpec {
  /** Vertical center of time and icons. */
  centerY: number;
  time: { size: number; weight: 'regular' | 'semibold'; align: 'center' | 'left'; x: number };
  /** Distance from the right edge to the last icon. */
  rightInset: number;
  iconGap: number;
  camera: { kind: 'island'; width: number; height: number; top: number } | { kind: 'hole'; size: number; top: number };
}

export const STATUS_BAR: Partial<Record<Platform, StatusBarSpec>> = {
  ios: {
    centerY: 32,
    time: { size: 17, weight: 'semibold', align: 'center', x: 74 },
    rightInset: 34,
    iconGap: 7,
    camera: { kind: 'island', width: 125, height: 37, top: 11 },
  },
  android: {
    centerY: 12,
    time: { size: 14, weight: 'regular', align: 'left', x: 16 },
    rightInset: 16,
    iconGap: 6,
    camera: { kind: 'hole', size: 10, top: 7 },
  },
};

export const DEFAULT_TIME = '9:41';
