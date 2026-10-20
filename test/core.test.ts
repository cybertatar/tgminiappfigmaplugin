import { describe, expect, it } from 'vitest';
import {
  composite,
  contrastRatio,
  deltaE2000,
  deltaE2000Lab,
  generateSnippet,
  hexToRgb,
  isLargeText,
  layoutMatrix,
  suggestParam,
  readableOn,
  normalizeHex,
  parsePresetJson,
  preferredOnColor,
  PRESETS,
  rankParams,
  resolveParams,
  rgbToHex,
  THEME_PARAM_KEYS,
  THEME_PARAMS,
  cssVarRef,
} from '../src/core';

describe('theme params', () => {
  it('has 15 unique keys with matching css vars', () => {
    expect(THEME_PARAM_KEYS).toHaveLength(15);
    expect(new Set(THEME_PARAM_KEYS).size).toBe(15);
    expect(THEME_PARAMS.map((p) => p.key)).toEqual([...THEME_PARAM_KEYS]);
    expect(cssVarRef('section_header_text_color')).toBe('var(--tg-theme-section-header-text-color)');
  });
});

describe('color', () => {
  it('normalizes hex', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('17212B')).toBe('#17212b');
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('red')).toBeNull();
  });

  it('round-trips hex <-> rgb', () => {
    for (const hex of ['#000000', '#ffffff', '#17212b', '#5288c1']) {
      expect(rgbToHex(hexToRgb(hex))).toBe(hex);
    }
  });

  it('computes WCAG contrast', () => {
    expect(contrastRatio(hexToRgb('#000000'), hexToRgb('#ffffff'))).toBeCloseTo(21, 5);
    expect(contrastRatio(hexToRgb('#777777'), hexToRgb('#ffffff'))).toBeCloseTo(4.48, 2);
    expect(contrastRatio(hexToRgb('#123456'), hexToRgb('#123456'))).toBe(1);
  });

  it('composites alpha', () => {
    const half = composite({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 1, g: 1, b: 1 });
    expect(rgbToHex(half)).toBe('#808080');
  });

  it('classifies large text', () => {
    expect(isLargeText(24, 400)).toBe(true);
    expect(isLargeText(19, 700)).toBe(true);
    expect(isLargeText(19, 600)).toBe(false);
    expect(isLargeText(17, 700)).toBe(false);
  });

  it('picks on-color', () => {
    expect(preferredOnColor(hexToRgb('#17212b'))).toBe('light');
    expect(preferredOnColor(hexToRgb('#f8f8f8'))).toBe('dark');
  });

  it('CIEDE2000 matches reference data and behaves near black', () => {
    // Sharma et al. 2005, test pairs 1 and 17.
    expect(deltaE2000Lab({ L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 })).toBeCloseTo(2.0425, 4);
    expect(deltaE2000Lab({ L: 50, a: 2.5, b: 0 }, { L: 73, a: 25, b: -18 })).toBeCloseTo(27.1492, 4);
    expect(deltaE2000(hexToRgb('#5288c1'), hexToRgb('#5288c1'))).toBe(0);
    expect(deltaE2000(hexToRgb('#5288c1'), hexToRgb('#5389c2'))).toBeLessThan(1);
    expect(deltaE2000(hexToRgb('#0a0a0a'), hexToRgb('#000000'))).toBeLessThan(6);
    expect(deltaE2000(hexToRgb('#5288c1'), hexToRgb('#ec3942'))).toBeGreaterThan(30);
  });
});

describe('presets', () => {
  it('built-ins are complete and valid', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    for (const p of PRESETS) {
      const { filled } = resolveParams(p.params, p.scheme);
      expect(filled, p.id).toEqual([]);
      for (const v of Object.values(p.params)) expect(normalizeHex(v!), `${p.id} ${v}`).toBe(v);
    }
  });

  it('fills missing keys via fallbacks', () => {
    const { params, filled } = resolveParams({ bg_color: '#111111', link_color: '#00aaff' }, 'dark');
    expect(params.secondary_bg_color).toBe('#111111');
    expect(params.accent_text_color).toBe('#00aaff');
    expect(params.section_header_text_color).toBe('#00aaff');
    expect(filled).toContain('text_color');
    expect(filled).not.toContain('bg_color');
    expect(Object.keys(params)).toHaveLength(15);
  });

  it('parses raw themeParams JSON and infers scheme', () => {
    const r = parsePresetJson('{"bg_color":"#17212B","text_color":"#fff","foo":"x"}', { name: 'Mine' });
    expect(r.errors).toEqual([]);
    expect(r.preset?.scheme).toBe('dark');
    expect(r.preset?.params.bg_color).toBe('#17212b');
    expect(r.preset?.params.text_color).toBe('#ffffff');
    expect(r.preset?.id).toBe('custom-mine');
    expect(r.warnings.some((w) => w.includes('foo'))).toBe(true);
  });

  it('parses full preset JSON', () => {
    const r = parsePresetJson(
      JSON.stringify({ name: 'Purple', platform: 'android', scheme: 'light', params: { bg_color: '#eeeeff' } }),
    );
    expect(r.preset).toMatchObject({ name: 'Purple', platform: 'android', scheme: 'light' });
  });

  it('rejects bad input', () => {
    expect(parsePresetJson('nope').errors[0]).toMatch(/Invalid JSON/);
    expect(parsePresetJson('[]').errors).toHaveLength(1);
    expect(parsePresetJson('{"bg_color":"blue"}').errors[0]).toMatch(/bg_color/);
    expect(parsePresetJson('{"foo":"#ffffff"}').errors).toEqual(['No theme params found']);
  });
});

describe('match', () => {
  const ios = resolveParams(PRESETS.find((p) => p.id === 'ios-light')!.params, 'light').params;

  it('finds exact param', () => {
    expect(rankParams(hexToRgb('#ff3b30'), ios)[0]).toEqual({ key: 'destructive_text_color', distance: 0 });
  });

  it('respects roles filter', () => {
    const top = rankParams(hexToRgb('#fefefe'), ios, { roles: ['text'], limit: 1 });
    expect(top).toHaveLength(1);
    expect(['text_color', 'hint_color', 'subtitle_text_color', 'section_header_text_color']).toContain(top[0].key);
    const bg = rankParams(hexToRgb('#fefefe'), ios, { roles: ['background'], limit: 1 });
    expect(['bg_color', 'section_bg_color']).toContain(bg[0].key);
  });
});

describe('snippet', () => {
  it('emits only what is set', () => {
    expect(generateSnippet({})).toBe('const tg = window.Telegram.WebApp;');
  });

  it('matches the documented example', () => {
    const s = generateSnippet({
      backButton: true,
      mainButton: { visible: true, text: 'Продолжить' },
      secondaryButton: { visible: true, text: 'Отмена', position: 'left' },
    });
    expect(s).toBe(
      [
        'const tg = window.Telegram.WebApp;',
        'tg.BackButton.show();',
        "tg.MainButton.setParams({ text: 'Продолжить', is_active: true, is_visible: true });",
        "tg.SecondaryButton.setParams({ text: 'Отмена', position: 'left', is_active: true, is_visible: true });",
      ].join('\n'),
    );
  });

  it('handles states, colors, escaping and position-only-with-both', () => {
    const s = generateSnippet({
      headerColor: 'secondary_bg_color',
      bottomBarColor: '#112233',
      fullscreen: true,
      settingsButton: true,
      secondaryButton: { visible: true, text: "It's", position: 'top', active: false, progress: true, shine: true },
    });
    expect(s).toContain("tg.setHeaderColor('secondary_bg_color');");
    expect(s).toContain("tg.setBottomBarColor('#112233');");
    expect(s).toContain('tg.requestFullscreen();');
    expect(s).toContain('tg.SettingsButton.show();');
    expect(s).toContain("text: 'It\\'s'");
    expect(s).toContain('has_shine_effect: true');
    expect(s).toContain('is_active: false');
    expect(s).not.toContain('position');
    expect(s).toContain('tg.SecondaryButton.showProgress();');
    expect(s).not.toContain('MainButton');
  });
});

describe('matrix layout', () => {
  it('places copies in one row with labels above', () => {
    const l = layoutMatrix(3, { width: 390, height: 844 });
    expect(l.cells.map((c) => c.screen.x)).toEqual([80, 550, 1020]);
    expect(l.cells[0].label).toEqual({ x: 80, y: 80 });
    expect(l.cells[0].screen.y).toBe(80 + 56 + 24);
    expect(l.width).toBe(1020 + 390 + 80);
    expect(l.height).toBe(80 + 56 + 24 + 844 + 80);
  });

  it('handles a single copy', () => {
    expect(layoutMatrix(1, { width: 100, height: 100 }).width).toBe(260);
  });
});

describe('suggestParam', () => {
  const ios = resolveParams(PRESETS.find((p) => p.id === 'ios-light')!.params, 'light').params;
  const pick = (hex: string, target: Parameters<typeof suggestParam>[2]) => suggestParam(hexToRgb(hex), ios, target);

  it('disambiguates equal values by where the color is used', () => {
    expect(pick('#ffffff', 'text').key).toBe('button_text_color');
    expect(pick('#ffffff', 'fill').key).toBe('bg_color');
    expect(pick('#007aff', 'text').key).toBe('accent_text_color');
    expect(pick('#007aff', 'fill').key).toBe('button_color');
    expect(pick('#8e8e93', 'text').key).toBe('hint_color');
    expect(pick('#c8c7cc', 'stroke').key).toBe('section_separator_color');
  });

  it('grades match quality', () => {
    expect(pick('#000000', 'text')).toMatchObject({ key: 'text_color', quality: 'exact' });
    expect(pick('#0a0a0a', 'text')).toMatchObject({ key: 'text_color', quality: 'near' });
    expect(pick('#9b30ff', 'fill').quality).toBe('weak');
  });
});

describe('readableOn', () => {
  it('keeps the theme color when it reads, otherwise picks white or black', () => {
    expect(readableOn('#ffffff', '#222222', 4.5)).toEqual({ hex: '#222222', alpha: 1 });
    expect(readableOn('#527da3', '#222222', 4.5)).toEqual({ hex: '#ffffff', alpha: 1 });
    expect(readableOn('#ffe066', '#ffffff', 3, 0.7)).toEqual({ hex: '#000000', alpha: 0.7 });
  });
});
