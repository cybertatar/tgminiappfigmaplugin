// Helpers for building components idempotently: every builder finds its child
// by name and updates it in place, so re-running never breaks existing instances.
import type { ThemeParamKey } from '../../core';
import { KEY_IGNORE } from '../audit';

export { KEY_IGNORE };

export const KEY_COMPONENT = 'tgComponent'; // on component sets: which kit component
const KEY_PAGE = 'tgPage';

export const PAGE_NAME = 'TG System Components';

export interface BuildContext {
  vars: Map<ThemeParamKey, Variable>;
  fonts: Record<string, FontName>;
}

export function boundPaint(ctx: BuildContext, key: ThemeParamKey, opacity = 1): SolidPaint {
  const v = ctx.vars.get(key);
  if (!v) throw new Error(`Variable tg/${key} is missing. Run Connect on the Themes tab.`);
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

export async function ensurePage(): Promise<PageNode> {
  let page = figma.root.children.find((p) => p.getPluginData(KEY_PAGE) === 'components');
  if (!page) {
    page = figma.createPage();
    page.name = PAGE_NAME;
    page.setPluginData(KEY_PAGE, 'components');
  }
  await page.loadAsync();
  return page;
}

export async function findPage(): Promise<PageNode | null> {
  const page = figma.root.children.find((p) => p.getPluginData(KEY_PAGE) === 'components') ?? null;
  if (page) await page.loadAsync();
  return page;
}

export function findSet(page: PageNode, tag: string): ComponentSetNode | null {
  return (
    (page.children.find((n) => n.type === 'COMPONENT_SET' && n.getPluginData(KEY_COMPONENT) === tag) as
      | ComponentSetNode
      | undefined) ?? null
  );
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

/** Key of a TEXT component property (e.g. "Label#12:3"), creating it if needed. */
export function ensureTextProperty(set: ComponentSetNode, name: string, defaultValue: string): string {
  const existing = Object.entries(set.componentPropertyDefinitions).find(
    ([k, d]) => d.type === 'TEXT' && k.split('#')[0] === name,
  );
  return existing ? existing[0] : set.addComponentProperty(name, 'TEXT', defaultValue);
}
