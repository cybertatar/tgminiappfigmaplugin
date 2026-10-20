// Entry points for system components: build the kit, insert instances, switch platform.
import { PLATFORM_LABEL, type BarLayout } from '../../components/bottom-bar';
import { BUTTON_FONTS, FALLBACK_FONT, pickFont } from '../../components/fonts';
import { PLATFORMS, PRESETS, type Platform } from '../../core';
import type { ComponentsReport } from '../../shared/messages';
import { themeVariables } from '../audit';
import { findCollection, KEY_PRESET, syncCollection } from '../theme-collection';
import { buildBottomComponents, TAG_BAR } from './bottom';
import { ensurePage, findPage, findSet, KEY_COMPONENT, variantName, type BuildContext } from './kit';


async function resolveFonts(): Promise<{ fonts: Record<Platform, FontName>; warnings: string[] }> {
  const available = new Set(
    (await figma.listAvailableFontsAsync()).map((f) => `${f.fontName.family}|${f.fontName.style}`),
  );
  const warnings: string[] = [];
  const fonts = {} as Record<Platform, FontName>;
  for (const p of PLATFORMS) {
    const font = pickFont(BUTTON_FONTS[p], available);
    if (!font) {
      warnings.push(`${PLATFORM_LABEL[p]}: ${BUTTON_FONTS[p].map((c) => c.family).join(' / ')} not found, using Inter`);
    }
    fonts[p] = font ?? FALLBACK_FONT;
  }
  await Promise.all(Object.values(fonts).map((f) => figma.loadFontAsync(f)));
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
  const report = await buildBottomComponents(page, ctx);
  return { ...report, fontWarnings: warnings };
}

export async function componentsReady(): Promise<boolean> {
  const page = await findPage();
  return !!page && !!findSet(page, TAG_BAR);
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

export async function insertBottomBar(target: FrameNode | ComponentNode, layout: BarLayout): Promise<InstanceNode> {
  if (!(await componentsReady())) await buildComponents();
  const set = findSet((await findPage())!, TAG_BAR)!;
  const platform = platformOf(target);
  const name = variantName({ Platform: PLATFORM_LABEL[platform], Layout: layout });
  const component = set.children.find((c) => c.name === name) as ComponentNode | undefined;
  if (!component) throw new Error(`Variant "${name}" not found. Run Create components again.`);

  const bar = component.createInstance();
  target.appendChild(bar);
  if (target.layoutMode !== 'NONE') bar.layoutPositioning = 'ABSOLUTE';
  bar.resize(target.width, bar.height);
  bar.primaryAxisSizingMode = 'AUTO'; // keep hugging content when the layout changes
  bar.x = 0;
  bar.y = target.height - bar.height;
  bar.constraints = { horizontal: 'STRETCH', vertical: 'MAX' };
  return bar;
}

/**
 * Switches the Platform variant of every kit instance under `root` (nested ones too).
 * Re-queries after each change because swapping a variant replaces nested nodes.
 */
export async function switchPlatform(root: SceneNode, platform: Platform): Promise<number> {
  const label = PLATFORM_LABEL[platform];
  const notOurs = new Set<string>();
  let switched = 0;
  for (let guard = 0; guard < 1000; guard++) {
    const instances: InstanceNode[] = [];
    if (root.type === 'INSTANCE') instances.push(root);
    if ('findAllWithCriteria' in root) instances.push(...root.findAllWithCriteria({ types: ['INSTANCE'] }));

    let next: InstanceNode | null = null;
    for (const inst of instances) {
      if (notOurs.has(inst.id)) continue;
      const prop = inst.componentProperties.Platform;
      if (!prop || prop.type !== 'VARIANT' || prop.value === label) continue;
      const main = await inst.getMainComponentAsync();
      if (main?.parent?.type === 'COMPONENT_SET' && main.parent.getPluginData(KEY_COMPONENT)) {
        next = inst;
        break;
      }
      notOurs.add(inst.id);
    }
    if (!next) break;
    next.setProperties({ Platform: label });
    switched++;
  }
  return switched;
}

