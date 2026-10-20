// Typed postMessage protocol between the UI iframe and the main thread.
import type { BarLayout } from '../components/bottom-bar';
import type { FullscreenLeft } from '../components/fullscreen';
import type { HeaderColor, HeaderLeft } from '../components/header';
import type { PaintTarget, Suggestion, ThemeParamKey } from '../core';

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
    /** Source screens the theme matrix would be built for. */
    screens: number;
    /** Solid paints in the selection not bound to any variable. */
    unbound: number;
  };
  /** Presets checked for the theme matrix (remembered between runs). */
  matrixPresetIds: string[];
  /** System components page exists in this file. */
  componentsReady: boolean;
  /** Screen a component would be inserted into (top-level frame of the selection). */
  insertTarget: { name: string; platform: string } | null;
}

export type InsertRequest =
  | { kind: 'bottom-bar'; layout: BarLayout }
  | { kind: 'header'; left: HeaderLeft; color: HeaderColor }
  | { kind: 'fullscreen'; left: FullscreenLeft };

export interface ComponentsReport {
  created: number;
  updated: number;
  fontWarnings: string[];
}

export interface SyncReport {
  createdCollection: boolean;
  createdVariables: number;
  addedModes: number;
  /** Presets that didn't fit (mode limit of the Figma plan). */
  skippedPresets: string[];
}

/** All paints of one raw color used in one kind of place (e.g. "#000000 in text"). */
export interface ColorGroup {
  id: string;
  hex: string;
  target: PaintTarget;
  /** Number of paints. */
  count: number;
  /** A few layer names, for the list. */
  layerNames: string[];
  suggestion: Suggestion;
}

export interface ScanStats {
  layers: number;
  gradients: number;
  /** Paints using a color style (left as is). */
  styled: number;
  /** Layers marked as exceptions. */
  ignored: number;
  /** Hit the node limit. */
  truncated: boolean;
}

export interface ScanResult {
  rootNames: string[];
  /** Theme the raw colors are matched against. */
  referencePresetId: string;
  groups: ColorGroup[];
  stats: ScanStats;
}

export interface ContrastRow {
  nodeId: string;
  name: string;
  text: string;
  /** WCAG large text: 4.5 → 3. */
  large: boolean;
  threshold: number;
  /** One ratio per preset (worst text segment); null when a color can't be resolved. */
  ratios: (number | null)[];
  /** Number of themes below the threshold. */
  failing: number;
}

export interface ContrastResult {
  presetIds: string[];
  rows: ContrastRow[];
  checked: number;
  truncated: boolean;
  skipped: { noBackground: number; unsupported: number; system: number };
}

export interface HandoffResult {
  screenName: string;
  /** Kit components found on the screen. */
  found: string[];
  snippet: string;
  /** var(--tg-theme-*) used by bound colors on the screen. */
  cssVars: string[];
}

export type UiToMain =
  | { type: 'ready' }
  | { type: 'connect-theme' }
  | { type: 'apply-preset'; presetId: string }
  | { type: 'set-matrix-presets'; presetIds: string[] }
  | { type: 'build-matrix' }
  /** Scans the current selection (or the previous scan's layers if `rescan`). */
  | { type: 'scan'; referencePresetId?: string; rescan?: boolean }
  | { type: 'bind'; bindings: { groupId: string; key: ThemeParamKey }[] }
  | { type: 'ignore'; groupIds: string[] }
  /** Excludes the selected layers with everything inside them. */
  | { type: 'ignore-selection' }
  | { type: 'clear-ignored' }
  | { type: 'show-group'; groupId: string }
  | { type: 'build-components' }
  | { type: 'insert'; request: InsertRequest }
  | { type: 'contrast' }
  | { type: 'handoff'; settingsButton: boolean }
  | { type: 'select-node'; nodeId: string };

export type MainToUi =
  | { type: 'state'; state: PluginState }
  | { type: 'sync-done'; report: SyncReport }
  | { type: 'scan-result'; result: ScanResult | null }
  | { type: 'components-done'; report: ComponentsReport }
  | { type: 'contrast-result'; result: ContrastResult }
  | { type: 'handoff-result'; result: HandoffResult }
  | { type: 'error'; message: string };
