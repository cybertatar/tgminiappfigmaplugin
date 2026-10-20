// Generates a Telegram.WebApp JS snippet describing a screen's system UI (handoff, block D).

export type ThemeColorKeyword = 'bg_color' | 'secondary_bg_color';
export type BottomBarColorKeyword = ThemeColorKeyword | 'bottom_bar_bg_color';
export type SecondaryPosition = 'left' | 'right' | 'top' | 'bottom';

export interface BottomButtonSpec {
  visible: boolean;
  text?: string;
  /** default true */
  active?: boolean;
  progress?: boolean;
  shine?: boolean;
  color?: string;
  textColor?: string;
}

export interface ScreenSpec {
  backButton?: boolean;
  settingsButton?: boolean;
  fullscreen?: boolean;
  /** Omit for the default (header_bg_color). */
  headerColor?: ThemeColorKeyword | string;
  /** Omit for the default (bottom_bar_bg_color). */
  bottomBarColor?: BottomBarColorKeyword | string;
  mainButton?: BottomButtonSpec;
  secondaryButton?: BottomButtonSpec & { position?: SecondaryPosition };
}

const str = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function buttonParams(b: BottomButtonSpec, extra: Record<string, string> = {}): string {
  const p: [string, string][] = [];
  if (b.text !== undefined) p.push(['text', str(b.text)]);
  if (b.color) p.push(['color', str(b.color)]);
  if (b.textColor) p.push(['text_color', str(b.textColor)]);
  if (b.shine) p.push(['has_shine_effect', 'true']);
  for (const [k, v] of Object.entries(extra)) p.push([k, v]);
  p.push(['is_active', String(b.active !== false)]);
  p.push(['is_visible', 'true']);
  return `{ ${p.map(([k, v]) => `${k}: ${v}`).join(', ')} }`;
}

export function generateSnippet(spec: ScreenSpec): string {
  const lines = ['const tg = window.Telegram.WebApp;'];

  if (spec.fullscreen) lines.push('tg.requestFullscreen();');
  if (spec.headerColor) lines.push(`tg.setHeaderColor(${str(spec.headerColor)});`);
  if (spec.bottomBarColor) lines.push(`tg.setBottomBarColor(${str(spec.bottomBarColor)});`);
  if (spec.backButton) lines.push('tg.BackButton.show();');
  if (spec.settingsButton) lines.push('tg.SettingsButton.show();');

  const main = spec.mainButton?.visible ? spec.mainButton : undefined;
  const secondary = spec.secondaryButton?.visible ? spec.secondaryButton : undefined;

  if (main) {
    lines.push(`tg.MainButton.setParams(${buttonParams(main)});`);
    if (main.progress) lines.push('tg.MainButton.showProgress();');
  }
  if (secondary) {
    // position only matters when both buttons are shown.
    const extra: Record<string, string> =
      main && secondary.position ? { position: str(secondary.position) } : {};
    lines.push(`tg.SecondaryButton.setParams(${buttonParams(secondary, extra)});`);
    if (secondary.progress) lines.push('tg.SecondaryButton.showProgress();');
  }
  return lines.join('\n');
}
