// B1: "TG Header" component set — windowed-mode header.
import { PLATFORM_LABEL } from '../../components/bottom-bar';
import {
  CUSTOM_HEADER,
  HEADER,
  HEADER_COLOR_PARAM,
  HEADER_COLORS,
  HEADER_LEFT,
  HEADER_STATES,
  LEFT_TEXT,
  PRESSED_OPACITY,
  type HeaderColor,
  type HeaderLeft,
  type HeaderState,
} from '../../components/header';
import { KIT_PLATFORMS, type Platform } from '../../core';
import { DEVICE } from '../../components/device';
import {
  boundPaint,
  ensureBooleanProperty,
  ensureChild,
  ensureIcon,
  ensureSet,
  ensureTextProperty,
  rawPaint,
  removeChild,
  removeProperty,
  type BuildContext,
  type SetReport,
} from './kit';

export const TAG_HEADER = 'header';

/** Empty space for the system status bar (safeAreaInset.top); nothing is drawn in it. */
const INSET = 'Status bar inset';

const NOTE =
  'iOS and Android from the Telegram client sources. "Default" = no setHeaderColor; Custom = setHeaderColor(#hex), override the fill.';

interface Paints {
  bg: SolidPaint;
  title: SolidPaint;
  subtitle: SolidPaint;
  buttons: SolidPaint;
}

function paints(ctx: BuildContext, platform: Platform, color: HeaderColor): Paints {
  const spec = HEADER[platform];
  const param = color === 'Default' ? spec.defaultBg : HEADER_COLOR_PARAM[color];
  const fg = spec.fg;
  if (param) {
    return {
      bg: boundPaint(ctx, param),
      title: boundPaint(ctx, fg.title),
      subtitle: boundPaint(ctx, fg.subtitle),
      buttons: boundPaint(ctx, fg.buttons),
    };
  }
  const c = CUSTOM_HEADER[color as 'Custom dark' | 'Custom light'];
  return {
    bg: rawPaint(c.bg),
    title: rawPaint(c.fg),
    subtitle: rawPaint(c.fg, c.subtitleOpacity),
    buttons: rawPaint(c.fg),
  };
}

function slot(c: FrameNode, name: string, spec: (typeof HEADER)[Platform], align: 'MIN' | 'MAX'): FrameNode {
  const f = ensureChild(c, name, 'FRAME', () => figma.createFrame());
  f.fills = [];
  f.layoutMode = 'HORIZONTAL';
  f.counterAxisAlignItems = 'CENTER';
  f.primaryAxisAlignItems = align;
  f.itemSpacing = 2;
  // resize() switches auto-layout sizing to FIXED, so it goes before the sizing modes.
  if (spec.sideWidth) f.resize(spec.sideWidth, f.height);
  f.primaryAxisSizingMode = spec.sideWidth ? 'FIXED' : 'AUTO';
  f.counterAxisSizingMode = 'AUTO';
  return f;
}

function buildHeader(
  c: ComponentNode,
  ctx: BuildContext,
  platform: Platform,
  left: HeaderLeft,
  color: HeaderColor,
  state: HeaderState,
) {
  const spec = HEADER[platform];
  const fonts = ctx.fonts[platform];
  const p = paints(ctx, platform, color);

  // Component: empty system inset (status bar area, drawn by the OS) above the header row.
  c.layoutMode = 'VERTICAL';
  c.resize(spec.width, c.height);
  c.primaryAxisSizingMode = 'AUTO';
  c.counterAxisSizingMode = 'FIXED';
  c.paddingLeft = c.paddingRight = c.paddingTop = c.paddingBottom = 0;
  c.itemSpacing = 0;
  c.fills = [];
  c.description = NOTE;
  for (const child of [...c.children]) if (child.name !== INSET && child.name !== 'Bar') child.remove();

  const top = DEVICE[platform].safeTop;
  let status: FrameNode | null = null;
  if (top) {
    status = ensureChild(c, INSET, 'FRAME', () => figma.createFrame());
    for (const child of [...status.children]) child.remove();
    status.resize(spec.width, top);
    status.fills = [];
    status.layoutSizingHorizontal = 'FILL';
    status.layoutSizingVertical = 'FIXED';
  } else removeChild(c, INSET);

  const bar = ensureChild(c, 'Bar', 'FRAME', () => figma.createFrame());
  bar.layoutMode = 'HORIZONTAL';
  bar.counterAxisAlignItems = 'CENTER';
  bar.resize(spec.width, spec.height);
  bar.primaryAxisSizingMode = 'FIXED';
  bar.counterAxisSizingMode = 'FIXED';
  bar.layoutSizingHorizontal = 'FILL';
  bar.paddingLeft = bar.paddingRight = spec.paddingX;
  bar.itemSpacing = spec.gap;
  bar.fills = [p.bg];
  if (status) c.insertChild(0, status);
  c.insertChild(status ? 1 : 0, bar);

  // Left: iOS text button, others icon button.
  const l = slot(bar, 'Left', spec, 'MIN');
  l.opacity = state === 'Left pressed' ? PRESSED_OPACITY : 1;
  if (spec.leftStyle === 'text') {
    if (left === 'Back') ensureIcon(l, 'Chevron', 'chevron-left', spec.leftTextSize + 3, p.buttons);
    else removeChild(l, 'Chevron');
    const t = ensureChild(l, 'Label', 'TEXT', () => figma.createText());
    t.fontName = fonts.regular;
    t.characters = LEFT_TEXT[left];
    t.fontSize = spec.leftTextSize;
    t.fills = [p.buttons];
    const chevron = l.findChild((n) => n.name === 'Chevron');
    if (chevron) l.insertChild(0, chevron);
    removeChild(l, 'Icon');
  } else {
    ensureIcon(l, 'Icon', left === 'Back' ? 'arrow-left' : 'close', spec.iconSize, p.buttons);
    removeChild(l, 'Label');
    removeChild(l, 'Chevron');
  }

  // Title + subtitle.
  const title = ensureChild(bar, 'Title', 'FRAME', () => figma.createFrame());
  title.fills = [];
  title.layoutMode = 'VERTICAL';
  title.counterAxisAlignItems = spec.titleAlign === 'CENTER' ? 'CENTER' : 'MIN';
  title.primaryAxisAlignItems = 'CENTER';
  title.itemSpacing = 0;
  title.primaryAxisSizingMode = 'AUTO';
  title.layoutSizingHorizontal = 'FILL';
  for (const [name, size, font, paint, fallback] of [
    ['Title', spec.titleSize, fonts.semibold, p.title, 'Mini App'],
    ['Subtitle', spec.subtitleSize, fonts.regular, p.subtitle, 'bot'],
  ] as const) {
    const t = ensureChild(title, name, 'TEXT', () => figma.createText());
    t.fontName = font;
    if (!t.characters) t.characters = fallback;
    t.fontSize = size;
    t.fills = [paint];
    t.textAlignHorizontal = spec.titleAlign;
    t.layoutSizingHorizontal = 'FILL';
    t.textAutoResize = 'HEIGHT';
    t.textTruncation = 'ENDING';
    t.maxLines = 1;
  }

  // Right: menu.
  const r = slot(bar, 'Right', spec, 'MAX');
  r.opacity = state === 'Menu pressed' ? PRESSED_OPACITY : 1;
  ensureIcon(r, 'Menu', spec.menuIcon, spec.iconSize, p.buttons);

  // Keep slot order Left, Title, Right.
  bar.insertChild(0, l);
  bar.insertChild(1, title);
  bar.insertChild(2, r);
}

export async function buildHeaderComponents(page: PageNode, ctx: BuildContext): Promise<SetReport> {
  const variants = KIT_PLATFORMS.flatMap((platform) =>
    HEADER_LEFT.flatMap((left) =>
      HEADER_COLORS.flatMap((color) =>
        HEADER_STATES.map((state) => ({
          props: { Platform: PLATFORM_LABEL[platform], Left: left, Color: color, State: state },
          build: (c: ComponentNode) => buildHeader(c, ctx, platform, left, color, state),
        })),
      ),
    ),
  );
  const { set, report } = await ensureSet(
    page,
    TAG_HEADER,
    'TG Header',
    variants,
    HEADER_COLORS.length * HEADER_STATES.length,
  );
  set.description = NOTE;

  const titleKey = ensureTextProperty(set, 'Title', 'Mini App');
  const subtitleKey = ensureTextProperty(set, 'Subtitle', 'bot');
  const showKey = ensureBooleanProperty(set, 'Show subtitle', true);
  removeProperty(set, 'Status bar');
  const statusKey = ensureBooleanProperty(set, INSET, true);
  for (const c of set.children as ComponentNode[]) {
    const status = c.findChild((n) => n.name === INSET);
    if (status) status.componentPropertyReferences = { visible: statusKey };
    const bar = c.findChild((n) => n.name === 'Bar') as FrameNode | null;
    const block = bar?.findChild((n) => n.name === 'Title') as FrameNode | null;
    const t = block?.findChild((n) => n.name === 'Title') as TextNode | null;
    const s = block?.findChild((n) => n.name === 'Subtitle') as TextNode | null;
    if (t) t.componentPropertyReferences = { characters: titleKey };
    if (s) s.componentPropertyReferences = { characters: subtitleKey, visible: showKey };
  }
  return report;
}

