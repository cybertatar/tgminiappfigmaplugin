// C1: finds solid paints not bound to a variable and binds them to Telegram Theme variables.
import { hexToRgb, rgbToHex, suggestParam, type PaintTarget, type ResolvedThemeParams, type ThemeParamKey } from '../core';
import type { ColorGroup, ScanStats } from '../shared/messages';
import { KEY_PARAM } from './theme-collection';

// 'self': skip this layer's own paints (set from a color group).
// 'tree': skip the layer and everything inside (illustrations, logos, photos).
export const KEY_IGNORE = 'tgIgnore';
export type IgnoreMode = 'self' | 'tree';
/** Vectors up to this size are treated as icons (they usually take text colors). */
const ICON_MAX_SIZE = 48;
const SCAN_NODE_LIMIT = 20000;

type PaintField = 'fills' | 'strokes';

interface Occurrence {
  node: SceneNode;
  field: PaintField;
  index: number;
  /** Character range for text nodes with mixed fills. */
  range?: { start: number; end: number };
  hex: string;
  target: PaintTarget;
}

const groupId = (target: PaintTarget, hex: string) => `${target}|${hex}`;

const VECTOR_TYPES = new Set<NodeType>(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'ELLIPSE', 'LINE']);

function fillTarget(node: SceneNode): PaintTarget {
  if (node.type === 'TEXT') return 'text';
  if (VECTOR_TYPES.has(node.type) && node.width <= ICON_MAX_SIZE && node.height <= ICON_MAX_SIZE) return 'icon';
  return 'fill';
}

const hasStyle = (id: string | typeof figma.mixed | undefined) => typeof id === 'string' && id !== '';

export interface Collected {
  occurrences: Occurrence[];
  stats: ScanStats;
}

export function collect(roots: readonly SceneNode[]): Collected {
  const occurrences: Occurrence[] = [];
  const stats: ScanStats = { layers: 0, gradients: 0, styled: 0, ignored: 0, truncated: false };

  const addPaints = (
    node: SceneNode,
    field: PaintField,
    paints: readonly Paint[],
    target: PaintTarget,
    range?: Occurrence['range'],
  ) => {
    paints.forEach((paint, index) => {
      if (paint.visible === false) return;
      if (paint.type === 'SOLID') {
        if (paint.boundVariables?.color) return;
        occurrences.push({ node, field, index, range, hex: rgbToHex(paint.color), target });
      } else if (paint.type.startsWith('GRADIENT')) {
        stats.gradients++;
      }
    });
  };

  const visit = (node: SceneNode) => {
    if (stats.layers >= SCAN_NODE_LIMIT) {
      stats.truncated = true;
      return;
    }
    const ignore = node.getPluginData(KEY_IGNORE);
    if (ignore) stats.ignored++;
    if (ignore === 'tree') return;
    stats.layers++;

    if (ignore === 'self') {
      // own paints skipped, children still checked
    } else if ('fills' in node) {
      if (node.type === 'TEXT' && node.fills === figma.mixed) {
        for (const seg of node.getStyledTextSegments(['fills', 'fillStyleId'])) {
          if (hasStyle(seg.fillStyleId)) stats.styled++;
          else addPaints(node, 'fills', seg.fills, 'text', { start: seg.start, end: seg.end });
        }
      } else if (node.fills !== figma.mixed) {
        if (hasStyle(node.fillStyleId)) stats.styled++;
        else addPaints(node, 'fills', node.fills, fillTarget(node));
      }
    }
    if (ignore !== 'self' && 'strokes' in node && node.strokes.length) {
      if (hasStyle(node.strokeStyleId)) stats.styled++;
      else addPaints(node, 'strokes', node.strokes, 'stroke');
    }
    if ('children' in node) for (const child of node.children) visit(child);
  };

  for (const root of roots) visit(root);
  return { occurrences, stats };
}

export function groupOccurrences(occurrences: readonly Occurrence[], params: ResolvedThemeParams): ColorGroup[] {
  const groups = new Map<string, ColorGroup & { nodeIds: Set<string> }>();
  for (const o of occurrences) {
    const id = groupId(o.target, o.hex);
    let g = groups.get(id);
    if (!g) {
      const suggestion = suggestParam(hexToRgb(o.hex), params, o.target);
      g = { id, hex: o.hex, target: o.target, count: 0, layerNames: [], suggestion, nodeIds: new Set() };
      groups.set(id, g);
    }
    g.count++;
    if (!g.nodeIds.has(o.node.id)) {
      g.nodeIds.add(o.node.id);
      if (g.layerNames.length < 3) g.layerNames.push(o.node.name);
    }
  }
  return [...groups.values()]
    .map(({ nodeIds: _, ...g }) => g)
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

/** Nodes that contain a given group (for "Show on canvas" and "Ignore"). */
export function nodesOfGroup(roots: readonly SceneNode[], id: string): SceneNode[] {
  const nodes = new Map<string, SceneNode>();
  for (const o of collect(roots).occurrences) {
    if (groupId(o.target, o.hex) === id) nodes.set(o.node.id, o.node);
  }
  return [...nodes.values()];
}

export async function themeVariables(collection: VariableCollection): Promise<Map<ThemeParamKey, Variable>> {
  const vars = await figma.variables.getLocalVariablesAsync('COLOR');
  const map = new Map<ThemeParamKey, Variable>();
  for (const v of vars) {
    if (v.variableCollectionId !== collection.id) continue;
    const key = v.getPluginData(KEY_PARAM) as ThemeParamKey;
    if (key) map.set(key, v);
  }
  return map;
}

export interface BindReport {
  bound: number;
  /** Text layers that couldn't be changed (e.g. missing font). */
  failed: string[];
}

export async function bindGroups(
  roots: readonly SceneNode[],
  bindings: { groupId: string; key: ThemeParamKey }[],
  variables: Map<ThemeParamKey, Variable>,
): Promise<BindReport> {
  const keyByGroup = new Map(bindings.map((b) => [b.groupId, b.key]));

  // One write per node + field + text range, with all paint indexes updated at once.
  const edits = new Map<string, { o: Occurrence; byIndex: Map<number, Variable> }>();
  for (const o of collect(roots).occurrences) {
    const key = keyByGroup.get(groupId(o.target, o.hex));
    const variable = key && variables.get(key);
    if (!variable) continue;
    const editKey = `${o.node.id}|${o.field}|${o.range ? `${o.range.start}-${o.range.end}` : ''}`;
    let e = edits.get(editKey);
    if (!e) edits.set(editKey, (e = { o, byIndex: new Map() }));
    e.byIndex.set(o.index, variable);
  }

  const report: BindReport = { bound: 0, failed: [] };
  for (const { o, byIndex } of edits.values()) {
    const apply = () => {
      const node = o.node as SceneNode & MinimalFillsMixin & MinimalStrokesMixin;
      const current = o.range
        ? ((node as TextNode).getRangeFills(o.range.start, o.range.end) as Paint[])
        : (node[o.field] as Paint[]);
      const next = current.map((p, i) => {
        const v = byIndex.get(i);
        return v && p.type === 'SOLID' ? figma.variables.setBoundVariableForPaint(p, 'color', v) : p;
      });
      if (o.range) (node as TextNode).setRangeFills(o.range.start, o.range.end, next);
      else node[o.field] = next;
    };
    try {
      try {
        apply();
      } catch (e) {
        // Text edits may need the layer's fonts loaded.
        if (o.node.type !== 'TEXT') throw e;
        const fonts = o.node.getRangeAllFontNames(0, o.node.characters.length);
        await Promise.all(fonts.map((f) => figma.loadFontAsync(f)));
        apply();
      }
      report.bound += byIndex.size;
    } catch {
      report.failed.push(o.node.name);
    }
  }
  return report;
}

export function setIgnored(nodes: readonly SceneNode[], mode: IgnoreMode) {
  for (const n of nodes) n.setPluginData(KEY_IGNORE, mode);
}

/** Clears exceptions on the roots and everything inside them. */
export function clearIgnored(roots: readonly SceneNode[]): number {
  let n = 0;
  const visit = (node: SceneNode) => {
    if (node.getPluginData(KEY_IGNORE)) {
      node.setPluginData(KEY_IGNORE, '');
      n++;
    }
    if ('children' in node) node.children.forEach(visit);
  };
  roots.forEach(visit);
  return n;
}
