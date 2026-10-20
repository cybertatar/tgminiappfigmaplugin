// C2 against a fake document: values come from Telegram Theme variables per mode.
import { describe, expect, it } from 'vitest';
import { hexToRgb, hexToRgba, PRESETS, resolveParams } from '../src/core';
import { checkContrast } from '../src/main/contrast';

const presets = PRESETS.filter((p) => ['ios-light', 'stress'].includes(p.id));
const modeMap = Object.fromEntries(presets.map((p, i) => [p.id, `m${i}`]));
const collection: any = {
  id: 'col',
  modes: presets.map((_, i) => ({ modeId: `m${i}` })),
  getPluginData: (k: string) => (k === 'tgModes' ? JSON.stringify(modeMap) : '') };

const vars = new Map<string, any>();
function themeVar(key: string) {
  const valuesByMode = Object.fromEntries(
    presets.map((p, i) => [`m${i}`, hexToRgba(resolveParams(p.params, p.scheme).params[key as 'bg_color'])]),
  );
  const v = { id: `v-${key}`, variableCollectionId: 'col', valuesByMode };
  vars.set(v.id, v);
  return v;
}
const bound = (key: string, extra: object = {}) => ({
  type: 'SOLID',
  color: { r: 0, g: 0, b: 0 },
  boundVariables: { color: { type: 'VARIABLE_ALIAS', id: themeVar(key).id } },
  ...extra,
});

function node(type: string, box: Rect, props: Record<string, unknown> = {}, children: any[] = []): any {
  const n: any = { type, visible: true, opacity: 1, absoluteBoundingBox: box, fills: [], children, name: type, ...props };
  for (const c of children) c.parent = n;
  n.findAllWithCriteria = () => children.flatMap((c: any) => (c.type === 'TEXT' ? [c] : c.findAllWithCriteria?.() ?? []));
  return n;
}
const text = (name: string, box: Rect, fill: object, size = 15) =>
  node('TEXT', box, {
    name,
    characters: name,
    getStyledTextSegments: () => [{ fills: [fill], fontSize: size, fontWeight: 600 }],
  });

(globalThis as any).figma = {
  mixed: Symbol('mixed'),
  variables: { getVariableByIdAsync: async (id: string) => vars.get(id) ?? null },
};

describe('checkContrast', () => {
  it('uses the covering sibling as background and evaluates every theme mode', async () => {
    const label = text('Continue', { x: 150, y: 812, width: 80, height: 20 }, bound('button_text_color'));
    const button = node('RECTANGLE', { x: 16, y: 800, width: 370, height: 50 }, { fills: [bound('button_color')] });
    const body = text('Body', { x: 16, y: 100, width: 200, height: 20 }, bound('text_color'));
    const screen = node('FRAME', { x: 0, y: 0, width: 402, height: 874 }, { fills: [bound('bg_color')], parent: { type: 'PAGE' } }, [
      body,
      button,
      label,
    ]);
    screen.parent = { type: 'PAGE' };

    const r = await checkContrast([screen], collection, presets);
    const byName = Object.fromEntries(r.rows.map((row) => [row.name, row]));
    // iOS Light: white on #0088ff is ~3.5:1 — below 4.5 for 15px text.
    const [iosButton, stressButton] = byName.Continue.ratios;
    expect(iosButton).toBeCloseTo(3.5, 1);
    expect(stressButton).toBeLessThan(1.5); // white on #ffe066
    expect(byName.Continue.failing).toBe(2);
    expect(byName.Body.ratios[0]).toBe(21);
    expect(r.rows[0].name).toBe('Continue'); // failing rows first
  });

  it('skips text without a solid background', async () => {
    const t = text('Floating', { x: 0, y: 0, width: 10, height: 10 }, { type: 'SOLID', color: hexToRgb('#000000') });
    const frame = node('FRAME', { x: 0, y: 0, width: 100, height: 100 }, {}, [t]);
    frame.parent = { type: 'PAGE' };
    const r = await checkContrast([frame], collection, presets);
    expect(r.rows).toHaveLength(0);
    expect(r.skipped.noBackground).toBe(1);
  });
});
