// B2: "TG Fullscreen" — screen-sized overlay with the floating system controls and an optional
// safe area guide (boolean property "Safe area guide", off by default).
import { PLATFORM_LABEL } from '../../components/bottom-bar';
import {
  FULLSCREEN,
  FULLSCREEN_LABEL,
  FULLSCREEN_LEFT,
  FULLSCREEN_PLATFORMS,
  FULLSCREEN_PRESSED_OPACITY,
  FULLSCREEN_STATES,
  FULLSCREEN_STATUS,
  PILL_COLORS,
  type FullscreenLeft,
  type FullscreenStatus,
  type FullscreenSpec,
  type FullscreenState,
  type PillSpec,
} from '../../components/fullscreen';
import type { Platform } from '../../core';
import {
  ensureBooleanProperty,
  ensureChild,
  ensureIcon,
  ensureSet,
  findSet,
  rawPaint,
  removeProperty,
  type BuildContext,
  type SetReport,
} from './kit';

export const TAG_FULLSCREEN = 'fullscreen-controls';
/** Separate guide set from earlier versions; the guide now lives inside TG Fullscreen. */
const TAG_SAFE_AREA_OLD = 'safe-area';

const NOTE =
  'iOS from Telegram-iOS FullscreenControlsComponent; Android is DRAFT. "Status bar": Light by default, ' +
  'Dark when the app sets a light header color. Sizes: src/components/fullscreen.ts.';

function pill(parent: FrameNode, name: string, spec: PillSpec, status: FullscreenStatus, pressed: boolean): FrameNode {
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
  const colors = PILL_COLORS[status];
  f.fills = [rawPaint(colors.bg, colors.bgAlpha)];
  f.effects = [{ type: 'BACKGROUND_BLUR', blurType: 'NORMAL', radius: 20, visible: true }];
  f.opacity = pressed ? FULLSCREEN_PRESSED_OPACITY : 1;
  return f;
}

function buildControls(
  c: ComponentNode,
  ctx: BuildContext,
  platform: Platform,
  left: FullscreenLeft,
  status: FullscreenStatus,
  state: FullscreenState,
) {
  const spec = FULLSCREEN[platform]!;
  const fg = rawPaint(PILL_COLORS[status].fg);

  const row = ensureChild(c, 'Controls', 'FRAME', () => figma.createFrame());
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisAlignItems = 'SPACE_BETWEEN';
  row.counterAxisAlignItems = 'MIN';
  row.resize(spec.width, spec.controlsRow);
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'FIXED';
  row.paddingLeft = row.paddingRight = spec.sideInset;
  row.paddingTop = 0;
  row.fills = [];
  row.clipsContent = false;
  row.x = 0;
  row.y = spec.safeTop;
  row.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };

  const l = pill(row, 'Left', spec.left, status, state === 'Left pressed');
  ensureIcon(l, 'Icon', left === 'Back' ? 'chevron-left' : 'close', spec.left.iconSize, fg, {
    inset: left === 'Back' ? 0.1 : 0.04,
    weight: spec.left.iconWeight,
  });
  const label = ensureChild(l, 'Label', 'TEXT', () => figma.createText());
  label.fontName = ctx.fonts[platform].rounded;
  label.characters = FULLSCREEN_LABEL[left];
  label.fontSize = spec.left.fontSize;
  label.fills = [fg];
  l.insertChild(0, l.findChild((n) => n.name === 'Icon')!);

  const r = pill(row, 'Right', spec.right, status, state === 'Right pressed');
  ensureIcon(r, 'Collapse', 'chevron-down', spec.right.chevronSize, fg, { inset: 0.02, weight: spec.left.iconWeight });
  ensureIcon(r, 'Menu', 'dots-h', spec.right.dotsSize, fg, { inset: 0 });
  r.insertChild(0, r.findChild((n) => n.name === 'Collapse')!);

  row.insertChild(0, l);
  row.insertChild(1, r);
}

/**
 * Drawn like the official docs illustration: outlined boxes for the safe area (pink) and the
 * content safe area (green), a short tag centered between the controls, faint tint outside.
 */
function buildGuide(c: ComponentNode, ctx: BuildContext, platform: Platform, spec: FullscreenSpec): FrameNode {
  const PINK = '#e5487b';
  const GREEN = '#28b446';
  const guide = ensureChild(c, 'Safe area guide', 'FRAME', () => figma.createFrame());
  guide.layoutMode = 'NONE';
  guide.resize(spec.width, spec.screenHeight);
  guide.x = guide.y = 0;
  guide.fills = [];
  guide.clipsContent = false;
  guide.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };

  const bottom = spec.screenHeight - spec.safeBottom;
  const zones: { name: string; y: number; h: number; color: string; tag?: string; vertical: ConstraintType }[] = [
    { name: 'System top', y: 0, h: spec.safeTop, color: PINK, vertical: 'MIN' },
    { name: 'System bottom', y: bottom, h: spec.safeBottom, color: PINK, vertical: 'MAX' },
    {
      name: 'Safe area',
      y: spec.safeTop,
      h: bottom - spec.safeTop,
      color: PINK,
      tag: `safe-area · ${spec.safeTop} / ${spec.safeBottom}`,
      vertical: 'STRETCH',
    },
    {
      name: 'Content safe area',
      y: spec.safeTop + spec.controlsRow,
      h: bottom - spec.safeTop - spec.controlsRow,
      color: GREEN,
      tag: `content-safe-area · ${spec.controlsRow}`,
      vertical: 'STRETCH',
    },
  ];
  const keep = new Set(zones.map((z) => z.name));
  for (const child of [...guide.children]) if (!keep.has(child.name)) child.remove();

  for (const z of zones) {
    const zone = ensureChild(guide, z.name, 'FRAME', () => figma.createFrame());
    zone.layoutMode = 'NONE';
    zone.resize(spec.width, z.h);
    zone.x = 0;
    zone.y = z.y;
    zone.clipsContent = false;
    zone.fills = z.tag ? [] : [rawPaint(z.color, 0.08)];
    zone.strokes = z.tag ? [rawPaint(z.color)] : [];
    zone.strokeWeight = 1;
    zone.strokeAlign = 'INSIDE';
    zone.constraints = { horizontal: 'STRETCH', vertical: z.vertical };
    if (!z.tag) continue;
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
    // Pink tag sits in the controls band (like the docs); green one just below it.
    tag.y = Math.round(z.name === 'Safe area' ? (spec.controlsRow - tag.height) / 2 : 8);
    tag.constraints = { horizontal: 'CENTER', vertical: 'MIN' };
  }
  return guide;
}

function buildFullscreen(
  c: ComponentNode,
  ctx: BuildContext,
  platform: Platform,
  left: FullscreenLeft,
  status: FullscreenStatus,
  state: FullscreenState,
) {
  const spec = FULLSCREEN[platform]!;
  c.layoutMode = 'NONE';
  c.resize(spec.width, spec.screenHeight);
  c.fills = [];
  c.clipsContent = false;
  c.description = NOTE;
  c.findChild((n) => n.name === 'Status bar')?.remove();
  const guide = buildGuide(c, ctx, platform, spec);
  buildControls(c, ctx, platform, left, status, state);
  c.insertChild(0, guide); // guide under the controls
}

export async function buildFullscreenComponents(page: PageNode, ctx: BuildContext): Promise<SetReport> {
  const variants = FULLSCREEN_PLATFORMS.flatMap((platform) =>
    FULLSCREEN_LEFT.flatMap((left) =>
      FULLSCREEN_STATUS.flatMap((status) =>
        FULLSCREEN_STATES.map((state) => ({
          props: { Platform: PLATFORM_LABEL[platform], Left: left, 'Status bar': status, State: state },
          build: (c: ComponentNode) => buildFullscreen(c, ctx, platform, left, status, state),
        })),
      ),
    ),
  );
  const { set, report } = await ensureSet(
    page,
    TAG_FULLSCREEN,
    'TG Fullscreen',
    variants,
    FULLSCREEN_STATUS.length * FULLSCREEN_STATES.length,
  );
  set.description = NOTE;
  removeProperty(set, 'App name');
  const guideKey = ensureBooleanProperty(set, 'Safe area guide', false);
  removeProperty(set, 'Status bar');
  for (const c of set.children as ComponentNode[]) {
    const guide = c.findChild((n) => n.name === 'Safe area guide');
    if (guide) guide.componentPropertyReferences = { visible: guideKey };
  }

  findSet(page, TAG_SAFE_AREA_OLD)?.remove();
  return report;
}
