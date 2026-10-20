// C2: contrast of every text layer against its effective background, in every theme mode.
import { contrastThreshold, isLargeText, textContrast, type Preset, type RGB, type RGBA } from '../core';
import type { ContrastResult, ContrastRow } from '../shared/messages';
import { isKitInstance } from './audit';
import { readModeMap } from './theme-collection';

const TEXT_LIMIT = 2000;

/** A paint resolved per preset: either one constant color or a value per Telegram Theme mode. */
type ColorSource = { kind: 'const'; color: RGBA } | { kind: 'var'; byPreset: (RGBA | null)[] };

interface Ctx {
  collection: VariableCollection;
  presets: readonly Preset[];
  modeIds: (string | undefined)[];
  varCache: Map<string, Variable | null>;
}

async function getVariable(ctx: Ctx, id: string): Promise<Variable | null> {
  if (!ctx.varCache.has(id)) ctx.varCache.set(id, await figma.variables.getVariableByIdAsync(id));
  return ctx.varCache.get(id)!;
}

const isRgba = (v: VariableValue): v is RGBA => typeof v === 'object' && v !== null && 'r' in v;

/** Value of a Telegram Theme variable in one mode, following aliases. */
async function valueInMode(ctx: Ctx, variable: Variable, modeId: string, depth = 0): Promise<RGBA | null> {
  const v = variable.valuesByMode[modeId] ?? Object.values(variable.valuesByMode)[0];
  if (isRgba(v)) return { r: v.r, g: v.g, b: v.b, a: 'a' in v ? v.a : 1 };
  if (depth < 5 && typeof v === 'object' && v && 'type' in v && v.type === 'VARIABLE_ALIAS') {
    const target = await getVariable(ctx, v.id);
    if (target) return valueInMode(ctx, target, target.variableCollectionId === ctx.collection.id ? modeId : '', depth + 1);
  }
  return null;
}

async function paintSource(ctx: Ctx, paint: SolidPaint, consumer: SceneNode): Promise<ColorSource> {
  const opacity = paint.opacity ?? 1;
  const alias = paint.boundVariables?.color;
  if (alias) {
    const variable = await getVariable(ctx, alias.id);
    if (variable && variable.variableCollectionId === ctx.collection.id) {
      const byPreset = await Promise.all(
        ctx.modeIds.map(async (modeId) => {
          if (!modeId) return null;
          const c = await valueInMode(ctx, variable, modeId);
          return c ? { ...c, a: c.a * opacity } : null;
        }),
      );
      return { kind: 'var', byPreset };
    }
    // Another collection: doesn't change with the Telegram theme.
    if (variable) {
      const resolved = variable.resolveForConsumer(consumer).value;
      if (isRgba(resolved)) return { kind: 'const', color: { ...resolved, a: ('a' in resolved ? resolved.a : 1) * opacity } };
    }
  }
  return { kind: 'const', color: { ...paint.color, a: opacity } };
}

const at = (s: ColorSource, i: number): RGBA | null => (s.kind === 'const' ? s.color : s.byPreset[i]);

/** Top visible paint if it's an opaque solid; 'other' for gradients/images; null if no fill. */
function topSolid(node: SceneNode): SolidPaint | 'other' | null {
  if (!('fills' in node) || node.fills === figma.mixed) return null;
  const visible = node.fills.filter((p) => p.visible !== false);
  const top = visible[visible.length - 1];
  if (!top) return null;
  if (top.type !== 'SOLID') return 'other';
  return (top.opacity ?? 1) >= 0.99 && ('opacity' in node ? node.opacity : 1) >= 0.99 ? top : null;
}

function contains(outer: Rect | null, inner: Rect | null): boolean {
  if (!outer || !inner) return false;
  return (
    outer.x <= inner.x + 0.5 &&
    outer.y <= inner.y + 0.5 &&
    outer.x + outer.width >= inner.x + inner.width - 0.5 &&
    outer.y + outer.height >= inner.y + inner.height - 0.5
  );
}

/**
 * Effective background: at each level, siblings painted below the node that fully cover the text
 * (a button rectangle with a text on top), then the parent's own fill.
 */
function findBackground(text: TextNode): { node: SceneNode; paint: SolidPaint } | 'unsupported' | null {
  const box = text.absoluteBoundingBox;
  let current: SceneNode = text;
  while (current.parent && current.parent.type !== 'PAGE' && current.parent.type !== 'DOCUMENT') {
    const parent = current.parent as SceneNode & ChildrenMixin;
    const index = parent.children.indexOf(current);
    for (let i = index - 1; i >= 0; i--) {
      const sib = parent.children[i];
      if (!sib.visible || !contains(sib.absoluteBoundingBox, box)) continue;
      const fill = topSolid(sib);
      if (fill === 'other') return 'unsupported';
      if (fill) return { node: sib, paint: fill };
    }
    const own = topSolid(parent);
    if (own === 'other') return 'unsupported';
    if (own) return { node: parent, paint: own };
    current = parent;
  }
  return null;
}

export async function checkContrast(
  roots: readonly SceneNode[],
  collection: VariableCollection,
  presets: readonly Preset[],
): Promise<ContrastResult> {
  const modeMap = readModeMap(collection);
  const ctx: Ctx = { collection, presets, modeIds: presets.map((p) => modeMap[p.id]), varCache: new Map() };
  const rows: ContrastRow[] = [];
  const skipped = { noBackground: 0, unsupported: 0, system: 0 };
  const kitCache = new Map<string, boolean>();
  // Text drawn by Telegram itself (kit components) isn't under the designer's control.
  const inKit = async (n: SceneNode) => {
    for (let p: BaseNode | null = n.parent; p && p.type !== 'PAGE'; p = p.parent) {
      if (p.type === 'INSTANCE' && (await isKitInstance(p as InstanceNode, kitCache))) return true;
    }
    return false;
  };

  const texts: TextNode[] = [];
  for (const root of roots) {
    if (root.type === 'TEXT') texts.push(root);
    if ('findAllWithCriteria' in root) texts.push(...root.findAllWithCriteria({ types: ['TEXT'] }));
  }
  for (const text of texts.slice(0, TEXT_LIMIT)) {
    if (!text.visible || !text.characters.trim()) continue;
    if (await inKit(text)) {
      skipped.system++;
      continue;
    }
    const bg = findBackground(text);
    if (bg === 'unsupported') {
      skipped.unsupported++;
      continue;
    }
    if (!bg) {
      skipped.noBackground++;
      continue;
    }
    const bgSource = await paintSource(ctx, bg.paint, bg.node);
    const segments = text.getStyledTextSegments(['fills', 'fontSize', 'fontWeight']);
    const ratios: (number | null)[] = presets.map(() => null);
    let large = true;
    let unsupported = false;
    for (const seg of segments) {
      const paint = seg.fills.filter((p) => p.visible !== false).pop();
      if (!paint) continue;
      if (paint.type !== 'SOLID') {
        unsupported = true;
        continue;
      }
      const segLarge = isLargeText(seg.fontSize, seg.fontWeight);
      large = large && segLarge;
      const fg = await paintSource(ctx, paint, text);
      presets.forEach((_, i) => {
        const f = at(fg, i);
        const b = at(bgSource, i);
        if (!f || !b) return;
        const ratio = textContrast({ ...f, a: f.a * text.opacity }, b as RGB);
        if (ratios[i] === null || ratio < ratios[i]!) ratios[i] = ratio;
      });
    }
    if (unsupported && ratios.every((r) => r === null)) {
      skipped.unsupported++;
      continue;
    }
    const threshold = contrastThreshold(large);
    rows.push({
      nodeId: text.id,
      name: text.name,
      text: text.characters.slice(0, 40),
      large,
      threshold,
      ratios: ratios.map((r) => (r === null ? null : Math.round(r * 100) / 100)),
      failing: ratios.filter((r) => r !== null && r < threshold).length,
    });
  }
  rows.sort((a, b) => b.failing - a.failing || Math.min(...a.ratios.map((r) => r ?? 99)) - Math.min(...b.ratios.map((r) => r ?? 99)));
  return {
    presetIds: presets.map((p) => p.id),
    rows,
    checked: Math.min(texts.length, TEXT_LIMIT),
    truncated: texts.length > TEXT_LIMIT,
    skipped,
  };
}
