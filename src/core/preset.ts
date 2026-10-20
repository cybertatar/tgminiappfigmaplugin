// Theme presets: types, validation, fallbacks for missing keys, parsing user JSON.
import { hexToRgb, isDark, normalizeHex } from './color';
import {
  isThemeParamKey,
  THEME_PARAM_KEYS,
  type ResolvedThemeParams,
  type ThemeParamKey,
  type ThemeParams,
} from './theme-params';

export type Platform = 'ios' | 'android' | 'desktop';
export type Scheme = 'light' | 'dark';

export interface Preset {
  id: string;
  name: string;
  platform: Platform;
  scheme: Scheme;
  params: ThemeParams;
  /** true until the values are captured from a real client with the sniffer. */
  draft?: boolean;
  /** Where the values came from (client + version, or "approximation"). */
  source?: string;
}

export const PLATFORMS: readonly Platform[] = ['ios', 'android', 'desktop'];

// Used only when a preset lacks even the base keys.
const BASE_DEFAULTS: Record<Scheme, Partial<ResolvedThemeParams>> = {
  light: {
    bg_color: '#ffffff',
    text_color: '#000000',
    hint_color: '#8e8e93',
    link_color: '#2481cc',
    button_color: '#2481cc',
    button_text_color: '#ffffff',
    destructive_text_color: '#ff3b30',
  },
  dark: {
    bg_color: '#17212b',
    text_color: '#f5f5f5',
    hint_color: '#708499',
    link_color: '#6ab3f3',
    button_color: '#5288c1',
    button_text_color: '#ffffff',
    destructive_text_color: '#ec3942',
  },
};

// Missing key -> key it falls back to. Order matters: earlier entries resolve first.
// This is our own heuristic for incomplete presets, not documented Telegram behavior.
const FALLBACK_CHAIN: [ThemeParamKey, ThemeParamKey][] = [
  ['secondary_bg_color', 'bg_color'],
  ['header_bg_color', 'bg_color'],
  ['section_bg_color', 'bg_color'],
  ['bottom_bar_bg_color', 'secondary_bg_color'],
  ['section_separator_color', 'hint_color'],
  ['accent_text_color', 'link_color'],
  ['section_header_text_color', 'accent_text_color'],
  ['subtitle_text_color', 'hint_color'],
];

export interface ResolveResult {
  params: ResolvedThemeParams;
  /** Keys that were not in the preset and got a fallback value. */
  filled: ThemeParamKey[];
}

export function resolveParams(params: ThemeParams, scheme: Scheme): ResolveResult {
  const out: ThemeParams = {};
  const filled: ThemeParamKey[] = [];
  for (const k of THEME_PARAM_KEYS) {
    const v = params[k] && normalizeHex(params[k]!);
    if (v) out[k] = v;
  }
  for (const [k, v] of Object.entries(BASE_DEFAULTS[scheme]) as [ThemeParamKey, string][]) {
    if (!out[k]) {
      out[k] = v;
      filled.push(k);
    }
  }
  for (const [k, from] of FALLBACK_CHAIN) {
    if (!out[k]) {
      out[k] = out[from];
      filled.push(k);
    }
  }
  return { params: out as ResolvedThemeParams, filled };
}

export interface ParseResult {
  preset?: Preset;
  errors: string[];
  warnings: string[];
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'custom';

/**
 * Parses user-pasted JSON. Accepts either a raw `themeParams` object
 * (as logged from `Telegram.WebApp.themeParams`) or a full preset
 * `{ name, platform, scheme, params }`.
 */
export function parsePresetJson(
  json: string,
  defaults: { name?: string; platform?: Platform } = {},
): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    return { errors: [`Invalid JSON: ${(e as Error).message}`], warnings };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { errors: ['Expected a JSON object'], warnings };
  }
  const obj = data as Record<string, unknown>;
  const rawParams = (
    obj.params && typeof obj.params === 'object' ? obj.params : obj
  ) as Record<string, unknown>;
  const isFull = rawParams !== obj;

  const params: ThemeParams = {};
  for (const [k, v] of Object.entries(rawParams)) {
    if (!isThemeParamKey(k)) {
      if (!isFull) warnings.push(`Unknown key ignored: ${k}`);
      continue;
    }
    const hex = typeof v === 'string' ? normalizeHex(v) : null;
    if (!hex) errors.push(`${k}: "${String(v)}" is not a #RRGGBB color`);
    else params[k] = hex;
  }
  if (Object.keys(params).length === 0 && errors.length === 0) {
    errors.push('No theme params found');
  }
  if (isFull) {
    for (const k of Object.keys(obj)) {
      if (!['id', 'name', 'platform', 'scheme', 'params', 'draft', 'source'].includes(k)) {
        warnings.push(`Unknown field ignored: ${k}`);
      }
    }
  }
  if (errors.length) return { errors, warnings };

  const platform = (PLATFORMS as readonly string[]).includes(obj.platform as string)
    ? (obj.platform as Platform)
    : (defaults.platform ?? 'ios');
  const scheme: Scheme =
    obj.scheme === 'light' || obj.scheme === 'dark'
      ? obj.scheme
      : isDark(hexToRgb(params.bg_color ?? '#ffffff'))
        ? 'dark'
        : 'light';
  const name =
    typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : (defaults.name ?? 'Custom');

  const missing = THEME_PARAM_KEYS.filter((k) => !params[k]);
  if (missing.length) warnings.push(`Missing keys will use fallbacks: ${missing.join(', ')}`);

  return {
    preset: {
      id: typeof obj.id === 'string' && obj.id ? slug(obj.id) : `custom-${slug(name)}`,
      name,
      platform,
      scheme,
      params,
      draft: obj.draft === true,
      source: typeof obj.source === 'string' ? obj.source : 'user JSON',
    },
    errors,
    warnings,
  };
}
