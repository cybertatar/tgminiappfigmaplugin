// Platform UI fonts, in order of preference. Inter is always available in Figma.
import type { Platform } from '../core';

export interface FontCandidate {
  family: string;
  /** Style names differ between foundries: "Semibold", "SemiBold", "Semi Bold". */
  styles: string[];
}

/** 'rounded': SF Pro Rounded semibold on iOS (fullscreen controls); semibold elsewhere. */
export type FontWeight = 'regular' | 'semibold' | 'rounded';

export const PLATFORM_FONTS: Record<Platform, Record<FontWeight, FontCandidate[]>> = {
  ios: {
    regular: [
      { family: 'SF Pro Text', styles: ['Regular'] },
      { family: 'SF Pro', styles: ['Regular'] },
    ],
    semibold: [
      { family: 'SF Pro Text', styles: ['Semibold'] },
      { family: 'SF Pro', styles: ['Semibold'] },
    ],
    rounded: [
      { family: 'SF Pro Rounded', styles: ['Semibold'] },
      { family: 'SF Pro', styles: ['Semibold'] },
    ],
  },
  android: {
    regular: [{ family: 'Roboto', styles: ['Regular'] }],
    semibold: [{ family: 'Roboto', styles: ['Medium'] }],
    rounded: [{ family: 'Roboto', styles: ['Medium'] }],
  },
  desktop: {
    regular: [{ family: 'Open Sans', styles: ['Regular'] }],
    semibold: [{ family: 'Open Sans', styles: ['SemiBold', 'Semibold'] }],
    rounded: [{ family: 'Open Sans', styles: ['SemiBold', 'Semibold'] }],
  },
};

export const FALLBACK_FONTS: Record<FontWeight, { family: string; style: string }> = {
  regular: { family: 'Inter', style: 'Regular' },
  semibold: { family: 'Inter', style: 'Semi Bold' },
  rounded: { family: 'Inter', style: 'Semi Bold' },
};

/** Picks the first available candidate; `available` holds "family|style" keys. */
export function pickFont(
  candidates: FontCandidate[],
  available: Set<string>,
): { family: string; style: string } | null {
  for (const c of candidates) {
    for (const style of c.styles) {
      if (available.has(`${c.family}|${style}`)) return { family: c.family, style };
    }
  }
  return null;
}
