// A3: "Lay out themes" — copies a screen into a section, one copy per theme.
import { hexToRgb, layoutMatrix, type Preset } from '../core';
import { switchPlatform } from './components';
import { KEY_PRESET, readModeMap } from './theme-collection';
import { UserError } from './errors';

const KEY_MATRIX_FOR = 'tgMatrixFor'; // on the section: source screen id
const KEY_COPY_OF = 'tgMatrixCopyOf'; // on each copy: source screen id
const GAP_BELOW_SOURCE = 200;

const PLATFORM_LABEL = { ios: 'iOS', android: 'Android', desktop: 'Desktop' } as const;

type Screen = FrameNode | ComponentNode | InstanceNode;

const isScreen = (n: BaseNode | null): n is Screen =>
  !!n && (n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'INSTANCE');

const isMatrixSection = (n: BaseNode | null): n is SectionNode =>
  !!n && n.type === 'SECTION' && n.getPluginData(KEY_MATRIX_FOR) !== '';

/**
 * Maps the selection to source screens. Selecting a matrix section or a copy
 * inside it resolves to the original screen, so the matrix can be rebuilt from anywhere.
 */
export async function resolveScreens(selection: readonly SceneNode[]): Promise<Screen[]> {
  const out = new Map<string, Screen>();
  for (const node of selection) {
    let target: BaseNode | null = node;
    if (isMatrixSection(node)) {
      target = await figma.getNodeByIdAsync(node.getPluginData(KEY_MATRIX_FOR));
    } else if (isMatrixSection(node.parent)) {
      target = await figma.getNodeByIdAsync(node.getPluginData(KEY_COPY_OF));
    }
    if (isScreen(target) && !target.removed) out.set(target.id, target);
  }
  return [...out.values()];
}

function createLabel(preset: Preset): TextNode {
  const meta = `${PLATFORM_LABEL[preset.platform]} · ${preset.scheme}${preset.draft ? ' · draft colors' : ''}`;
  const text = figma.createText();
  text.fontName = { family: 'Inter', style: 'Semi Bold' };
  text.characters = `${preset.name}\n${meta}`;
  text.fontSize = 24;
  const start = preset.name.length + 1;
  const end = text.characters.length;
  text.setRangeFontName(start, end, { family: 'Inter', style: 'Regular' });
  text.setRangeFontSize(start, end, 16);
  text.setRangeFills(start, end, [{ type: 'SOLID', color: hexToRgb('#8e8e93') }]);
  text.name = preset.name;
  text.locked = true;
  return text;
}

export async function buildMatrix(
  source: Screen,
  collection: VariableCollection,
  presets: readonly Preset[],
): Promise<SectionNode> {
  const modeMap = readModeMap(collection);
  const usable = presets.filter((p) => modeMap[p.id]);
  if (usable.length === 0) throw new UserError('None of the chosen themes are in the Telegram Theme collection.');

  await Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
  ]);

  const page = figma.currentPage;
  const old = page.children.find(
    (n): n is SectionNode => isMatrixSection(n) && n.getPluginData(KEY_MATRIX_FOR) === source.id,
  );

  const layout = layoutMatrix(usable.length, { width: source.width, height: source.height });
  const section = figma.createSection();
  section.name = `TG Theme Preview — ${source.name}`;
  section.setPluginData(KEY_MATRIX_FOR, source.id);
  if (old) {
    section.x = old.x;
    section.y = old.y;
    old.remove();
  } else {
    const [[, , x], [, , y]] = source.absoluteTransform;
    section.x = x;
    section.y = y + source.height + GAP_BELOW_SOURCE;
  }
  section.resizeWithoutConstraints(layout.width, layout.height);

  for (const [i, preset] of usable.entries()) {
    const cell = layout.cells[i];
    const label = createLabel(preset);
    section.appendChild(label);
    label.x = cell.label.x;
    label.y = cell.label.y;

    // Cloning a component would create a second main component — use an instance instead.
    const copy = source.type === 'COMPONENT' ? source.createInstance() : source.clone();
    section.appendChild(copy);
    copy.x = cell.screen.x;
    copy.y = cell.screen.y;
    copy.name = `${source.name} — ${preset.name}`;
    copy.setExplicitVariableModeForCollection(collection, modeMap[preset.id]);
    copy.setPluginData(KEY_PRESET, preset.id);
    copy.setPluginData(KEY_COPY_OF, source.id);
    await switchPlatform(copy, preset.platform);
  }
  return section;
}
