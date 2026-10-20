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
import { DEVICE } from '../../components/device';
import { PLATFORMS, type Platform } from '../../core';
import {
  boundPaint,
  ensureChild,
  ensureSet,
  ensureTextProperty,
  KEY_IGNORE,
  overlay,
  rawPaint,
  removeChild,
  variantName,
  type BuildContext,
  type SetReport,
} from './kit';

export const TAG_BUTTON = 'bottom-button';
export const TAG_BAR = 'bottom-bar';

const DRAFT_NOTE =
  'iOS measured from the official Telegram docs illustration; Android/Desktop are DRAFT. Sizes: src/components/bottom-bar.ts.';

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
  c.opacity = state === 'Inactive' ? 0.5 : 1;
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

  if (state === 'Pressed') {
    // Tint with the button's own text color: lightens or darkens depending on the theme.
    // Both clients tint with the button's text color at 15% (Android ripple, iOS highlight).
    const tint = ensureChild(c, 'Pressed', 'RECTANGLE', () => figma.createRectangle());
    overlay(tint, c);
    tint.fills = [boundPaint(ctx, colors.fg, 0.15)];
  } else removeChild(c, 'Pressed');

  if (state === 'Shine') {
    const shine = ensureChild(c, 'Shine', 'RECTANGLE', () => figma.createRectangle());
    overlay(shine, c);
    const white = (a: number): RGBA => ({ r: 1, g: 1, b: 1, a });
    shine.fills = [
      {
        type: 'GRADIENT_LINEAR',
        // Diagonal band across the middle of the button.
        gradientTransform: [
          [0.8, 0.6, -0.2],
          [-0.6, 0.8, 0.4],
        ],
        gradientStops: [
          { position: 0.35, color: white(0) },
          { position: 0.5, color: white(0.35) },
          { position: 0.65, color: white(0) },
        ],
      },
    ];
    // Decorative, not a theme color: keep it out of the unbound-color audit.
    shine.setPluginData(KEY_IGNORE, 'self');
  } else removeChild(c, 'Shine');
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
  if (spec.topSeparator) {
    c.strokes = [
      spec.topSeparator === 'theme' ? boundPaint(ctx, 'section_separator_color') : rawPaint('#000000', 0.1),
    ];
    c.strokeAlign = 'INSIDE';
    c.strokeTopWeight = spec.topSeparator === 'theme' ? 0.5 : 1;
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

  // System inset below the buttons. On Android it is the navigation bar, which Telegram paints
  // with the bottom bar color (setBottomBarColor docs), so it lives inside this component.
  const handle = DEVICE[platform].handle;
  if (spec.safeAreaBottom && handle) {
    const area = ensureChild(c, 'Home Indicator', 'FRAME', () => figma.createFrame());
    area.fills = [];
    area.layoutMode = 'HORIZONTAL';
    area.primaryAxisAlignItems = 'CENTER';
    area.counterAxisAlignItems = 'MAX';
    area.paddingBottom = handle.bottomOffset;
    area.resize(spec.width, spec.safeAreaBottom);
    area.layoutSizingHorizontal = 'FILL';
    area.layoutSizingVertical = 'FIXED';
    const pill = ensureChild(area, 'Indicator', 'RECTANGLE', () => figma.createRectangle());
    pill.resize(handle.width, handle.height);
    pill.cornerRadius = handle.height / 2;
    pill.fills = [boundPaint(ctx, 'text_color')];
  } else removeChild(c, 'Home Indicator');
}

export async function buildBottomComponents(page: PageNode, ctx: BuildContext): Promise<SetReport> {
  const buttonVariants = BUTTON_TYPES.flatMap((type) =>
    PLATFORMS.flatMap((platform) =>
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

  const barVariants = PLATFORMS.flatMap((platform) =>
    BAR_LAYOUTS.map((layout) => ({
      props: { Platform: PLATFORM_LABEL[platform], Layout: layout },
      build: (c: ComponentNode) => buildBar(c, ctx, platform, layout, buttons, labelKey),
    })),
  );
  const { set: bar, report: r2 } = await ensureSet(page, TAG_BAR, 'TG Bottom Bar', barVariants, BAR_LAYOUTS.length);
  bar.description = DRAFT_NOTE;

  return { created: r1.created + r2.created, updated: r1.updated + r2.updated };
}
