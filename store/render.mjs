// Renders Community listing assets for the plugin into <repo>/store using Playwright + Chromium.
// Run with a globally installed Playwright: node store/render.mjs (after npm run build).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import * as esbuild from '/home/user/tgminiappfigmaplugin/node_modules/esbuild/lib/main.js';
import { readFile } from 'node:fs/promises';

const REPO = '/home/user/tgminiappfigmaplugin';
const OUT = `${REPO}/store`;

// Bundle the plugin's own core (presets, color math, snippet) so the images use real values.
const core = await esbuild.build({ entryPoints: [`${REPO}/src/core/index.ts`], bundle: true, format: 'esm', write: false });
const { PRESETS, resolveParams, textContrast, hexToRgb, hexToRgba, generateSnippet, cssVarRef, THEME_PARAMS } = await import(
  'data:text/javascript;base64,' + Buffer.from(core.outputFiles[0].text).toString('base64')
);
const P = Object.fromEntries(PRESETS.map((p) => [p.id, { ...p, c: resolveParams(p.params, p.scheme).params }]));

const FONT = `font-family: Inter, system-ui, sans-serif;`;
const BG = `radial-gradient(1200px 700px at 78% 20%, rgba(51,144,236,.22), transparent 60%), radial-gradient(900px 600px at 10% 100%, rgba(120,80,220,.18), transparent 60%), #0e1014`;

// ---------- Mini App mock screen ----------
function phone(id, opts = {}) {
  const p = P[id];
  const c = p.c;
  const ios = p.platform === 'ios';
  const w = opts.w ?? 340;
  const h = opts.h ?? 700;
  const headerBg = ios ? c.header_bg_color : c.section_bg_color;
  const left = opts.back
    ? ios
      ? `<span style="color:${c.accent_text_color};font-size:16px">‹ Back</span>`
      : `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" stroke="${c.text_color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : ios
      ? `<span style="color:${c.accent_text_color};font-size:16px">Cancel</span>`
      : `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="${c.text_color}" stroke-width="2" stroke-linecap="round"/></svg>`;
  const menu = ios
    ? `<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" stroke="${c.accent_text_color}" stroke-width="1.4" fill="none"/><circle cx="6.6" cy="11" r="1.4" fill="${c.accent_text_color}"/><circle cx="11" cy="11" r="1.4" fill="${c.accent_text_color}"/><circle cx="15.4" cy="11" r="1.4" fill="${c.accent_text_color}"/></svg>`
    : `<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" fill="${c.text_color}"/><circle cx="12" cy="12" r="2" fill="${c.text_color}"/><circle cx="12" cy="19" r="2" fill="${c.text_color}"/></svg>`;
  const title = ios
    ? `<div style="text-align:center;flex:1"><div style="font-weight:600;font-size:16px;color:${c.text_color}">Coffee Bar</div><div style="font-size:12px;color:${c.accent_text_color}">bot</div></div>`
    : `<div style="flex:1;padding-left:22px"><div style="font-weight:600;font-size:17px;color:${c.text_color}">Coffee Bar</div><div style="font-size:13px;color:${c.hint_color}">bot</div></div>`;
  const header = opts.fullscreen
    ? ''
    : `<div style="background:${headerBg};padding:${ios ? 30 : 22}px 14px 0"><div style="height:50px;display:flex;align-items:center;gap:6px">${
        ios ? `<div style="width:70px">${left}</div>${title}<div style="width:70px;text-align:right">${menu}</div>` : `${left}${title}${menu}`
      }</div></div>`;
  const pills = opts.fullscreen
    ? `<div style="position:absolute;top:42px;left:14px;right:14px;display:flex;justify-content:space-between;z-index:2">
         <div style="height:28px;border-radius:14px;background:rgba(115,115,115,.25);backdrop-filter:blur(12px);display:flex;align-items:center;gap:8px;padding:0 12px 0 9px;color:#fff;font-weight:600;font-size:12.5px"><svg width="11" height="11" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>Close</div>
         <div style="height:28px;width:68px;border-radius:14px;background:rgba(115,115,115,.25);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:space-around;color:#fff"><svg width="14" height="8" viewBox="0 0 14 8"><path d="M1 1l6 6 6-6" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><svg width="18" height="4"><circle cx="2" cy="2" r="2" fill="#fff"/><circle cx="9" cy="2" r="2" fill="#fff"/><circle cx="16" cy="2" r="2" fill="#fff"/></svg></div>
       </div>`
    : '';
  const row = (t, s, r, last) =>
    `<div style="display:flex;align-items:center;padding:11px 14px;${last ? '' : `border-bottom:1px solid ${c.section_separator_color}`}"><div style="width:34px;height:34px;border-radius:9px;background:${c.secondary_bg_color};margin-right:12px"></div><div style="flex:1"><div style="color:${c.text_color};font-size:15px">${t}</div><div style="color:${c.subtitle_text_color};font-size:12.5px">${s}</div></div><div style="color:${c.text_color};font-size:15px">${r}</div></div>`;
  const hero = opts.fullscreen
    ? `<div style="height:250px;background:linear-gradient(160deg, ${c.button_color}, #1b1030);display:flex;align-items:flex-end;padding:18px;color:#fff;font-weight:700;font-size:26px">Coffee Bar</div>`
    : '';
  const sectionRadius = ios ? 12 : 0;
  const content = `
    ${hero}
    <div style="padding:${ios ? '14px 14px 0' : '0'}">
      <div style="color:${c.section_header_text_color};font-size:12px;font-weight:${ios ? 400 : 600};letter-spacing:${ios ? '.04em' : '0'};text-transform:${ios ? 'uppercase' : 'none'};padding:${ios ? '6px 14px 6px' : '14px 14px 6px'}">Your order</div>
      <div style="background:${c.section_bg_color};border-radius:${sectionRadius}px;overflow:hidden">
        ${row('Flat white', 'Oat milk · Large', '$4.20')}
        ${row('Cinnamon bun', 'Warm', '$3.40')}
        <div style="padding:12px 14px;color:${c.accent_text_color};font-size:15px;${`border-top:1px solid ${c.section_separator_color}`}">+ Add more</div>
      </div>
      <div style="color:${c.hint_color};font-size:12.5px;padding:8px 14px 14px">Pickup in 10 min at Main St. <span style="color:${c.link_color}">Store hours</span></div>
      <div style="background:${c.section_bg_color};border-radius:${sectionRadius}px;padding:12px 14px;color:${c.destructive_text_color};font-size:15px">Clear order</div>
    </div>`;
  const btn = (txt, bg, fg, extra = '') =>
    `<div style="flex:1;height:${ios ? 48 : 42}px;border-radius:${ios ? 12 : 9}px;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-weight:600;font-size:${ios ? 16 : 14}px;${extra}">${txt}</div>`;
  const spinner = (fg) =>
    `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 1-9 9" stroke="${fg}" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`;
  let buttons = btn(opts.loading ? spinner(c.button_text_color) : opts.main ?? 'Pay $7.60', c.button_color, c.button_text_color,
    opts.shine ? `background-image:linear-gradient(100deg, transparent 35%, rgba(255,255,255,.45) 50%, transparent 65%)` : '');
  if (opts.secondary) buttons = btn('Later', c.bottom_bar_bg_color, c.button_color) + buttons;
  const bar = `<div style="position:absolute;left:0;right:0;bottom:0;background:${c.bottom_bar_bg_color};border-top:${ios ? 0.5 : 1}px solid ${ios ? (p.scheme === 'dark' ? 'rgba(84,84,88,.55)' : '#b2b2b2') : 'rgba(0,0,0,.1)'};padding:${ios ? '8px 14px 30px' : '7px 8px 22px'}"><div style="display:flex;gap:${ios ? 14 : 10}px">${buttons}</div></div>`;
  return `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${ios ? 46 : 30}px;overflow:hidden;background:${ios ? c.secondary_bg_color : c.secondary_bg_color};box-shadow:0 30px 80px rgba(0,0,0,.45), 0 0 0 9px #1c1d21, 0 0 0 10px #2c2d33;${FONT}">${pills}${header}${content}${bar}</div>`;
}

// ---------- page helper ----------
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome' }).catch(() => chromium.launch());
async function shot(name, w, h, body, scale = 1) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:${w}px;height:${h}px;overflow:hidden;${FONT}-webkit-font-smoothing:antialiased}</style></head><body>${body}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.close();
  console.log('wrote', name);
}

// ---------- real plugin UI, fed with mock messages ----------
const FIGMA_DARK = `--figma-color-bg:#2c2c2c;--figma-color-bg-secondary:#383838;--figma-color-bg-hover:#383838;--figma-color-bg-selected:#2b3b4d;--figma-color-bg-brand:#0d99ff;--figma-color-text:#ffffff;--figma-color-text-secondary:#b3b3b3;--figma-color-text-tertiary:#8c8c8c;--figma-color-text-onbrand:#ffffff;--figma-color-text-brand:#7cc4f8;--figma-color-border:#444444;--figma-color-border-selected:#0d99ff;--figma-color-text-warning:#f7d15f;--figma-color-bg-warning-tertiary:#4a3b10;--figma-color-text-danger:#ff8a75;--figma-color-bg-danger-tertiary:#4f2219;--figma-color-text-success:#79d297;--figma-color-bg-success-tertiary:#1f3d2a;--figma-color-bg-disabled:#444;--figma-color-text-ondisabled:#999;--figma-color-text-disabled:#777;`;
async function uiShot(name, setup) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  await page.goto(`file://${REPO}/dist/ui.html`);
  await page.addStyleTag({ content: `:root{${FIGMA_DARK}} body{font-family:Inter,sans-serif}` });
  const send = (msg) => page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), msg);
  await setup(page, send);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.close();
  // Inline as a data URI: pages built with setContent can't load file:// images.
  return `data:image/png;base64,${(await readFile(`${OUT}/${name}.png`)).toString('base64')}`;
}
const STATE = {
  collection: { id: 'c', modes: PRESETS.map((p, i) => ({ presetId: p.id, modeId: `m${i}` })) },
  selection: { themeable: 1, presetId: 'ios-dark', screens: 1, unbound: 0 },
  matrixPresetIds: PRESETS.map((p) => p.id),
  componentsReady: true,
  insertTarget: { name: 'Checkout', platform: 'iOS' },
};

// Contrast rows computed with the plugin's own math.
const pairs = [
  ['Title', 'Your order', 'text_color', 'section_bg_color', false],
  ['Order button', 'Pay $7.60', 'button_text_color', 'button_color', false],
  ['Pickup hint', 'Pickup in 10 min', 'hint_color', 'secondary_bg_color', false],
  ['Add more', '+ Add more', 'accent_text_color', 'section_bg_color', false],
  ['Store hours', 'Store hours', 'link_color', 'secondary_bg_color', false],
];
const contrastRows = pairs.map(([name, text, fg, bg, large]) => {
  const ratios = PRESETS.map((p) => Math.round(textContrast(hexToRgba(P[p.id].c[fg]), hexToRgb(P[p.id].c[bg])) * 100) / 100);
  const threshold = large ? 3 : 4.5;
  return { nodeId: name, name, text, large, threshold, ratios, failing: ratios.filter((r) => r < threshold).length };
}).sort((a, b) => b.failing - a.failing);

const uiThemes = await uiShot('ui-themes', async (page, send) => {
  await send({ type: 'state', state: STATE });
});
const uiComponents = await uiShot('ui-components', async (page, send) => {
  await send({ type: 'state', state: STATE });
  await page.click('text=Components');
  await page.click('text=Bottom bar');
  await page.click('text=Secondary left');
});
const uiContrast = await uiShot('ui-contrast', async (page, send) => {
  await send({ type: 'state', state: STATE });
  await page.click('nav >> text=Checks');
  await page.click('text=Contrast');
  await send({ type: 'contrast-result', result: { presetIds: PRESETS.map((p) => p.id), rows: contrastRows, checked: 14, truncated: false, skipped: { noBackground: 0, unsupported: 0, system: 4 } } });
});
const uiColors = await uiShot('ui-colors', async (page, send) => {
  await send({ type: 'state', state: STATE });
  await page.click('nav >> text=Checks');
  const g = (hex, target, count, key, quality, names, distance = 0) => ({ id: `${target}|${hex}`, hex, target, count, layerNames: names, suggestion: { key, distance, quality } });
  await send({ type: 'scan-result', result: { rootNames: ['Checkout'], referencePresetId: 'ios-light', stats: { layers: 64, gradients: 0, styled: 0, ignored: 1, truncated: false }, groups: [
    g('#000000', 'text', 18, 'text_color', 'exact', ['Title', 'Flat white', 'Price']),
    g('#ffffff', 'fill', 6, 'bg_color', 'exact', ['Checkout', 'Card']),
    g('#8e8e93', 'text', 7, 'hint_color', 'exact', ['Pickup hint', 'Subtitle']),
    g('#0a84ff', 'text', 3, 'accent_text_color', 'near', ['Add more', 'Store hours'], 2.1),
    g('#ffffff', 'text', 2, 'button_text_color', 'exact', ['Pay label']),
    g('#ff2d55', 'fill', 1, 'destructive_text_color', 'weak', ['Promo badge'], 9.4),
  ] } });
});
const handoffSnippet = generateSnippet({ backButton: true, headerColor: 'bg_color', mainButton: { visible: true, text: 'Pay $7.60', shine: true }, secondaryButton: { visible: true, text: 'Later', position: 'left' } });
const uiHandoff = await uiShot('ui-handoff', async (page, send) => {
  await send({ type: 'state', state: STATE });
  await page.click('nav >> text=Handoff');
  await send({ type: 'handoff-result', result: { screenName: 'Checkout', found: ['Header', 'Bottom bar'], snippet: handoffSnippet, cssVars: ['accent_text_color', 'bg_color', 'button_color', 'hint_color', 'section_bg_color', 'text_color'].map(cssVarRef) } });
});

// ---------- compositions ----------
const H1 = (t) => `<div style="font-size:64px;font-weight:700;letter-spacing:-.02em;color:#fff;line-height:1.08">${t}</div>`;
const SUB = (t) => `<div style="margin-top:18px;font-size:28px;color:#aeb4c0;line-height:1.35;max-width:1500px">${t}</div>`;
const slide = (title, sub, visual) =>
  `<div style="position:absolute;inset:0;background:${BG}"></div><div style="position:absolute;left:110px;top:96px">${H1(title)}${SUB(sub)}</div>${visual}`;
const uiImg = (src, x, y, w = 360) =>
  `<img src="${src}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.5), 0 0 0 1px #3a3a3a">`;
const label = (t) => `<div style="margin-top:22px;text-align:center;color:#c9ceda;font-size:22px;font-weight:600">${t}</div>`;

// Icon: three stacked "screens" in light, dark and accent — abstract, no Telegram marks.
await shot('icon', 128, 128, `
  <div style="width:128px;height:128px;border-radius:28px;background:linear-gradient(145deg,#3a8ef6,#6a4fe0);position:relative;overflow:hidden">
    <div style="position:absolute;left:22px;top:30px;width:52px;height:74px;border-radius:12px;background:#ffffff;transform:rotate(-12deg);box-shadow:0 6px 14px rgba(0,0,0,.25)"></div>
    <div style="position:absolute;left:40px;top:24px;width:52px;height:74px;border-radius:12px;background:#17212b;transform:rotate(0deg);box-shadow:0 6px 14px rgba(0,0,0,.3)"><div style="position:absolute;left:8px;right:8px;bottom:9px;height:11px;border-radius:4px;background:#64b5ef"></div><div style="position:absolute;left:8px;top:10px;width:24px;height:5px;border-radius:3px;background:#fff;opacity:.9"></div><div style="position:absolute;left:8px;top:20px;width:34px;height:4px;border-radius:2px;background:#708499"></div></div>
    <div style="position:absolute;left:60px;top:34px;width:52px;height:74px;border-radius:12px;background:#ffe066;transform:rotate(12deg);box-shadow:0 6px 14px rgba(0,0,0,.25);opacity:.95"></div>
  </div>`);

await shot('cover', 1920, 1080, `
  <div style="position:absolute;inset:0;background:${BG}"></div>
  <div style="position:absolute;left:120px;top:270px;width:900px">
    <div style="font-size:24px;font-weight:600;letter-spacing:.14em;color:#7cc4f8">FIGMA PLUGIN</div>
    <div style="margin-top:20px;font-size:84px;font-weight:800;letter-spacing:-.03em;color:#fff;line-height:1.04">Native Kit for<br><span style="white-space:nowrap">Telegram Mini Apps</span></div>
    <div style="margin-top:30px;font-size:30px;color:#b8bfcc;line-height:1.35;max-width:780px">Design once — see it in every Telegram theme, with system UI that matches the apps.</div>
    <div style="margin-top:44px;display:flex;flex-wrap:wrap;gap:14px">${['Theme params as variables', 'iOS & Android system UI', 'Contrast check', 'Code handoff']
      .map((t) => `<div style="padding:12px 20px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#e7eaf0;font-size:22px">${t}</div>`)
      .join('')}</div>
  </div>
  <div style="position:absolute;left:1020px;top:230px;transform:rotate(-7deg)">${phone('ios-light', { w: 300, h: 640 })}</div>
  <div style="position:absolute;left:1500px;top:250px;transform:rotate(7deg)">${phone('android-dark', { w: 300, h: 640 })}</div>
  <div style="position:absolute;left:1260px;top:190px;z-index:2">${phone('ios-dark', { w: 310, h: 680, secondary: true })}</div>`);

const names = { 'ios-light': 'iOS Light', 'ios-dark': 'iOS Dark', 'android-light': 'Android Light', 'android-dark': 'Android Dark', stress: 'Stress Test' };
await shot('carousel-1-themes', 1920, 1080, slide('Every Telegram theme, one click', 'Apply a theme to a frame, or lay a screen out in all of them at once.',
  `<div style="position:absolute;left:110px;right:110px;top:330px;display:flex;justify-content:space-between">${PRESETS.map((p) => `<div>${phone(p.id, { w: 300, h: 620 })}${label(names[p.id])}</div>`).join('')}</div>`));

const swatchRows = THEME_PARAMS.slice(0, 11).map((t) => `<tr><td style="padding:9px 18px 9px 0;color:#e7eaf0;font:500 20px/1 ui-monospace,Menlo,monospace">tg/${t.key}</td>${PRESETS.map((p) => `<td style="padding:6px 8px"><div style="width:58px;height:28px;border-radius:7px;background:${P[p.id].c[t.key]};box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)"></div></td>`).join('')}<td style="padding-left:18px;color:#7cc4f8;font:18px ui-monospace,Menlo,monospace">${cssVarRef(t.key)}</td></tr>`).join('');
await shot('carousel-2-variables', 1920, 1080, slide('Theme params become Figma variables', 'One mode per theme. Developers see the Telegram CSS variable in Dev Mode.',
  `${uiImg(uiThemes, 110, 330, 400)}
   <table style="position:absolute;left:600px;top:350px;border-collapse:collapse">
     <tr><td></td>${PRESETS.map((p) => `<td style="padding:0 8px 12px;color:#aeb4c0;font-size:16px;text-align:center">${names[p.id].replace(' ', '<br>')}</td>`).join('')}<td></td></tr>
     ${swatchRows}
   </table>`));

await shot('carousel-3-components', 1920, 1080, slide('System UI that matches the apps', 'Header, Main & Secondary buttons and fullscreen controls — sizes and states from the Telegram apps.',
  `<div style="position:absolute;left:110px;top:330px;display:flex;gap:44px;align-items:flex-start">
     <div>${phone('ios-light', { w: 272, h: 600, back: true, secondary: true })}${label('Back · two buttons')}</div>
     <div>${phone('ios-dark', { w: 272, h: 600, fullscreen: true, main: 'Start' })}${label('Fullscreen controls')}</div>
     <div>${phone('android-light', { w: 272, h: 600, loading: true })}${label('Loading state')}</div>
     <div>${phone('android-dark', { w: 272, h: 600, shine: true, main: 'Get the deal' })}${label('Shine effect')}</div>
   </div>
   ${uiImg(uiComponents, 1460, 330, 350)}`));

await shot('carousel-4-checks', 1920, 1080, slide('Catch problems before handoff', 'Bind raw colors to theme params in one click, and check contrast in every theme.',
  `${uiImg(uiColors, 220, 330, 400)}${uiImg(uiContrast, 760, 330, 400)}
   <div style="position:absolute;left:1300px;top:400px;width:500px;color:#c9ceda;font-size:26px;line-height:1.5">
     <div style="color:#fff;font-weight:700;font-size:30px;margin-bottom:12px">Unbound colors</div>Grouped by color and usage, matched to the closest theme param.
     <div style="color:#fff;font-weight:700;font-size:30px;margin:34px 0 12px">Contrast</div>WCAG 2.1 for every text layer, in every theme mode.
   </div>`));

await shot('carousel-5-handoff', 1920, 1080, slide('Hand off ready-to-use code', 'The Telegram.WebApp calls for the screen, plus the CSS variables it uses.',
  `${uiImg(uiHandoff, 220, 330, 400)}
   <div style="position:absolute;left:760px;top:360px;width:1040px;padding:34px 40px;border-radius:18px;background:#16181d;border:1px solid #2a2d35;color:#e7eaf0;font:22px/1.65 ui-monospace,Menlo,monospace;white-space:pre-wrap">${handoffSnippet.replace(/</g, '&lt;')}</div>`));

await browser.close();
