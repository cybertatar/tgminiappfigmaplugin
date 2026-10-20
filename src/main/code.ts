// Main thread entry: owns the document, talks to the UI via postMessage.
import { PRESETS, resolveParams } from '../core';
import type { MainToUi, PluginState, UiToMain } from '../shared/messages';
import { bindGroups, clearIgnored, collect, groupOccurrences, nodesOfGroup, setIgnored, themeVariables } from './audit';
import { buildMatrix, resolveScreens } from './matrix';
import { applyPreset, findCollection, isThemeable, modeList, presetOf, syncCollection } from './theme-collection';

figma.showUI(__html__, { width: 360, height: 640, themeColors: true });

const post = (msg: MainToUi) => figma.ui.postMessage(msg);

const STORAGE_MATRIX = 'matrixPresetIds';
let matrixPresetIds: string[] = PRESETS.map((p) => p.id);

// The audit works on the layers that were selected when "Scan" was pressed,
// so clicking "Show on canvas" (which changes the selection) doesn't lose the list.
let scanRootIds: string[] = [];
let scanReferenceId: string | null = null;

async function scanRoots(): Promise<SceneNode[]> {
  const nodes = await Promise.all(scanRootIds.map((id) => figma.getNodeByIdAsync(id)));
  return nodes.filter((n): n is SceneNode => !!n && !n.removed && 'visible' in n);
}

async function postScan() {
  const roots = await scanRoots();
  if (roots.length === 0) {
    post({ type: 'scan-result', result: null });
    return;
  }
  const collection = await findCollection();
  const referencePresetId =
    scanReferenceId ?? (collection && presetOf(roots, collection)) ?? PRESETS[0].id;
  const preset = PRESETS.find((p) => p.id === referencePresetId) ?? PRESETS[0];
  const { occurrences, stats } = collect(roots);
  post({
    type: 'scan-result',
    result: {
      rootNames: roots.map((r) => r.name),
      referencePresetId: preset.id,
      groups: groupOccurrences(occurrences, resolveParams(preset.params, preset.scheme).params),
      stats,
    },
  });
}

async function currentState(): Promise<PluginState> {
  const collection = await findCollection();
  const selection = figma.currentPage.selection;
  return {
    collection: collection ? { id: collection.id, modes: modeList(collection) } : null,
    selection: {
      themeable: selection.filter(isThemeable).length,
      presetId: collection ? presetOf(selection, collection) : null,
      screens: (await resolveScreens(selection)).length,
      unbound: selection.length ? collect(selection).occurrences.length : 0,
    },
    matrixPresetIds,
  };
}

async function pushState() {
  post({ type: 'state', state: await currentState() });
}

async function handle(msg: UiToMain) {
  switch (msg.type) {
    case 'ready': {
      const saved = (await figma.clientStorage.getAsync(STORAGE_MATRIX)) as string[] | undefined;
      if (Array.isArray(saved)) matrixPresetIds = saved.filter((id) => PRESETS.some((p) => p.id === id));
      break;
    }
    case 'connect-theme': {
      const report = await syncCollection(PRESETS);
      post({ type: 'sync-done', report });
      figma.notify(report.createdCollection ? 'Telegram Theme connected' : 'Telegram Theme updated');
      break;
    }
    case 'apply-preset': {
      const collection = await findCollection();
      if (!collection) throw new Error('Connect Telegram Theme first.');
      const preset = PRESETS.find((p) => p.id === msg.presetId);
      if (!preset) throw new Error(`Unknown preset ${msg.presetId}`);
      const selection = figma.currentPage.selection;
      const n = applyPreset(selection, collection, preset);
      if (n === 0) throw new Error('Select a frame, section or component.');
      const unbound = collect(selection).occurrences.length;
      figma.notify(
        `${preset.name} → ${n} ${n === 1 ? 'layer' : 'layers'}` +
          (unbound ? ` · ${unbound} colors not bound, see Checks` : ''),
      );
      break;
    }
    case 'set-matrix-presets': {
      matrixPresetIds = msg.presetIds;
      await figma.clientStorage.setAsync(STORAGE_MATRIX, matrixPresetIds);
      break;
    }
    case 'build-matrix': {
      const collection = await findCollection();
      if (!collection) throw new Error('Connect Telegram Theme first.');
      const screens = await resolveScreens(figma.currentPage.selection);
      if (screens.length === 0) throw new Error('Select a screen frame.');
      const presets = PRESETS.filter((p) => matrixPresetIds.includes(p.id));
      if (presets.length === 0) throw new Error('Choose at least one theme.');
      const sections: SectionNode[] = [];
      for (const screen of screens) sections.push(await buildMatrix(screen, collection, presets));
      figma.viewport.scrollAndZoomIntoView(sections);
      figma.notify(`Theme matrix: ${sections.length} ${sections.length === 1 ? 'screen' : 'screens'} × ${presets.length} themes`);
      break;
    }
    case 'scan': {
      if (!msg.rescan) {
        const selection = figma.currentPage.selection;
        if (selection.length === 0) throw new Error('Select the layers to check.');
        scanRootIds = selection.map((n) => n.id);
      }
      if (msg.referencePresetId !== undefined) scanReferenceId = msg.referencePresetId;
      else if (!msg.rescan) scanReferenceId = null;
      await postScan();
      break;
    }
    case 'bind': {
      const collection = await findCollection();
      if (!collection) throw new Error('Connect Telegram Theme first.');
      const report = await bindGroups(await scanRoots(), msg.bindings, await themeVariables(collection));
      figma.notify(
        `Bound ${report.bound} ${report.bound === 1 ? 'color' : 'colors'}` +
          (report.failed.length ? ` · failed: ${report.failed.slice(0, 3).join(', ')}` : ''),
        { error: report.failed.length > 0 },
      );
      await postScan();
      break;
    }
    case 'ignore': {
      const roots = await scanRoots();
      const nodes = msg.groupIds.flatMap((id) => nodesOfGroup(roots, id));
      setIgnored(nodes, 'self');
      figma.notify(`${nodes.length} ${nodes.length === 1 ? 'layer' : 'layers'} marked as exceptions`);
      await postScan();
      break;
    }
    case 'ignore-selection': {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) throw new Error('Select illustrations, photos or logos to exclude.');
      setIgnored(selection, 'tree');
      figma.notify(`${selection.length} ${selection.length === 1 ? 'layer' : 'layers'} excluded with contents`);
      await postScan();
      break;
    }
    case 'clear-ignored': {
      const n = clearIgnored(await scanRoots());
      figma.notify(`Cleared ${n} ${n === 1 ? 'exception' : 'exceptions'}`);
      await postScan();
      break;
    }
    case 'show-group': {
      const nodes = nodesOfGroup(await scanRoots(), msg.groupId);
      if (nodes.length) {
        figma.currentPage.selection = nodes;
        figma.viewport.scrollAndZoomIntoView(nodes);
      }
      break;
    }
  }
  await pushState();
}

figma.ui.onmessage = (msg: UiToMain) => {
  handle(msg).catch((e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    post({ type: 'error', message });
    figma.notify(message, { error: true });
  });
};

figma.on('selectionchange', () => void pushState());
figma.on('currentpagechange', () => void pushState());
