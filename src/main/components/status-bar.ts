// Draws the system status bar (time, camera cutout, signal, Wi-Fi, battery) as vectors.
import { DEVICE } from '../../components/device';
import { STATUS_BAR, DEFAULT_TIME } from '../../components/status-bar';
import type { Platform } from '../../core';
import { ensureChild, rawPaint, type BuildContext } from './kit';

/** Signal: four bars, bottom-aligned. */
function signal(parent: FrameNode, paint: SolidPaint): FrameNode {
  const f = figma.createFrame();
  f.name = 'Signal';
  f.fills = [];
  f.resize(17, 11);
  [4, 6, 8.5, 11].forEach((h, i) => {
    const r = figma.createRectangle();
    r.resize(3, h);
    r.cornerRadius = 1;
    r.fills = [paint];
    f.appendChild(r);
    r.x = i * 4.6;
    r.y = 11 - h;
  });
  parent.appendChild(f);
  return f;
}

/** Wi-Fi: three arcs sharing a center at the bottom. */
function wifi(parent: FrameNode, paint: SolidPaint): FrameNode {
  const f = figma.createFrame();
  f.name = 'Wi-Fi';
  f.fills = [];
  f.clipsContent = true;
  f.resize(16, 12);
  const top = { startingAngle: -Math.PI * 0.75, endingAngle: -Math.PI * 0.25 };
  for (const [d, inner] of [
    [22, 0.78],
    [14.5, 0.66],
    [7, 0],
  ] as const) {
    const e = figma.createEllipse();
    e.resize(d, d);
    e.arcData = { ...top, innerRadius: inner };
    e.fills = [paint];
    f.appendChild(e);
    e.x = 8 - d / 2;
    e.y = 12.5 - d / 2;
  }
  parent.appendChild(f);
  return f;
}

function battery(parent: FrameNode, paint: SolidPaint): FrameNode {
  const f = figma.createFrame();
  f.name = 'Battery';
  f.fills = [];
  f.resize(27, 13);
  const body = figma.createRectangle();
  body.resize(25, 13);
  body.cornerRadius = 4;
  body.fills = [];
  body.strokes = [{ ...paint, opacity: 0.4 }];
  body.strokeWeight = 1;
  body.strokeAlign = 'INSIDE';
  const level = figma.createRectangle();
  level.resize(21, 9);
  level.cornerRadius = 2.5;
  level.fills = [paint];
  const cap = figma.createRectangle();
  cap.resize(1.5, 4);
  cap.cornerRadius = 1;
  cap.fills = [{ ...paint, opacity: 0.4 }];
  for (const n of [body, level, cap]) f.appendChild(n);
  level.x = level.y = 2;
  cap.x = 25.5;
  cap.y = 4.5;
  parent.appendChild(f);
  return f;
}

/**
 * Status bar as a child frame of `parent` (layout NONE inside, so it stretches with the screen).
 * `fg` colors time and icons. The time text is kept between rebuilds so an override like "20:43" survives.
 */
export function ensureStatusBar(
  parent: BaseNode & ChildrenMixin,
  ctx: BuildContext,
  platform: Platform,
  fg: SolidPaint,
  width: number,
): FrameNode | null {
  const spec = STATUS_BAR[platform];
  if (!spec) {
    parent.findChild((n) => n.name === 'Status bar')?.remove();
    return null;
  }
  const bar = ensureChild(parent, 'Status bar', 'FRAME', () => figma.createFrame());
  bar.layoutMode = 'NONE';
  bar.resize(width, DEVICE[platform].safeTop);
  bar.fills = [];
  bar.clipsContent = false;
  for (const c of [...bar.children]) if (c.name !== 'Time') c.remove();

  const time = ensureChild(bar, 'Time', 'TEXT', () => figma.createText());
  time.fontName = ctx.fonts[platform][spec.time.weight];
  if (!time.characters) time.characters = DEFAULT_TIME;
  time.fontSize = spec.time.size;
  time.fills = [fg];
  time.textAutoResize = 'WIDTH_AND_HEIGHT';
  time.x = spec.time.align === 'center' ? Math.round(spec.time.x - time.width / 2) : spec.time.x;
  time.y = Math.round(spec.centerY - time.height / 2);
  time.constraints = { horizontal: 'MIN', vertical: 'MIN' };

  if (spec.camera.kind === 'island') {
    const island = figma.createRectangle();
    island.name = 'Dynamic Island';
    island.resize(spec.camera.width, spec.camera.height);
    island.cornerRadius = spec.camera.height / 2;
    island.fills = [rawPaint('#000000')];
    bar.appendChild(island);
    island.x = Math.round((width - spec.camera.width) / 2);
    island.y = spec.camera.top;
    island.constraints = { horizontal: 'CENTER', vertical: 'MIN' };
  } else {
    const cam = figma.createEllipse();
    cam.name = 'Camera';
    cam.resize(spec.camera.size, spec.camera.size);
    cam.fills = [rawPaint('#000000')];
    bar.appendChild(cam);
    cam.x = Math.round((width - spec.camera.size) / 2);
    cam.y = spec.camera.top;
    cam.constraints = { horizontal: 'CENTER', vertical: 'MIN' };
  }

  // Right icons, laid out from the right edge.
  const icons = figma.createFrame();
  icons.name = 'Icons';
  icons.fills = [];
  icons.layoutMode = 'HORIZONTAL';
  icons.counterAxisAlignItems = 'CENTER';
  icons.primaryAxisSizingMode = 'AUTO';
  icons.counterAxisSizingMode = 'AUTO';
  icons.itemSpacing = spec.iconGap;
  bar.appendChild(icons);
  signal(icons, fg);
  wifi(icons, fg);
  battery(icons, fg);
  icons.x = width - spec.rightInset - icons.width;
  icons.y = Math.round(spec.centerY - icons.height / 2);
  icons.constraints = { horizontal: 'MAX', vertical: 'MIN' };
  return bar;
}
