// D: analyzeScreen against fake kit instances.
import { describe, expect, it } from 'vitest';
import { analyzeScreen } from '../src/main/handoff';

const vars = new Map<string, any>();
const themeVar = (key: string) => {
  const v = { id: `v-${key}`, getPluginData: (k: string) => (k === 'tgParam' ? key : '') };
  vars.set(v.id, v);
  return v;
};
const bound = (key: string) => ({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { id: themeVar(key).id } } });
const raw = (r: number, g: number, b: number) => ({ type: 'SOLID', color: { r, g, b } });

const set = (tag: string) => ({ type: 'COMPONENT_SET', getPluginData: (k: string) => (k === 'tgComponent' ? tag : '') });
function inst(tag: string, props: Record<string, { type: string; value: string }>, extra: Record<string, unknown> = {}, kids: any[] = []): any {
  const n: any = {
    type: 'INSTANCE',
    visible: true,
    componentProperties: props,
    getMainComponentAsync: async () => ({ parent: set(tag) }),
    children: kids,
    fills: [],
    ...extra,
  };
  n.findOne = (pred: (x: any) => boolean) => all(n).find(pred) ?? null;
  return n;
}
const all = (n: any): any[] => (n.children ?? []).flatMap((c: any) => [c, ...all(c)]);
const variant = (value: string) => ({ type: 'VARIANT', value });
const text = (value: string) => ({ type: 'TEXT', value });

(globalThis as any).figma = { mixed: Symbol(), variables: { getVariableByIdAsync: async (id: string) => vars.get(id) ?? null } };

describe('analyzeScreen', () => {
  it('turns kit instances into a snippet', async () => {
    const header = inst('header', { Left: variant('Back'), Color: variant('Background'), Platform: variant('iOS') });
    const main = inst(
      'bottom-button',
      { State: variant('Loading'), 'Label#1:0': text('Pay $5') },
      { name: 'Main Button', fills: [bound('button_color')] },
      [{ type: 'TEXT', name: 'Label', fills: [bound('button_text_color')] }],
    );
    const secondary = inst(
      'bottom-button',
      { State: variant('Default'), 'Label#1:0': text('Later') },
      { name: 'Secondary Button', fills: [raw(1, 0, 0)] },
      [{ type: 'TEXT', name: 'Label', fills: [bound('button_color')] }],
    );
    const bar = inst('bottom-bar', { Layout: variant('Secondary left') }, { fills: [bound('secondary_bg_color')] }, [
      { type: 'FRAME', name: 'Buttons', children: [main, secondary] },
    ]);
    const screen: any = {
      name: 'Checkout',
      type: 'FRAME',
      fills: [bound('bg_color')],
      findAllWithCriteria: () => [header, bar, main, secondary],
      findAll: () => [header, bar, main, secondary],
    };

    const r = await analyzeScreen(screen, true);
    expect(r.found).toEqual(['Header', 'Bottom bar']);
    expect(r.snippet).toBe(
      [
        'const tg = window.Telegram.WebApp;',
        "tg.setHeaderColor('bg_color');",
        "tg.setBottomBarColor('secondary_bg_color');",
        'tg.BackButton.show();',
        'tg.SettingsButton.show();',
        "tg.MainButton.setParams({ text: 'Pay $5', is_active: true, is_visible: true });",
        'tg.MainButton.showProgress();',
        "tg.SecondaryButton.setParams({ text: 'Later', color: '#ff0000', position: 'left', is_active: true, is_visible: true });",
      ].join('\n'),
    );
    expect(r.cssVars).toContain('var(--tg-theme-bg-color)');
    expect(r.cssVars).toContain('var(--tg-theme-button-color)');
  });
});
