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

/**
 * Guide only, drawn like the official docs illustration: outlined boxes for the safe area (pink)
 * and the content safe area (green) with a tag centered at the top, where no system controls sit.
 * Areas outside the safe area get a faint tint. No fills inside, so translucent controls stay readable.
 */
function buildSafeArea(c: ComponentNode, ctx: BuildContext, platform: Platform) {
  const spec = FULLSCREEN[platform]!;
  const PINK = '#e5487b';
  const GREEN = '#28b446';
  c.layoutMode = 'NONE';
  c.resize(spec.width, spec.screenHeight);
  c.fills = [];
  c.clipsContent = false;
  c.description =
    'Guide for fullscreen layouts: --tg-safe-area-inset-* (pink) and --tg-content-safe-area-inset-* (green). Not for export.';

  const bottom = spec.screenHeight - spec.safeBottom;
  const zones: {
    name: string;
    y: number;
    h: number;
    color: string;
    tag?: string;
    outline: boolean;
    vertical: ConstraintType;
  }[] = [
    { name: 'System top', y: 0, h: spec.safeTop, color: PINK, outline: false, vertical: 'MIN' },
    { name: 'System bottom', y: bottom, h: spec.safeBottom, color: PINK, outline: false, vertical: 'MAX' },
    {
      name: 'Safe area',
      y: spec.safeTop,
      h: bottom - spec.safeTop,
      color: PINK,
      tag: `safe-area · ${spec.safeTop} / ${spec.safeBottom}`,
      outline: true,
      vertical: 'STRETCH',
    },
    {
      name: 'Content safe area',
      y: spec.safeTop + spec.controlsRow,
      h: bottom - spec.safeTop - spec.controlsRow,
      color: GREEN,
      tag: `content-safe-area · ${spec.controlsRow}`,
      outline: true,
      vertical: 'STRETCH',
    },
  ];
  const keep = new Set(zones.map((z) => z.name));
  for (const child of [...c.children]) if (!keep.has(child.name)) child.remove();

  for (const z of zones) {
    const zone = ensureChild(c, z.name, 'FRAME', () => figma.createFrame());
    zone.layoutMode = 'NONE';
    zone.resize(spec.width, z.h);
    zone.x = 0;
    zone.y = z.y;
    zone.clipsContent = false;
    zone.fills = z.outline ? [] : [rawPaint(z.color, 0.08)];
    zone.strokes = z.outline ? [rawPaint(z.color)] : [];
    zone.strokeWeight = 1;
    zone.strokeAlign = 'INSIDE';
    zone.constraints = { horizontal: 'STRETCH', vertical: z.vertical };
    for (const child of [...zone.children]) if (child.name !== 'Tag') child.remove();
    if (!z.tag) {
      zone.findChild((n) => n.name === 'Tag')?.remove();
      continue;
    }
    // Tag: colored chip with white text, centered between the floating controls.
    const tag = ensureChild(zone, 'Tag', 'FRAME', () => figma.createFrame());
    tag.layoutMode = 'HORIZONTAL';
    tag.primaryAxisSizingMode = 'AUTO';
    tag.counterAxisSizingMode = 'AUTO';
    tag.paddingLeft = tag.paddingRight = 5;
    tag.paddingTop = tag.paddingBottom = 2;
    tag.cornerRadius = 2;
    tag.fills = [rawPaint(z.color)];
    const t = ensureChild(tag, 'Label', 'TEXT', () => figma.createText());
    t.fontName = ctx.fonts[platform].semibold;
    t.characters = z.tag;
    t.fontSize = 10;
    t.fills = [rawPaint('#ffffff')];
    tag.x = Math.round((spec.width - tag.width) / 2);
    // Pink tag sits in the controls row (like the docs); green just below it.
    tag.y = Math.round(z.name === 'Safe area' ? (spec.controlsRow - tag.height) / 2 : 8);
    tag.constraints = { horizontal: 'CENTER', vertical: 'MIN' };
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

