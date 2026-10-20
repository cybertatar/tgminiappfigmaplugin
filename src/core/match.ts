// Suggests the theme param closest to a raw color (for the unbound-color audit).
import { deltaE2000, hexToRgb, type RGB } from './color';
import { THEME_PARAM_BY_KEY, type ResolvedThemeParams, type ThemeParamKey, type ThemeParamRole } from './theme-params';

export interface ParamMatch {
  key: ThemeParamKey;
  distance: number;
}

export interface MatchOptions {
  /** Only consider params with these roles (e.g. text fills -> 'text' + 'button'). */
  roles?: ThemeParamRole[];
  limit?: number;
}

/** Returns params sorted by CIEDE2000 distance to `color`, nearest first. */
export function rankParams(color: RGB, params: ResolvedThemeParams, opts: MatchOptions = {}): ParamMatch[] {
  const ranked = (Object.keys(params) as ThemeParamKey[])
    .filter((k) => !opts.roles || opts.roles.includes(THEME_PARAM_BY_KEY[k].role))
    .map((key) => ({ key, distance: deltaE2000(color, hexToRgb(params[key])) }))
    // Stable tie-break by key so results are deterministic when values coincide.
    .sort((a, b) => a.distance - b.distance || a.key.localeCompare(b.key));
  return opts.limit ? ranked.slice(0, opts.limit) : ranked;
}

/** Below this CIEDE2000 distance (~1 JND) a match is treated as "same color". */
export const EXACT_MATCH = 1;
/** Above this a suggestion is shown as low-confidence. */
export const WEAK_MATCH = 6;
