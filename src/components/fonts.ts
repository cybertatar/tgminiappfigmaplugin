// Platform UI fonts, in order of preference. Inter is always available in Figma.
import type { Platform } from '../core';

export interface FontCandidate {
  family: string;
  /** Style names differ between foundries: "Semibold", "SemiBold", "Semi Bold". */
  styles: string[];
}

export const BUTTON_FONTS: Record<Platform, FontCandidate[]> = {
  ios: [
    { family: 'SF Pro Text', styles: ['Semibold'] },
    { family: 'SF Pro', styles: ['Semibold'] },
  ],
  android: [{ family: 'Roboto', styles: ['Medium'] }],
  desktop: [{ family: 'Open Sans', styles: ['SemiBold', 'Semibold'] }],
};

export const FALLBACK_FONT = { family: 'Inter', style: 'Semi Bold' };

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
