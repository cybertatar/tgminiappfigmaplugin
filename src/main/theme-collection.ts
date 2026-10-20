// A1/A2: the "Telegram Theme" variable collection and applying its modes to nodes.
import { cssVarRef, hexToRgba, resolveParams, THEME_PARAMS, variableName, type Preset } from '../core';
import type { ModeInfo, SyncReport } from '../shared/messages';

export const COLLECTION_NAME = 'Telegram Theme';

// Private pluginData keys. Names can be edited by users, these can't.
const KEY_COLLECTION = 'tgKit';
const KEY_MODES = 'tgModes'; // JSON: presetId -> modeId
export const KEY_PARAM = 'tgParam';
export const KEY_PRESET = 'tgPreset';

export async function findCollection(): Promise<VariableCollection | null> {
  const all = await figma.variables.getLocalVariableCollectionsAsync();
  return (
    all.find((c) => c.getPluginData(KEY_COLLECTION) === 'theme') ??
    all.find((c) => c.name === COLLECTION_NAME) ??
    null
  );
}

export function readModeMap(collection: VariableCollection): Record<string, string> {
  try {
    const map = JSON.parse(collection.getPluginData(KEY_MODES) || '{}') as Record<string, string>;
    const alive = new Set(collection.modes.map((m) => m.modeId));
    // Drop modes the user deleted by hand.
    return Object.fromEntries(Object.entries(map).filter(([, id]) => alive.has(id)));
  } catch {
    return {};
  }
}

export function modeList(collection: VariableCollection): ModeInfo[] {
  return Object.entries(readModeMap(collection)).map(([presetId, modeId]) => ({ presetId, modeId }));
}

/**
 * Creates or updates the collection. Idempotent: re-running updates values,
 * adds missing variables/modes and never deletes anything.
 */
export async function syncCollection(presets: readonly Preset[]): Promise<SyncReport> {
  const report: SyncReport = { createdCollection: false, createdVariables: 0, addedModes: 0, skippedPresets: [] };

  let collection = await findCollection();
  if (!collection) {
    collection = figma.variables.createVariableCollection(COLLECTION_NAME);
    report.createdCollection = true;
  }
  collection.setPluginData(KEY_COLLECTION, 'theme');

  const modeMap = readModeMap(collection);
  const claimed = () => new Set(Object.values(modeMap));

  for (const preset of presets) {
    const existing = modeMap[preset.id];
    if (existing) {
      const mode = collection.modes.find((m) => m.modeId === existing)!;
      if (mode.name !== preset.name) collection.renameMode(existing, preset.name);
      continue;
    }
    // Adopt an unclaimed mode with the same name, or the untouched default "Mode 1".
    const taken = claimed();
    const adopt =
      collection.modes.find((m) => !taken.has(m.modeId) && m.name === preset.name) ??
      collection.modes.find((m) => !taken.has(m.modeId) && m.name === 'Mode 1');
    if (adopt) {
      if (adopt.name !== preset.name) collection.renameMode(adopt.modeId, preset.name);
      modeMap[preset.id] = adopt.modeId;
      continue;
    }
    try {
      modeMap[preset.id] = collection.addMode(preset.name);
      report.addedModes++;
    } catch {
      // Most likely the plan's mode limit.
      report.skippedPresets.push(preset.name);
    }
  }
  collection.setPluginData(KEY_MODES, JSON.stringify(modeMap));

  const locals = (await figma.variables.getLocalVariablesAsync('COLOR')).filter(
    (v) => v.variableCollectionId === collection!.id,
  );
  const resolved = new Map(presets.map((p) => [p.id, resolveParams(p.params, p.scheme).params]));

  for (const param of THEME_PARAMS) {
    let variable =
      locals.find((v) => v.getPluginData(KEY_PARAM) === param.key) ??
      locals.find((v) => v.name === variableName(param.key));
    if (!variable) {
      variable = figma.variables.createVariable(variableName(param.key), collection, 'COLOR');
      report.createdVariables++;
    }
    variable.setPluginData(KEY_PARAM, param.key);
    variable.description = `${param.description}. Bot API ${param.since}+`;
    variable.setVariableCodeSyntax('WEB', cssVarRef(param.key));

    for (const preset of presets) {
      const modeId = modeMap[preset.id];
      if (!modeId) continue;
      variable.setValueForMode(modeId, hexToRgba(resolved.get(preset.id)![param.key]));
    }
  }
  return report;
}

type ThemeableNode = FrameNode | SectionNode | ComponentNode | ComponentSetNode | InstanceNode;

export function isThemeable(node: SceneNode): node is ThemeableNode {
  return (
    node.type === 'FRAME' ||
    node.type === 'SECTION' ||
    node.type === 'COMPONENT' ||
    node.type === 'COMPONENT_SET' ||
    node.type === 'INSTANCE'
  );
}

export function applyPreset(
  nodes: readonly SceneNode[],
  collection: VariableCollection,
  preset: Preset,
): number {
  const modeId = readModeMap(collection)[preset.id];
  if (!modeId) throw new Error(`"${preset.name}" is not in the Telegram Theme collection. Run Connect again.`);
  let count = 0;
  for (const node of nodes) {
    if (!isThemeable(node)) continue;
    node.setExplicitVariableModeForCollection(collection, modeId);
    node.setPluginData(KEY_PRESET, preset.id);
    // TODO(B1–B4): switch platform variant of system component instances inside `node`.
    count++;
  }
  return count;
}

/** Preset currently applied to all given nodes, or null if mixed/none. */
export function presetOf(nodes: readonly SceneNode[], collection: VariableCollection): string | null {
  const byMode = new Map(modeList(collection).map((m) => [m.modeId, m.presetId]));
  let result: string | null = null;
  for (const node of nodes) {
    if (!isThemeable(node)) continue;
    const id = byMode.get(node.explicitVariableModes[collection.id]) ?? null;
    if (id === null || (result !== null && result !== id)) return null;
    result = id;
  }
  return result;
}
