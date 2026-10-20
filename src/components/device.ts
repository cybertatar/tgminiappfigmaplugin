// System insets per platform — one place for the status bar, bottom bar and fullscreen layouts.
// At runtime Telegram reports these as safeAreaInset (the sniffer page logs real values).
// iOS: iPhone 17 (402x874pt): status bar / Dynamic Island 62pt, home indicator 34pt.
// Android: DRAFT for a typical Pixel-size phone (412x915dp) with gesture navigation:
//   Material status bar 24dp, gesture bar 24dp with a handle. Devices with a tall cutout report
//   a taller status bar; 3-button navigation is 48dp.
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
    label: 'Android phone, gesture navigation (draft)',
    width: 412,
    height: 915,
    safeTop: 24,
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
