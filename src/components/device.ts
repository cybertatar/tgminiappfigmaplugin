// System insets per platform — one place for the header inset, bottom bar and fullscreen layouts.
// At runtime Telegram reports these as safeAreaInset (the sniffer page logs real values).
//
// iOS: iPhone 17 (402x874pt). Telegram reports safeAreaInset.top = the status bar height (54pt),
//   not the 62pt UIKit safe area (WebAppController customInsets.top = layout.statusBarHeight);
//   fullscreen pills sit at 54 + 8 = 62pt, matching client screenshots. Home indicator 34pt.
// Android: Figma's "Android Compact" frame (412x917dp).
//   Status bar: AOSP SystemBarUtils.getStatusBarHeight = max(cutout top inset, 24dp), so on phones
//   with a camera hole it equals the cutout. Pixel 10 Pro measures 156px at density 3.0 = 52dp.
//   Navigation: AOSP NavigationBarModeGesturalOverlay sets 24dp for gesture navigation;
//   3-button navigation is 48dp (core/res dimens navigation_bar_height).
// Desktop: a window, no system insets.
import type { Platform } from '../core';

export interface DeviceSpec {
  label: string;
  width: number;
  height: number;
  /** safeAreaInset.top: status bar / cutout. */
  safeTop: number;
  /** safeAreaInset.bottom: home indicator / navigation bar. */
  safeBottom: number;
}

export const DEVICE: Record<Platform, DeviceSpec> = {
  ios: {
    label: 'iPhone 17',
    width: 402,
    height: 874,
    safeTop: 54,
    safeBottom: 34,
  },
  android: {
    label: 'Android Compact, gesture navigation',
    width: 412,
    height: 917,
    safeTop: 52,
    safeBottom: 24,
  },
  desktop: {
    label: 'Desktop window',
    width: 400,
    height: 640,
    safeTop: 0,
    safeBottom: 0,
  },
};
