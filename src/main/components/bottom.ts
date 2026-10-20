// B3: "TG Bottom Button" and "TG Bottom Bar" component sets.
import {
  BAR_LAYOUTS,
  barArrangement,
  BOTTOM_BAR,
  BUTTON_COLORS,
  BUTTON_STATES,
  BUTTON_TYPES,
  DEFAULT_LABEL,
  PLATFORM_LABEL,
  type ButtonState,
  type ButtonType,
} from '../../components/bottom-bar';
import { KIT_PLATFORMS, type Platform, type ThemeParamKey } from '../../core';
import {
  boundPaint,
  ensureChild,
  ensureSet,
  ensureTextProperty,
  KEY_IGNORE,
  overlay,
  rawPaint,
  removeChild,
  systemPaint,
  variantName,
  type BuildContext,
  type SetReport,
} from './kit';

export const TAG_BUTTON = 'bottom-button';
export const TAG_BAR = 'bottom-bar';

const DRAFT_NOTE =
  'iOS and Android from the Telegram client sources. Inactive looks like Default (only taps are ignored).';

function buildButton(c: ComponentNode, ctx: BuildContext, platform: Platform, type: ButtonType, state: ButtonState) {
  const spec = BOTTOM_BAR[platform];
  const colors = BUTTON_COLORS[type];

  c.layoutMode = 'HORIZONTAL';
  c.primaryAxisAlignItems = 'CENTER';
  c.counterAxisAlignItems = 'CENTER';
  c.primaryAxisSizingMode = 'FIXED';
  c.counterAxisSizingMode = 'FIXED';
  c.resize(spec.width - spec.padding.left - spec.padding.right, spec.buttonHeight);
  c.paddingLeft = c.paddingRight = 16;
  c.cornerRadius = spec.radius;
  c.clipsContent = true;
  c.fills = [boundPaint(ctx, colors.bg)];
  // Inactive looks the same as Default in both clients (only taps are ignored);
  // iOS dims the whole button while pressed.
  c.opacity = state === 'Pressed' && spec.pressed === 'opacity' ? 0.65 : 1;
  c.description = DRAFT_NOTE;

  const label = ensureChild(c, 'Label', 'TEXT', () => figma.createText());
  label.fontName = ctx.fonts[platform].semibold;
  if (!label.characters) label.characters = DEFAULT_LABEL.Main;
  label.fontSize = spec.fontSize;
  label.textCase = spec.textCase;
  label.textAutoResize = 'WIDTH_AND_HEIGHT';
  label.fills = [boundPaint(ctx, colors.fg)];
  // In Loading the spinner replaces the text; keep the node so the Label property still applies.
  label.visible = state !== 'Loading';

  if (state === 'Loading') {
    const spinner = ensureChild(c, 'Spinner', 'ELLIPSE', () => figma.createEllipse());
    spinner.resize(spec.spinnerSize, spec.spinnerSize);
    spinner.arcData = {
      startingAngle: 0,
      endingAngle: Math.PI * 1.5,
      innerRadius: 1 - (2 * spec.spinnerWeight) / spec.spinnerSize,
    };
    spinner.fills = [boundPaint(ctx, colors.fg)];
  } else removeChild(c, 'Spinner');

  if (state === 'Pressed' && spec.pressed === 'ripple') {
    // Android ripple: the button's text color at 15%.
    const tint = ensureChild(c, 'Pressed', 'RECTANGLE', () => figma.createRectangle());
    overlay(tint, c);
    tint.fills = [boundPaint(ctx, colors.fg, 0.15)];
  } else removeChild(c, 'Pressed');

  if (state === 'Shine') buildShine(c, ctx, spec, colors.fg);
  else removeChild(c, 'Shine');
}

/**
 * A horizontal band masked by a transparent→opaque→transparent gradient, with a matching border.
 * iOS: white band ~70pt at 50% in overlay mode, border at 75%.
 * Android: 160dp band in the text color at 25%, 2dp inner border at 80%.
 */
function buildShine(c: ComponentNode, ctx: BuildContext, spec: (typeof BOTTOM_BAR)[Platform], fg: ThemeParamKey) {
  const ios = spec.shine === 'ios';
  const w = c.width;
  const h = c.height;
  const shine = ensureChild(c, 'Shine', 'FRAME', () => figma.createFrame());
  shine.layoutPositioning = 'ABSOLUTE';
  shine.x = shine.y = 0;
  shine.resize(w, h);
  shine.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  shine.fills = [];
  shine.clipsContent = true;
  shine.cornerRadius = spec.radius;
  for (const child of [...shine.children]) child.remove();

  const half = Math.min(0.5, (ios ? 70 : 160) / 2 / w);
  const mask = figma.createRectangle();
  mask.name = 'Band mask';
  mask.resize(w, h);
  mask.fills = [
    {
      type: 'GRADIENT_LINEAR',
      gradientTransform: [
        [1, 0, 0],
        [0, 1, 0],
      ],
      gradientStops: [
        { position: 0.5 - half, color: { r: 0, g: 0, b: 0, a: 0 } },
        { position: 0.5, color: { r: 0, g: 0, b: 0, a: 1 } },
        { position: 0.5 + half, color: { r: 0, g: 0, b: 0, a: 0 } },
      ],
    },
  ];
  mask.isMask = true;

  const band = figma.createRectangle();
  band.name = 'Band';
  band.resize(w, h);
  band.fills = [ios ? rawPaint('#ffffff', 0.5) : boundPaint(ctx, fg, 0.25)];
  if (ios) band.blendMode = 'OVERLAY';

  const border = figma.createRectangle();
  border.name = 'Border';
  border.resize(w, h);
  border.cornerRadius = spec.radius;
  border.fills = [];
  border.strokes = [ios ? rawPaint('#ffffff', 0.75) : boundPaint(ctx, fg, 0.8)];
  border.strokeWeight = ios ? 1 : 2;
  border.strokeAlign = 'INSIDE';

  for (const n of [mask, band, border]) {
    shine.appendChild(n);
    n.x = n.y = 0;
    n.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  }
  shine.setPluginData(KEY_IGNORE, 'tree');
}

async function buildBar(
  c: ComponentNode,
  ctx: BuildContext,
  platform: Platform,
  layout: (typeof BAR_LAYOUTS)[number],
  buttons: ComponentSetNode,
  labelKey: string,
) {
  const spec = BOTTOM_BAR[platform];
  const { direction, order } = barArrangement(layout);

  c.layoutMode = 'VERTICAL';
  c.primaryAxisSizingMode = 'AUTO';
  c.counterAxisSizingMode = 'FIXED';
  c.resize(spec.width, c.height || 100);
  c.primaryAxisSizingMode = 'AUTO';
  c.paddingTop = spec.padding.top;
  c.paddingLeft = spec.padding.left;
  c.paddingRight = spec.padding.right;
  c.paddingBottom = spec.safeAreaBottom ? 0 : spec.padding.bottom;
  c.itemSpacing = spec.padding.bottom;
  c.fills = [boundPaint(ctx, 'bottom_bar_bg_color')];
  if (spec.separatorWeight) {
    c.strokes = [systemPaint(ctx, 'bottom_bar_separator')];
    c.strokeAlign = 'INSIDE';
    c.strokeTopWeight = spec.separatorWeight;
    c.strokeRightWeight = c.strokeBottomWeight = c.strokeLeftWeight = 0;
  } else c.strokes = [];
  c.description = DRAFT_NOTE;

  const row = ensureChild(c, 'Buttons', 'FRAME', () => figma.createFrame());
  row.fills = [];
  row.layoutMode = direction;
  row.itemSpacing = direction === 'VERTICAL' ? spec.gapVertical : spec.gap;
  row.primaryAxisSizingMode = direction === 'VERTICAL' ? 'AUTO' : 'FIXED';
  row.counterAxisSizingMode = direction === 'VERTICAL' ? 'FIXED' : 'AUTO';
  row.layoutSizingHorizontal = 'FILL';

  for (const type of ['Main', 'Secondary'] as ButtonType[]) {
    const name = `${type} Button`;
    if (!order.includes(type)) {
      removeChild(row, name);
      continue;
    }
    const target = buttons.children.find(
      (n) => n.name === variantName({ Type: type, Platform: PLATFORM_LABEL[platform], State: 'Default' }),
    ) as ComponentNode;
    const inst = ensureChild(row, name, 'INSTANCE', () => target.createInstance());
    if ((await inst.getMainComponentAsync())?.id !== target.id) inst.swapComponent(target);
    inst.layoutSizingHorizontal = 'FILL';
    inst.isExposedInstance = true;
    if (type === 'Secondary') inst.setProperties({ [labelKey]: DEFAULT_LABEL.Secondary });
  }
  order.forEach((type, i) => {
    const node = row.children.find((n) => n.name === `${type} Button`);
    if (node) row.insertChild(i, node);
  });

  // Empty system inset below the buttons (home indicator / navigation bar, drawn by the OS).
  // Telegram paints it with the bottom bar color (on Android via setBottomBarColor), so it is part
  // of the bar.
  removeChild(c, 'Home Indicator');
  if (spec.safeAreaBottom) {
    const area = ensureChild(c, 'System inset', 'FRAME', () => figma.createFrame());
    for (const child of [...area.children]) child.remove();
    area.fills = [];
    area.resize(spec.width, spec.safeAreaBottom);
    area.layoutSizingHorizontal = 'FILL';
    area.layoutSizingVertical = 'FIXED';
  } else removeChild(c, 'System inset');
}

export async function buildBottomComponents(page: PageNode, ctx: BuildContext): Promise<SetReport> {
  const buttonVariants = BUTTON_TYPES.flatMap((type) =>
    KIT_PLATFORMS.flatMap((platform) =>
      BUTTON_STATES.map((state) => ({
        props: { Type: type, Platform: PLATFORM_LABEL[platform], State: state },
        build: (c: ComponentNode) => buildButton(c, ctx, platform, type, state),
      })),
    ),
  );
  const { set: buttons, report: r1 } = await ensureSet(
    page,
    TAG_BUTTON,
    'TG Bottom Button',
    buttonVariants,
    BUTTON_STATES.length,
  );
  buttons.description = DRAFT_NOTE;
  const labelKey = ensureTextProperty(buttons, 'Label', DEFAULT_LABEL.Main);
  for (const c of buttons.children as ComponentNode[]) {
    const label = c.findChild((n) => n.name === 'Label') as TextNode | null;
    if (label) label.componentPropertyReferences = { characters: labelKey };
  }

  const barVariants = KIT_PLATFORMS.flatMap((platform) =>
    BAR_LAYOUTS.map((layout) => ({
      props: { Platform: PLATFORM_LABEL[platform], Layout: layout },
      build: (c: ComponentNode) => buildBar(c, ctx, platform, layout, buttons, labelKey),
    })),
  );
  const { set: bar, report: r2 } = await ensureSet(page, TAG_BAR, 'TG Bottom Bar', barVariants, BAR_LAYOUTS.length);
  bar.description = DRAFT_NOTE;

  return { created: r1.created + r2.created, updated: r1.updated + r2.updated };
}
