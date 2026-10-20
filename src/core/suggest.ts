// C1: picks a theme param for a raw color, taking into account where the color is used.
import type { RGB } from './color';
import { EXACT_MATCH, rankParams, WEAK_MATCH, type ParamMatch } from './match';
import type { ResolvedThemeParams, ThemeParamKey } from './theme-params';

/** Where a paint sits: text fill, container/shape fill, small vector (icon) fill, or stroke. */
export type PaintTarget = 'text' | 'fill' | 'icon' | 'stroke';

// Many params share a value within one theme (white = bg, section bg and button text).
// Among equally close params, the one earlier in this list wins.
const PREFERENCE: Record<PaintTarget, ThemeParamKey[]> = {
  text: [
    'text_color',
    'hint_color',
    'subtitle_text_color',
    'accent_text_color',
    'link_color',
    'section_header_text_color',
    'destructive_text_color',
    'button_text_color',
  ],
  fill: [
    'bg_color',
    'secondary_bg_color',
    'section_bg_color',
    'button_color',
    'header_bg_color',
    'bottom_bar_bg_color',
    'section_separator_color',
  ],
  icon: [
    'text_color',
    'hint_color',
    'accent_text_color',
    'link_color',
    'button_text_color',
    'button_color',
    'destructive_text_color',
  ],
  stroke: ['section_separator_color', 'hint_color', 'text_color', 'button_color'],
};

export type MatchQuality = 'exact' | 'near' | 'weak';

export const matchQuality = (distance: number): MatchQuality =>
  distance <= EXACT_MATCH ? 'exact' : distance <= WEAK_MATCH ? 'near' : 'weak';

export interface Suggestion extends ParamMatch {
  quality: MatchQuality;
}

export function suggestParam(color: RGB, params: ResolvedThemeParams, target: PaintTarget): Suggestion {
  const ranked = rankParams(color, params);
  const pref = PREFERENCE[target];
  const prefIndex = (k: ThemeParamKey) => {
    const i = pref.indexOf(k);
    return i === -1 ? pref.length : i;
  };
  const best = ranked[0].distance;
  const [pick] = ranked
    .filter((m) => m.distance <= best + EXACT_MATCH)
    .sort((a, b) => prefIndex(a.key) - prefIndex(b.key) || a.distance - b.distance);
  return { ...pick, quality: matchQuality(pick.distance) };
}
