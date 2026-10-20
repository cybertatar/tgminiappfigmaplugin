// Typed postMessage protocol between the UI iframe and the main thread.

export interface ModeInfo {
  presetId: string;
  modeId: string;
}

export interface PluginState {
  /** null until "Connect Telegram Theme" has run in this file. */
  collection: { id: string; modes: ModeInfo[] } | null;
  selection: {
    /** Nodes that can carry a variable mode (frames, sections, components, instances). */
    themeable: number;
    /** Preset applied to all themeable nodes, if they agree. */
    presetId: string | null;
  };
}

export interface SyncReport {
  createdCollection: boolean;
  createdVariables: number;
  addedModes: number;
  /** Presets that didn't fit (mode limit of the Figma plan). */
  skippedPresets: string[];
}

export type UiToMain =
  | { type: 'ready' }
  | { type: 'connect-theme' }
  | { type: 'apply-preset'; presetId: string };

export type MainToUi =
  | { type: 'state'; state: PluginState }
  | { type: 'sync-done'; report: SyncReport }
  | { type: 'error'; message: string };
