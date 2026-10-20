// Runs syncCollection against a minimal in-memory fake of figma.variables.
import { beforeEach, describe, expect, it } from 'vitest';
import { PRESETS, SYSTEM_COLOR_KEYS, THEME_PARAMS } from '../src/core';
import { readModeMap, syncCollection } from '../src/main/theme-collection';

const VARIABLES = THEME_PARAMS.length + SYSTEM_COLOR_KEYS.length;

class FakeCollection {
  modes: { modeId: string; name: string }[] = [{ modeId: 'm0', name: 'Mode 1' }];
  data: Record<string, string> = {};
  constructor(
    public id: string,
    public name: string,
    private maxModes: number,
  ) {}
  getPluginData(k: string) {
    return this.data[k] ?? '';
  }
  setPluginData(k: string, v: string) {
    this.data[k] = v;
  }
  renameMode(id: string, name: string) {
    this.modes.find((m) => m.modeId === id)!.name = name;
  }
  addMode(name: string) {
    if (this.modes.length >= this.maxModes) throw new Error('limit');
    const modeId = `m${this.modes.length}`;
    this.modes.push({ modeId, name });
    return modeId;
  }
}

class FakeVariable {
  data: Record<string, string> = {};
  values: Record<string, unknown> = {};
  codeSyntax: Record<string, string> = {};
  description = '';
  constructor(
    public name: string,
    public variableCollectionId: string,
  ) {}
  getPluginData(k: string) {
    return this.data[k] ?? '';
  }
  setPluginData(k: string, v: string) {
    this.data[k] = v;
  }
  setValueForMode(m: string, v: unknown) {
    this.values[m] = v;
  }
  setVariableCodeSyntax(p: string, v: string) {
    this.codeSyntax[p] = v;
  }
}

let collections: FakeCollection[];
let variables: FakeVariable[];

function installFigma(maxModes = 10) {
  collections = [];
  variables = [];
  (globalThis as any).figma = {
    variables: {
      getLocalVariableCollectionsAsync: async () => collections,
      getLocalVariablesAsync: async () => variables,
      createVariableCollection: (name: string) => {
        const c = new FakeCollection(`c${collections.length}`, name, maxModes);
        collections.push(c);
        return c;
      },
      createVariable: (name: string, c: FakeCollection) => {
        const v = new FakeVariable(name, c.id);
        variables.push(v);
        return v;
      },
    },
  };
}

describe('syncCollection', () => {
  beforeEach(() => installFigma());

  it('creates collection, theme + system variables and one mode per preset', async () => {
    const r = await syncCollection(PRESETS);
    expect(r).toMatchObject({ createdCollection: true, createdVariables: VARIABLES, skippedPresets: [] });
    const [c] = collections;
    expect(c.name).toBe('Telegram Theme');
    expect(c.modes.map((m) => m.name)).toEqual(PRESETS.map((p) => p.name));
    const bg = variables.find((v) => v.name === 'tg/bg_color')!;
    expect(bg.codeSyntax.WEB).toBe('var(--tg-theme-bg-color)');
    expect(Object.keys(bg.values)).toHaveLength(PRESETS.length);
    expect(bg.values[readModeMap(c as any)['ios-dark']]).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    const pill = variables.find((v) => v.name === 'system/fullscreen_control_bg')!;
    expect(pill.codeSyntax.WEB).toBeUndefined();
    expect(pill.values[readModeMap(c as any)['ios-light']]).toMatchObject({ r: 0, a: 0.14 });
    expect(pill.values[readModeMap(c as any)['ios-dark']]).toMatchObject({ r: 1, a: 0.11 });
    // Android Light has a blue header: dark text_color doesn't read there, so the title turns white.
    const title = variables.find((v) => v.name === 'system/header_title')!;
    expect(title.values[readModeMap(c as any)['android-light']]).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(title.values[readModeMap(c as any)['ios-light']]).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it('is idempotent and survives user renames', async () => {
    await syncCollection(PRESETS);
    collections[0].name = 'Renamed by user';
    variables[0].name = 'renamed';
    const r = await syncCollection(PRESETS);
    expect(r).toMatchObject({ createdCollection: false, createdVariables: 0, addedModes: 0 });
    expect(collections).toHaveLength(1);
    expect(variables).toHaveLength(VARIABLES);
    expect(collections[0].modes).toHaveLength(PRESETS.length);
  });

  it('reports presets that exceed the mode limit', async () => {
    installFigma(4);
    const r = await syncCollection(PRESETS);
    expect(r.skippedPresets).toEqual(PRESETS.slice(4).map((p) => p.name));
    expect(collections[0].modes).toHaveLength(4);
  });
});
