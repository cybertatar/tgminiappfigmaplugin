// Main thread entry: owns the document, talks to the UI via postMessage.
import { PRESETS } from '../core';
import type { MainToUi, PluginState, UiToMain } from '../shared/messages';
import { buildMatrix, resolveScreens } from './matrix';
import { applyPreset, findCollection, isThemeable, modeList, presetOf, syncCollection } from './theme-collection';

figma.showUI(__html__, { width: 360, height: 640, themeColors: true });

const post = (msg: MainToUi) => figma.ui.postMessage(msg);

const STORAGE_MATRIX = 'matrixPresetIds';
let matrixPresetIds: string[] = PRESETS.map((p) => p.id);

async function currentState(): Promise<PluginState> {
  const collection = await findCollection();
  const selection = figma.currentPage.selection;
  return {
    collection: collection ? { id: collection.id, modes: modeList(collection) } : null,
    selection: {
      themeable: selection.filter(isThemeable).length,
      presetId: collection ? presetOf(selection, collection) : null,
      screens: (await resolveScreens(selection)).length,
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
      const n = applyPreset(figma.currentPage.selection, collection, preset);
      if (n === 0) throw new Error('Select a frame, section or component.');
      figma.notify(`${preset.name} → ${n} ${n === 1 ? 'layer' : 'layers'}`);
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
