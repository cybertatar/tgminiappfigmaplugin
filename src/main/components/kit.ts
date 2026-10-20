// Helpers for building components idempotently: every builder finds its child
// by name and updates it in place, so re-running never breaks existing instances.
import type { FontWeight } from '../../components/fonts';
import type { Platform, SystemColorKey, ThemeParamKey } from '../../core';
import { KEY_COMPONENT, KEY_IGNORE } from '../keys';
import { UserError } from '../errors';

export { KEY_COMPONENT, KEY_IGNORE };
const KEY_PAGE = 'tgPage';

export const PAGE_NAME = 'TG System Components';

export interface BuildContext {
  vars: Map<ThemeParamKey, Variable>;
  fonts: Record<Platform, Record<FontWeight, FontName>>;
  system: Map<SystemColorKey, Variable>;
}

/** Paint bound to a `system/` variable (Telegram system UI color that follows light/dark). */
export function systemPaint(ctx: BuildContext, key: SystemColorKey): SolidPaint {
  const v = ctx.system.get(key);
  if (!v) throw new UserError(`Variable system/${key} is missing. Run Update on the Themes tab.`);
  return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v);
}

export function boundPaint(ctx: BuildContext, key: ThemeParamKey, opacity = 1): SolidPaint {
  const v = ctx.vars.get(key);
  if (!v) throw new UserError(`Variable tg/${key} is missing. Run Connect on the Themes tab.`);
  return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity }, 'color', v);
}

type Parent = BaseNode & ChildrenMixin;

/** Finds a direct child by name and type, or creates it. */
export function ensureChild<T extends SceneNode>(parent: Parent, name: string, type: T['type'], create: () => T): T {
  const existing = parent.children.find((c) => c.name === name);
  if (existing && existing.type === type) return existing as T;
  existing?.remove();
  const node = create();
  node.name = name;
  parent.appendChild(node);
  return node;
}

export function removeChild(parent: Parent, name: string) {
  parent.children.find((c) => c.name === name)?.remove();
}

/** Stretches an absolutely positioned overlay over its auto-layout parent. */
export function overlay(node: RectangleNode, parent: FrameNode | ComponentNode) {
  node.layoutPositioning = 'ABSOLUTE';
  node.x = 0;
  node.y = 0;
  node.resize(parent.width, parent.height);
  node.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
}

// Plugin data is stored per plugin ID, so after the ID changes (dev → published) it's gone.
// Lookups fall back to names and re-tag what they find.
function pageByTagOrName(): PageNode | undefined {
  const tagged = figma.root.children.find((p) => p.getPluginData(KEY_PAGE) === 'components');
  if (tagged) return tagged;
  const named = figma.root.children.find((p) => p.name === PAGE_NAME);
  named?.setPluginData(KEY_PAGE, 'components');
  return named;
}

export async function ensurePage(): Promise<PageNode> {
  let page = pageByTagOrName();
  if (!page) {
    page = figma.createPage();
    page.name = PAGE_NAME;
    page.setPluginData(KEY_PAGE, 'components');
  }
  await page.loadAsync();
  return page;
}

export async function findPage(): Promise<PageNode | null> {
  const page = pageByTagOrName() ?? null;
  if (page) await page.loadAsync();
  return page;
}

const SET_NAMES: Record<string, string> = {
  'bottom-button': 'TG Bottom Button',
  'bottom-bar': 'TG Bottom Bar',
  header: 'TG Header',
  'fullscreen-controls': 'TG Fullscreen',
};

export function findSet(page: PageNode, tag: string): ComponentSetNode | null {
  const sets = page.children.filter((n): n is ComponentSetNode => n.type === 'COMPONENT_SET');
  const tagged = sets.find((n) => n.getPluginData(KEY_COMPONENT) === tag);
  if (tagged) return tagged;
  const named = SET_NAMES[tag] ? sets.find((n) => n.name === SET_NAMES[tag] && !n.getPluginData(KEY_COMPONENT)) : undefined;
  named?.setPluginData(KEY_COMPONENT, tag);
  return named ?? null;
}

export const variantName = (props: Record<string, string>) =>
  Object.entries(props)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

export interface VariantSpec {
  props: Record<string, string>;
  build: (c: ComponentNode) => Promise<void> | void;
}

export interface SetReport {
  created: number;
  updated: number;
}

/**
 * Creates or updates a component set: missing variants are added, existing ones rebuilt in place.
 * `columns` = variants per row in the set's grid.
 */
export async function ensureSet(
  page: PageNode,
  tag: string,
  name: string,
  variants: VariantSpec[],
  columns: number,
): Promise<{ set: ComponentSetNode; report: SetReport }> {
  let set = findSet(page, tag);
  const report: SetReport = { created: 0, updated: 0 };
  const created: ComponentNode[] = [];
  const all: ComponentNode[] = [];

  // Variants the kit no longer defines (e.g. a removed property) are deleted.
  if (set) {
    const wanted = new Set(variants.map((v) => variantName(v.props)));
    for (const child of [...set.children]) if (!wanted.has(child.name)) child.remove();
  }

  for (const v of variants) {
    const vName = variantName(v.props);
    let c = set?.children.find((n) => n.name === vName) as ComponentNode | undefined;
    if (c) report.updated++;
    else {
      c = figma.createComponent();
      c.name = vName;
      page.appendChild(c);
      created.push(c);
      report.created++;
    }
    await v.build(c);
    all.push(c);
  }

  if (!set) {
    set = figma.combineAsVariants(all, page);
    set.setPluginData(KEY_COMPONENT, tag);
  } else {
    for (const c of created) set.appendChild(c);
  }
  set.name = name;

  // Grid: rows of `columns`, each row as tall as its tallest variant.
  const GAP = 24;
  let y = GAP;
  let width = 0;
  for (let i = 0; i < all.length; i += columns) {
    const row = all.slice(i, i + columns);
    let x = GAP;
    for (const c of row) {
      c.x = x;
      c.y = y;
      x += c.width + GAP;
    }
    width = Math.max(width, x);
    y += Math.max(...row.map((c) => c.height)) + GAP;
  }
  set.resizeWithoutConstraints(width, y);
  set.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }];
  set.setPluginData(KEY_IGNORE, 'self');
  return { set, report };
}

export function ensureBooleanProperty(set: ComponentSetNode, name: string, defaultValue: boolean): string {
  const existing = Object.entries(set.componentPropertyDefinitions).find(
    ([k, d]) => d.type === 'BOOLEAN' && k.split('#')[0] === name,
  );
  return existing ? existing[0] : set.addComponentProperty(name, 'BOOLEAN', defaultValue);
}

/**
 * Deletes an obsolete BOOLEAN/TEXT/INSTANCE_SWAP property by name. Variant properties are left
 * alone: Figma can't delete them, and one may legitimately share the name (e.g. "Status bar").
 */
export function removeProperty(set: ComponentSetNode, name: string) {
  for (const [key, def] of Object.entries(set.componentPropertyDefinitions)) {
    if (def.type !== 'VARIANT' && key.split('#')[0] === name) set.deleteComponentProperty(key);
  }
}

/** Key of a TEXT component property (e.g. "Label#12:3"), creating it if needed. */
export function ensureTextProperty(set: ComponentSetNode, name: string, defaultValue: string): string {
  const existing = Object.entries(set.componentPropertyDefinitions).find(
    ([k, d]) => d.type === 'TEXT' && k.split('#')[0] === name,
  );
  return existing ? existing[0] : set.addComponentProperty(name, 'TEXT', defaultValue);
}

export function rawPaint(hex: string, opacity = 1): SolidPaint {
  const n = parseInt(hex.slice(1), 16);
  return { type: 'SOLID', color: { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }, opacity };
}

export type IconKind = 'close' | 'chevron-left' | 'arrow-left' | 'chevron-down' | 'dots-h' | 'dots-v' | 'dots-circle';

function strokeVector(path: string, paint: SolidPaint, weight: number): VectorNode {
  const v = figma.createVector();
  v.vectorPaths = [{ windingRule: 'NONE', data: path }];
  v.fills = [];
  v.strokes = [paint];
  v.strokeWeight = weight;
  v.strokeCap = 'ROUND';
  v.strokeJoin = 'ROUND';
  return v;
}

function dots(frame: FrameNode, s: number, paint: SolidPaint, vertical: boolean, d: number, spread: number) {
  for (const t of [-spread, 0, spread]) {
    const dot = figma.createEllipse();
    dot.resize(d, d);
    dot.fills = [paint];
    frame.appendChild(dot);
    dot.x = (vertical ? s / 2 : s / 2 + t * s) - d / 2;
    dot.y = (vertical ? s / 2 + t * s : s / 2) - d / 2;
  }
}

/**
 * Simple system glyphs drawn as vectors (no Telegram assets). The glyph is redrawn on every
 * build; the icon frame keeps its identity so instance overrides on it survive.
 */
export interface IconOptions {
  /** Empty margin around the glyph as a fraction of the size (default 0.22). */
  inset?: number;
  /** Stroke weight in px (default s/12). */
  weight?: number;
}

export function ensureIcon(
  parent: BaseNode & ChildrenMixin,
  name: string,
  kind: IconKind,
  s: number,
  paint: SolidPaint,
  opts: IconOptions = {},
) {
  const frame = ensureChild(parent, name, 'FRAME', () => figma.createFrame());
  frame.resize(s, s);
  frame.fills = [];
  frame.clipsContent = false;
  for (const c of [...frame.children]) c.remove();
  const w = opts.weight ?? Math.max(1.5, s / 12);
  const i = opts.inset ?? 0.22;
  const k = (1 - 2 * i) * 0.27; // half-height of the chevron
  const p = (x: number, y: number) => `${(x * s).toFixed(2)} ${(y * s).toFixed(2)}`;

  let glyph: VectorNode | null = null;
  switch (kind) {
    case 'close':
      glyph = strokeVector(`M ${p(i, i)} L ${p(1 - i, 1 - i)} M ${p(1 - i, i)} L ${p(i, 1 - i)}`, paint, w);
      break;
    case 'chevron-left':
      glyph = strokeVector(`M ${p(0.62, 0.15)} L ${p(0.3, 0.5)} L ${p(0.62, 0.85)}`, paint, w * 1.1);
      break;
    case 'arrow-left':
      glyph = strokeVector(`M ${p(0.82, 0.5)} L ${p(0.18, 0.5)} M ${p(0.45, 0.23)} L ${p(0.18, 0.5)} L ${p(0.45, 0.77)}`, paint, w);
      break;
    case 'chevron-down':
      glyph = strokeVector(`M ${p(i, 0.5 - k)} L ${p(0.5, 0.5 + k)} L ${p(1 - i, 0.5 - k)}`, paint, w);
      break;
    case 'dots-h': {
      const d = opts.inset !== undefined ? s * 0.2 : s * 0.17;
      dots(frame, s, paint, false, d, 0.5 - i - d / s / 2);
      break;
    }
    case 'dots-v':
      dots(frame, s, paint, true, s * 0.15, 0.27);
      break;
    case 'dots-circle': {
      const ring = figma.createEllipse();
      const rw = Math.max(1.2, s / 15);
      ring.resize(s - rw, s - rw);
      ring.fills = [];
      ring.strokes = [paint];
      ring.strokeWeight = rw;
      frame.appendChild(ring);
      ring.x = ring.y = rw / 2;
      dots(frame, s, paint, false, s * 0.13, 0.22);
      break;
    }
  }
  if (glyph) {
    frame.appendChild(glyph);
    glyph.x = (s - glyph.width) / 2;
    glyph.y = (s - glyph.height) / 2;
  }
  return frame;
}
