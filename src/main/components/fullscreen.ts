// B2: "TG Fullscreen Controls" (floating system pills) and "TG Safe Area" guide.
import { PLATFORM_LABEL } from '../../components/bottom-bar';
import {
  FULLSCREEN,
  FULLSCREEN_LEFT,
  FULLSCREEN_PLATFORMS,
  FULLSCREEN_STATES,
  FULLSCREEN_TONES,
  TONE_COLORS,
  type FullscreenLeft,
  type FullscreenState,
  type FullscreenTone,
} from '../../components/fullscreen';
import { PRESSED_OPACITY } from '../../components/header';
import type { Platform } from '../../core';
import {
  ensureChild,
  ensureIcon,
  ensureSet,
  ensureTextProperty,
  rawPaint,
  type BuildContext,
  type SetReport,
} from './kit';

export const TAG_FULLSCREEN = 'fullscreen-controls';
export const TAG_SAFE_AREA = 'safe-area';

const NOTE =
  'iOS measured from the official Telegram docs illustrations; Android is DRAFT. Sizes: src/components/fullscreen.ts.';

function pill(parent: ComponentNode, name: string, platform: Platform, tone: FullscreenTone, pressed: boolean): FrameNode {
  const spec = FULLSCREEN[platform]!.pill;
  const colors = TONE_COLORS[tone];
  const f = ensureChild(parent, name, 'FRAME', () => figma.createFrame());
  f.layoutMode = 'HORIZONTAL';
  f.counterAxisAlignItems = 'CENTER';
  // resize() switches auto-layout sizing to FIXED, so it goes before the sizing modes.
  f.resize(f.width, spec.height);
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'FIXED';
  f.paddingLeft = spec.paddingLeft;
  f.paddingRight = spec.paddingRight;
  f.itemSpacing = spec.gap;
  f.cornerRadius = spec.height / 2;
  f.fills = [rawPaint(colors.pill, colors.pillOpacity)];
  f.effects = [{ type: 'BACKGROUND_BLUR', blurType: 'NORMAL', radius: 20, visible: true }];
  f.opacity = pressed ? PRESSED_OPACITY + 0.2 : 1;
  return f;
}

function buildControls(
  c: ComponentNode,
  ctx: BuildContext,
  platform: Platform,
  left: FullscreenLeft,
  tone: FullscreenTone,
  state: FullscreenState,
) {
  const spec = FULLSCREEN[platform]!;
  const fg = rawPaint(TONE_COLORS[tone].fg);

  c.layoutMode = 'HORIZONTAL';
  c.primaryAxisAlignItems = 'SPACE_BETWEEN';
  c.counterAxisAlignItems = 'CENTER';
  c.primaryAxisSizingMode = 'FIXED';
  c.counterAxisSizingMode = 'FIXED';
  c.resize(spec.width, spec.controlsRow);
  c.paddingLeft = c.paddingRight = spec.sideInset;
  c.fills = [];
  c.description = NOTE;

  const l = pill(c, 'Left', platform, tone, state === 'Left pressed');
  ensureIcon(l, 'Icon', left === 'Back' ? 'chevron-left' : 'close', spec.pill.iconSize, fg);
  const label = ensureChild(l, 'Label', 'TEXT', () => figma.createText());
  label.fontName = ctx.fonts[platform].semibold;
  if (!label.characters) label.characters = left === 'Back' ? 'Back' : 'Mini App';
  label.fontSize = spec.pill.fontSize;
  label.fills = [fg];

  const r = pill(c, 'Right', platform, tone, state === 'Right pressed');
  r.itemSpacing = spec.rightGap;
  r.paddingRight = spec.pill.paddingLeft;
  ensureIcon(r, 'Collapse', 'chevron-down', spec.pill.iconSize + 2, fg);
  ensureIcon(r, 'Menu', 'dots-h', spec.pill.iconSize + 2, fg);

  c.insertChild(0, l);
  c.insertChild(1, r);
}

/** Guide only: tinted system safe area (red) and content safe area (green). */
function buildSafeArea(c: ComponentNode, ctx: BuildContext, platform: Platform) {
  const spec = FULLSCREEN[platform]!;
  c.layoutMode = 'NONE';
  c.resize(spec.width, spec.screenHeight);
  c.fills = [];
  c.clipsContent = false;
  c.description = 'Guide for fullscreen layouts: --tg-safe-area-inset-* (red) and --tg-content-safe-area-inset-* (green). Not for export.';

  const zones: [string, number, number, string, ConstraintType][] = [
    [`safe-area-inset-top · ${spec.safeTop}`, 0, spec.safeTop, '#ff3b30', 'MIN'],
    [`content-safe-area-inset-top · ${spec.controlsRow}`, spec.safeTop, spec.controlsRow, '#34c759', 'MIN'],
    [`safe-area-inset-bottom · ${spec.safeBottom}`, spec.screenHeight - spec.safeBottom, spec.safeBottom, '#ff3b30', 'MAX'],
  ];
  const keep = new Set(zones.map((z) => z[0]));
  for (const child of [...c.children]) if (!keep.has(child.name)) child.remove();
  for (const [name, y, h, color, vertical] of zones) {
    const zone = ensureChild(c, name, 'FRAME', () => figma.createFrame());
    zone.layoutMode = 'NONE';
    zone.resize(spec.width, h);
    zone.x = 0;
    zone.y = y;
    zone.fills = [rawPaint(color, 0.14)];
    zone.constraints = { horizontal: 'STRETCH', vertical };
    const t = ensureChild(zone, 'Label', 'TEXT', () => figma.createText());
    t.fontName = ctx.fonts[platform].semibold;
    t.characters = name;
    t.fontSize = 10;
    t.fills = [rawPaint(color)];
    t.x = 6;
    t.y = Math.max(0, (h - t.height) / 2);
  }
}

export async function buildFullscreenComponents(page: PageNode, ctx: BuildContext): Promise<SetReport> {
  const controls = FULLSCREEN_PLATFORMS.flatMap((platform) =>
    FULLSCREEN_LEFT.flatMap((left) =>
      FULLSCREEN_TONES.flatMap((tone) =>
        FULLSCREEN_STATES.map((state) => ({
          props: { Platform: PLATFORM_LABEL[platform], Left: left, Tone: tone, State: state },
          build: (c: ComponentNode) => buildControls(c, ctx, platform, left, tone, state),
        })),
      ),
    ),
  );
  const { set, report: r1 } = await ensureSet(
    page,
    TAG_FULLSCREEN,
    'TG Fullscreen Controls',
    controls,
    FULLSCREEN_TONES.length * FULLSCREEN_STATES.length,
  );
  set.description = NOTE;
  const nameKey = ensureTextProperty(set, 'App name', 'Mini App');
  for (const c of set.children as ComponentNode[]) {
    if (!c.name.includes('Left=Close')) continue;
    const label = (c.findChild((n) => n.name === 'Left') as FrameNode | null)?.findChild((n) => n.name === 'Label');
    if (label) label.componentPropertyReferences = { characters: nameKey };
  }

  const { report: r2 } = await ensureSet(
    page,
    TAG_SAFE_AREA,
    'TG Safe Area',
    FULLSCREEN_PLATFORMS.map((platform) => ({
      props: { Platform: PLATFORM_LABEL[platform] },
      build: (c: ComponentNode) => buildSafeArea(c, ctx, platform),
    })),
    FULLSCREEN_PLATFORMS.length,
  );
  return { created: r1.created + r2.created, updated: r1.updated + r2.updated };
}

