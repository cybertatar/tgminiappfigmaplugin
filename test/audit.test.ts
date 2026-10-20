// Runs the C1 scan/bind logic against minimal fake Figma nodes.
import { beforeEach, describe, expect, it } from 'vitest';
import { hexToRgb, PRESETS, resolveParams, type ThemeParamKey } from '../src/core';
import { bindGroups, collect, groupOccurrences, setIgnored } from '../src/main/audit';

const MIXED = Symbol('mixed');

const solid = (hex: string, extra: object = {}) => ({ type: 'SOLID', color: hexToRgb(hex), ...extra });

let nextId = 0;
function node(type: string, props: Record<string, unknown> = {}, children?: any[]): any {
  const data: Record<string, string> = {};
  const n: any = {
    id: `n${nextId++}`,
    type,
    name: props.name ?? type.toLowerCase(),
    width: 100,
    height: 100,
    fills: [],
    strokes: [],
    fillStyleId: '',
    strokeStyleId: '',
    getPluginData: (k: string) => data[k] ?? '',
    setPluginData: (k: string, v: string) => (data[k] = v),
    ...props,
  };
  if (children) n.children = children;
  return n;
}

function text(name: string, segments: { hex: string; len: number }[]) {
  const n = node('TEXT', { name });
  let pos = 0;
  const segs = segments.map((s) => {
    const seg = { start: pos, end: pos + s.len, fills: [solid(s.hex)], fillStyleId: '' };
    pos += s.len;
    return seg;
  });
  n.characters = 'x'.repeat(pos);
  n.fills = segs.length === 1 ? segs[0].fills : MIXED;
  n.getStyledTextSegments = () => segs;
  n.getRangeFills = (start: number) => segs.find((s) => s.start === start)!.fills;
  n.setRangeFills = (start: number, _end: number, fills: unknown[]) => {
    segs.find((s) => s.start === start)!.fills = fills as any;
  };
  return n;
}

beforeEach(() => {
  nextId = 0;
  (globalThis as any).figma = {
    mixed: MIXED,
    variables: {
      setBoundVariableForPaint: (paint: any, _field: string, v: any) => ({
        ...paint,
        boundVariables: { color: { type: 'VARIABLE_ALIAS', id: v.id } },
      }),
    },
  };
});

const ios = resolveParams(PRESETS[0].params, 'light').params;

function screen() {
  return node('FRAME', { name: 'Screen', fills: [solid('#ffffff')] }, [
    text('Title', [{ hex: '#000000', len: 5 }]),
    text('Body', [
      { hex: '#000000', len: 3 },
      { hex: '#007aff', len: 4 },
    ]),
    node('RECTANGLE', { name: 'Button', fills: [solid('#007aff')] }),
    text('Button label', [{ hex: '#ffffff', len: 6 }]),
    node('VECTOR', { name: 'Chevron', width: 16, height: 16, fills: [solid('#8e8e93')] }),
    node('LINE', { name: 'Divider', width: 300, height: 0, strokes: [solid('#c8c7cc')] }),
    node('RECTANGLE', { name: 'Bound', fills: [solid('#ffffff', { boundVariables: { color: {} } })] }),
    node('RECTANGLE', { name: 'Styled', fills: [solid('#123456')], fillStyleId: 'S:1' }),
    node('RECTANGLE', { name: 'Gradient', fills: [{ type: 'GRADIENT_LINEAR' }] }),
    node('FRAME', { name: 'Illustration' }, [node('VECTOR', { name: 'Blob', fills: [solid('#ff00ff')] })]),
  ]);
}

describe('collect + group', () => {
  it('finds unbound solid paints and suggests params by usage', async () => {
    const root = screen();
    const { occurrences, stats } = await collect([root]);
    const groups = groupOccurrences(occurrences, ios);
    const byId = Object.fromEntries(groups.map((g) => [g.id, g]));

    expect(byId['text|#000000']).toMatchObject({ count: 2, suggestion: { key: 'text_color' } });
    expect(byId['text|#007aff'].suggestion.key).toBe('accent_text_color');
    expect(byId['text|#ffffff'].suggestion.key).toBe('button_text_color');
    expect(byId['fill|#ffffff'].suggestion.key).toBe('bg_color');
    expect(byId['fill|#007aff'].suggestion.key).toBe('button_color');
    expect(byId['icon|#8e8e93'].suggestion.key).toBe('hint_color');
    expect(byId['stroke|#c8c7cc'].suggestion.key).toBe('section_separator_color');
    expect(byId['fill|#ff00ff'].suggestion.quality).toBe('weak');
    expect(stats).toMatchObject({ styled: 1, gradients: 1, ignored: 0 });
  });

  it('respects self and tree exceptions', async () => {
    const root = screen();
    setIgnored([root], 'self');
    setIgnored([root.children.find((c: any) => c.name === 'Illustration')], 'tree');
    const ids = groupOccurrences((await collect([root])).occurrences, ios).map((g) => g.id);
    expect(ids).not.toContain('fill|#ffffff'); // root's own fill skipped
    expect(ids).toContain('text|#000000'); // children still checked
    expect(ids).not.toContain('fill|#ff00ff'); // whole illustration skipped
    expect((await collect([root])).stats.ignored).toBe(2);
  });
});

describe('bindGroups', () => {
  it('binds chosen groups, including text ranges, and leaves the rest', async () => {
    const root = screen();
    const vars = new Map<ThemeParamKey, any>([
      ['text_color', { id: 'v-text' }],
      ['accent_text_color', { id: 'v-accent' }],
      ['bg_color', { id: 'v-bg' }],
    ]);
    const report = await bindGroups(
      [root],
      [
        { groupId: 'text|#000000', key: 'text_color' },
        { groupId: 'text|#007aff', key: 'accent_text_color' },
        { groupId: 'fill|#ffffff', key: 'bg_color' },
      ],
      vars,
    );
    expect(report).toEqual({ bound: 4, failed: [] });
    expect(root.fills[0].boundVariables.color.id).toBe('v-bg');
    const body = root.children[1];
    const segs = body.getStyledTextSegments();
    expect(segs.map((s: any) => s.fills[0].boundVariables?.color.id)).toEqual(['v-text', 'v-accent']);
    // Not chosen: still raw.
    expect(root.children[2].fills[0].boundVariables).toBeUndefined();

    const left = groupOccurrences((await collect([root])).occurrences, ios).map((g) => g.id);
    expect(left).not.toContain('text|#000000');
    expect(left).toContain('fill|#007aff');
  });
});
