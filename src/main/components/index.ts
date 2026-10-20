// Entry points for system components: build the kit, insert instances, switch platform.
import { PLATFORM_LABEL } from '../../components/bottom-bar';
import { FULLSCREEN } from '../../components/fullscreen';
import { FALLBACK_FONTS, PLATFORM_FONTS, pickFont, type FontWeight } from '../../components/fonts';
import { PLATFORMS, PRESETS, type Platform } from '../../core';
import type { ComponentsReport, InsertRequest } from '../../shared/messages';
import { themeVariables } from '../audit';
import { findCollection, KEY_PRESET, syncCollection } from '../theme-collection';
import { buildBottomComponents, TAG_BAR, TAG_BUTTON } from './bottom';
import { buildFullscreenComponents, TAG_FULLSCREEN, TAG_SAFE_AREA } from './fullscreen';
import { buildHeaderComponents, TAG_HEADER } from './header';
import { ensurePage, findPage, findSet, KEY_COMPONENT, variantName, type BuildContext } from './kit';


async function resolveFonts(): Promise<{ fonts: BuildContext['fonts']; warnings: string[] }> {
  const available = new Set(
    (await figma.listAvailableFontsAsync()).map((f) => `${f.fontName.family}|${f.fontName.style}`),
  );
  const warnings: string[] = [];
  const fonts = {} as BuildContext['fonts'];
  for (const p of PLATFORMS) {
    fonts[p] = {} as Record<FontWeight, FontName>;
    for (const weight of ['regular', 'semibold'] as FontWeight[]) {
      const candidates = PLATFORM_FONTS[p][weight];
      const font = pickFont(candidates, available);
      if (!font) {
        const msg = `${PLATFORM_LABEL[p]}: ${candidates.map((c) => c.family).join(' / ')} not found, using Inter`;
        if (!warnings.includes(msg)) warnings.push(msg);
      }
      fonts[p][weight] = font ?? FALLBACK_FONTS[weight];
    }
  }
  const unique = new Map(PLATFORMS.flatMap((p) => Object.values(fonts[p])).map((f) => [`${f.family}|${f.style}`, f]));
  await Promise.all([...unique.values()].map((f) => figma.loadFontAsync(f)));
  return { fonts, warnings };
}

async function ensureCollection(): Promise<VariableCollection> {
  const existing = await findCollection();
  if (existing) return existing;
  await syncCollection(PRESETS);
  return (await findCollection())!;
}

export async function buildComponents(): Promise<ComponentsReport> {
  const collection = await ensureCollection();
  const vars = await themeVariables(collection);
  const { fonts, warnings } = await resolveFonts();
  const page = await ensurePage();
  const ctx: BuildContext = { vars, fonts };
  const reports = [
    await buildBottomComponents(page, ctx),
    await buildHeaderComponents(page, ctx),
    await buildFullscreenComponents(page, ctx),
  ];
  // Stack the sets vertically in a fixed order.
  let y = 0;
  for (const tag of ALL_TAGS) {
    const set = findSet(page, tag);
    if (!set) continue;
    set.x = 0;
    set.y = y;
    y += set.height + 120;
  }
  return {
    created: reports.reduce((n, r) => n + r.created, 0),
    updated: reports.reduce((n, r) => n + r.updated, 0),
    fontWarnings: warnings,
  };
}

const ALL_TAGS = [TAG_HEADER, TAG_BUTTON, TAG_BAR, TAG_FULLSCREEN, TAG_SAFE_AREA];

export async function componentsReady(): Promise<boolean> {
  const page = await findPage();
  return !!page && ALL_TAGS.every((tag) => findSet(page, tag));
}

/** Top-level screen containing the node (its parent is the page or a section). */
export function screenOf(node: SceneNode): FrameNode | ComponentNode | null {
  let n: BaseNode | null = node;
  while (n && n.parent && n.parent.type !== 'PAGE' && n.parent.type !== 'SECTION') n = n.parent;
  return n && (n.type === 'FRAME' || n.type === 'COMPONENT') ? n : null;
}

export function platformOf(node: SceneNode): Platform {
  const preset = PRESETS.find((p) => p.id === node.getPluginData(KEY_PRESET));
  return preset?.platform ?? 'ios';
}

async function variant(tag: string, props: Record<string, string>): Promise<ComponentNode> {
  if (!(await componentsReady())) await buildComponents();
  const set = findSet((await findPage())!, tag)!;
  const name = variantName(props);
  const component = set.children.find((c) => c.name === name) as ComponentNode | undefined;
  if (!component) throw new Error(`Variant "${name}" not found. Run Create components again.`);
  return component;
}

type Placement = { y: number | 'bottom'; vertical: ConstraintType } | 'cover';

function place(target: FrameNode | ComponentNode, component: ComponentNode, where: Placement): InstanceNode {
  const inst = component.createInstance();
  target.appendChild(inst);
  if (target.layoutMode !== 'NONE') inst.layoutPositioning = 'ABSOLUTE';
  if (where === 'cover') {
    inst.resize(target.width, target.height);
    inst.x = inst.y = 0;
    inst.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
    return inst;
  }
  const hugs = inst.layoutMode === 'VERTICAL' && component.primaryAxisSizingMode === 'AUTO';
  inst.resize(target.width, inst.height);
  if (hugs) inst.primaryAxisSizingMode = 'AUTO'; // keep hugging content when the variant changes
  inst.x = 0;
  inst.y = where.y === 'bottom' ? target.height - inst.height : where.y;
  inst.constraints = { horizontal: 'STRETCH', vertical: where.vertical };
  return inst;
}

export async function insertKit(target: FrameNode | ComponentNode, req: InsertRequest): Promise<SceneNode[]> {
  const platform = platformOf(target);
  switch (req.kind) {
    case 'bottom-bar': {
      const c = await variant(TAG_BAR, { Platform: PLATFORM_LABEL[platform], Layout: req.layout });
      return [place(target, c, { y: 'bottom', vertical: 'MAX' })];
    }
    case 'header': {
      const c = await variant(TAG_HEADER, {
        Platform: PLATFORM_LABEL[platform],
        Left: req.left,
        Color: req.color,
        State: 'Default',
      });
      return [place(target, c, { y: 0, vertical: 'MIN' })];
    }
    case 'fullscreen': {
      const fsPlatform = FULLSCREEN[platform] ? platform : 'ios';
      const spec = FULLSCREEN[fsPlatform]!;
      const out: SceneNode[] = [];
      if (req.guide) {
        const g = place(target, await variant(TAG_SAFE_AREA, { Platform: PLATFORM_LABEL[fsPlatform] }), 'cover');
        g.name = 'Safe area (guide)';
        g.locked = true;
        out.push(g);
      }
      const c = await variant(TAG_FULLSCREEN, {
        Platform: PLATFORM_LABEL[fsPlatform],
        Left: req.left,
        Tone: req.tone,
        State: 'Default',
      });
      out.unshift(place(target, c, { y: spec.safeTop, vertical: 'MIN' }));
      return out;
    }
  }
}

/**
 * Switches the Platform variant of every kit instance under `root` (nested ones too).
 * Re-queries after each change because swapping a variant replaces nested nodes.
 * Instances whose set has no variant for the platform (e.g. fullscreen on Desktop) are left as is.
 */
export async function switchPlatform(root: SceneNode, platform: Platform): Promise<number> {
  const label = PLATFORM_LABEL[platform];
  const skip = new Set<string>();
  let switched = 0;
  for (let guard = 0; guard < 1000; guard++) {
    const instances: InstanceNode[] = [];
    if (root.type === 'INSTANCE') instances.push(root);
    if ('findAllWithCriteria' in root) instances.push(...root.findAllWithCriteria({ types: ['INSTANCE'] }));

    let next: InstanceNode | null = null;
    for (const inst of instances) {
      if (skip.has(inst.id)) continue;
      const prop = inst.componentProperties.Platform;
      if (!prop || prop.type !== 'VARIANT' || prop.value === label) continue;
      const main = await inst.getMainComponentAsync();
      const set = main?.parent?.type === 'COMPONENT_SET' ? main.parent : null;
      if (set?.getPluginData(KEY_COMPONENT) && set.componentPropertyDefinitions.Platform?.variantOptions?.includes(label)) {
        next = inst;
        break;
      }
      skip.add(inst.id);
    }
    if (!next) break;
    next.setProperties({ Platform: label });
    switched++;
  }
  return switched;
}
