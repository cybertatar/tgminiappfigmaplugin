// D: reads kit instances on a screen and turns them into a Telegram.WebApp snippet.
import { cssVarRef, generateSnippet, rgbToHex, type BottomButtonSpec, type ScreenSpec, type ThemeParamKey } from '../core';
import type { HandoffResult } from '../shared/messages';
import { TAG_BAR } from './components/bottom';
import { TAG_FULLSCREEN } from './components/fullscreen';
import { TAG_HEADER } from './components/header';
import { KEY_COMPONENT } from './keys';
import { KEY_PARAM } from './theme-collection';

async function kitTag(inst: InstanceNode): Promise<string> {
  const main = await inst.getMainComponentAsync();
  const owner = main?.parent?.type === 'COMPONENT_SET' ? main.parent : main;
  return owner?.getPluginData(KEY_COMPONENT) ?? '';
}

const variantValue = (inst: InstanceNode, name: string) => {
  const p = inst.componentProperties[name];
  return p?.type === 'VARIANT' ? String(p.value) : undefined;
};
const textValue = (inst: InstanceNode, name: string) => {
  const entry = Object.entries(inst.componentProperties).find(([k, p]) => p.type === 'TEXT' && k.split('#')[0] === name);
  return entry ? String(entry[1].value) : undefined;
};

/** Theme param a paint is bound to, a raw hex, or null if there's no solid paint. */
async function paintRef(node: SceneNode | null): Promise<{ key?: ThemeParamKey; hex?: string } | null> {
  if (!node || !('fills' in node) || node.fills === figma.mixed) return null;
  const paint = node.fills.filter((p) => p.visible !== false).pop();
  if (!paint || paint.type !== 'SOLID') return null;
  const alias = paint.boundVariables?.color;
  if (alias) {
    const v = await figma.variables.getVariableByIdAsync(alias.id);
    const key = v?.getPluginData(KEY_PARAM) as ThemeParamKey | undefined;
    if (key) return { key };
  }
  return { hex: rgbToHex(paint.color) };
}

async function buttonSpec(inst: InstanceNode | null, defaults: { bg: ThemeParamKey; fg: ThemeParamKey }): Promise<BottomButtonSpec | undefined> {
  if (!inst || !inst.visible) return undefined;
  const state = variantValue(inst, 'State') ?? 'Default';
  const spec: BottomButtonSpec = {
    visible: true,
    text: textValue(inst, 'Label'),
    active: state !== 'Inactive',
    progress: state === 'Loading',
    shine: state === 'Shine',
  };
  const bg = await paintRef(inst);
  if (bg && bg.key !== defaults.bg) spec.color = bg.hex ?? undefined;
  const label = inst.findOne((n) => n.name === 'Label' && n.type === 'TEXT');
  const fg = await paintRef(label);
  if (fg && fg.key !== defaults.fg) spec.textColor = fg.hex ?? undefined;
  return spec;
}

export async function analyzeScreen(screen: SceneNode, settingsButton: boolean): Promise<HandoffResult> {
  const spec: ScreenSpec = { settingsButton };
  const found: string[] = [];
  const instances = 'findAllWithCriteria' in screen ? screen.findAllWithCriteria({ types: ['INSTANCE'] }) : [];

  for (const inst of instances) {
    if (!inst.visible) continue;
    const tag = await kitTag(inst);
    if (tag === TAG_HEADER) {
      found.push('Header');
      if (variantValue(inst, 'Left') === 'Back') spec.backButton = true;
      const color = variantValue(inst, 'Color');
      if (color === 'Background') spec.headerColor = 'bg_color';
      else if (color === 'Secondary') spec.headerColor = 'secondary_bg_color';
      else if (color?.startsWith('Custom')) {
        const bar = inst.findOne((n) => n.name === 'Bar');
        spec.headerColor = (await paintRef(bar))?.hex ?? undefined;
      }
    } else if (tag === TAG_FULLSCREEN) {
      found.push('Fullscreen');
      spec.fullscreen = true;
      if (variantValue(inst, 'Left') === 'Back') spec.backButton = true;
    } else if (tag === TAG_BAR) {
      found.push('Bottom bar');
      const layout = variantValue(inst, 'Layout') ?? 'Main only';
      const byName = (name: string) =>
        (inst.findOne((n) => n.type === 'INSTANCE' && n.name === name) as InstanceNode | null) ?? null;
      spec.mainButton = await buttonSpec(byName('Main Button'), { bg: 'button_color', fg: 'button_text_color' });
      const secondary = await buttonSpec(byName('Secondary Button'), { bg: 'bottom_bar_bg_color', fg: 'button_color' });
      if (secondary) {
        const pos = layout.startsWith('Secondary ') ? layout.slice('Secondary '.length) : '';
        spec.secondaryButton = { ...secondary, position: ['left', 'right', 'top', 'bottom'].includes(pos) ? (pos as 'left') : undefined };
      }
      const barColor = await paintRef(inst);
      if (barColor && barColor.key !== 'bottom_bar_bg_color') spec.bottomBarColor = barColor.key ?? barColor.hex;
    }
  }

  // CSS variables used anywhere on the screen.
  const keys = new Set<ThemeParamKey>();
  const nodes: SceneNode[] = [screen, ...('findAll' in screen ? screen.findAll() : [])];
  const varIds = new Set<string>();
  for (const n of nodes) {
    for (const field of ['fills', 'strokes'] as const) {
      const paints = (n as any)[field];
      if (!Array.isArray(paints)) continue;
      for (const p of paints as Paint[]) if (p.type === 'SOLID' && p.boundVariables?.color) varIds.add(p.boundVariables.color.id);
    }
  }
  for (const id of varIds) {
    const key = (await figma.variables.getVariableByIdAsync(id))?.getPluginData(KEY_PARAM) as ThemeParamKey | undefined;
    if (key) keys.add(key);
  }

  return {
    screenName: screen.name,
    found,
    snippet: generateSnippet(spec),
    cssVars: [...keys].sort().map((k) => cssVarRef(k)),
  };
}
