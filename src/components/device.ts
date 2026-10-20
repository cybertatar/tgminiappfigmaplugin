// System insets per platform — one place for the header inset, bottom bar and fullscreen layouts.
// At runtime Telegram reports these as safeAreaInset (the sniffer page logs real values).
//
// iOS: iPhone 17 (402x874pt): status bar / Dynamic Island 62pt (measured on client screenshots),
//   home indicator 34pt.
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
  /** Handle drawn in the bottom inset (iOS home indicator, Android gesture handle). */
  handle: { width: number; height: number; bottomOffset: number } | null;
}

export const DEVICE: Record<Platform, DeviceSpec> = {
  ios: {
    label: 'iPhone 17',
    width: 402,
    height: 874,
    safeTop: 62,
    safeBottom: 34,
    handle: { width: 134, height: 5, bottomOffset: 8 },
  },
  android: {
    label: 'Android Compact, gesture navigation',
    width: 412,
    height: 917,
    safeTop: 52,
    safeBottom: 24,
    handle: { width: 108, height: 4, bottomOffset: 10 },
  },
  desktop: {
    label: 'Desktop window',
    width: 400,
    height: 640,
    safeTop: 0,
    safeBottom: 0,
    handle: null,
  },
};
