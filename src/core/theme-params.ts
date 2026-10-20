// Single source of truth for Telegram theme params.
// Verified against https://core.telegram.org/bots/webapps (Bot API 10.1, 2026-10).
// When Telegram adds a key, add it here — everything else derives from this list.

export const THEME_PARAM_KEYS = [
  'bg_color',
  'secondary_bg_color',
  'header_bg_color',
  'bottom_bar_bg_color',
  'section_bg_color',
  'section_separator_color',
  'text_color',
  'accent_text_color',
  'section_header_text_color',
  'subtitle_text_color',
  'destructive_text_color',
  'hint_color',
  'link_color',
  'button_color',
  'button_text_color',
] as const;

export type ThemeParamKey = (typeof THEME_PARAM_KEYS)[number];

/** All keys optional, values are #rrggbb. Mirrors `Telegram.WebApp.themeParams`. */
export type ThemeParams = Partial<Record<ThemeParamKey, string>>;
/** Same, but every key present (after fallbacks are applied). */
export type ResolvedThemeParams = Record<ThemeParamKey, string>;

export type ThemeParamRole = 'background' | 'text' | 'button' | 'separator';

export interface ThemeParamInfo {
  key: ThemeParamKey;
  cssVar: string;
  description: string;
  role: ThemeParamRole;
  /** Bot API version the key appeared in. */
  since: string;
}

const info = (
  key: ThemeParamKey,
  role: ThemeParamRole,
  since: string,
  description: string,
): ThemeParamInfo => ({
  key,
  cssVar: `--tg-theme-${key.replace(/_/g, '-')}`,
  description,
  role,
  since,
});

export const THEME_PARAMS: readonly ThemeParamInfo[] = [
  info('bg_color', 'background', '6.0', 'Main background color'),
  info('secondary_bg_color', 'background', '6.1', 'Secondary background color'),
  info('header_bg_color', 'background', '7.0', 'Header background color'),
  info('bottom_bar_bg_color', 'background', '7.10', 'Bottom bar background color'),
  info('section_bg_color', 'background', '7.0', 'Section background color, used together with secondary_bg_color'),
  info('section_separator_color', 'separator', '7.6', 'Section separator color'),
  info('text_color', 'text', '6.0', 'Main text color'),
  info('accent_text_color', 'text', '7.0', 'Accent text color'),
  info('section_header_text_color', 'text', '7.0', 'Section header text color'),
  info('subtitle_text_color', 'text', '7.0', 'Subtitle text color'),
  info('destructive_text_color', 'text', '7.0', 'Text color for destructive actions'),
  info('hint_color', 'text', '6.0', 'Hint text color'),
  info('link_color', 'text', '6.0', 'Link color'),
  info('button_color', 'button', '6.0', 'Button color'),
  info('button_text_color', 'button', '6.0', 'Button text color'),
];

export const THEME_PARAM_BY_KEY: Record<ThemeParamKey, ThemeParamInfo> = Object.fromEntries(
  THEME_PARAMS.map((p) => [p.key, p]),
) as Record<ThemeParamKey, ThemeParamInfo>;

export const isThemeParamKey = (k: string): k is ThemeParamKey =>
  (THEME_PARAM_KEYS as readonly string[]).includes(k);

/** Figma variable name for a key, e.g. `tg/bg_color`. */
export const variableName = (key: ThemeParamKey) => `tg/${key}`;
export const cssVarRef = (key: ThemeParamKey) => `var(${THEME_PARAM_BY_KEY[key].cssVar})`;
