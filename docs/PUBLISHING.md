# Публикация в Figma Community

Ассеты лежат в `store/` и пересобираются скриптом `store/render.mjs` (Playwright + Chromium, рендерит настоящий `dist/ui.html`).

## Перед публикацией

1. **2FA.** Figma → Settings → Security → включить двухфакторную аутентификацию. Без неё кнопки Publish не будет.
2. **Собрать свежую версию:** `git pull && npm install && npm run build`.
3. **Влить PR в `main`**, чтобы ссылка на поддержку вела на актуальный README.

## Шаги в Figma desktop

1. Открыть любой design-файл → меню **Plugins → Manage plugins…** (или Plugins → Development → Manage plugins in development).
2. Найти **Native Kit for Telegram Mini Apps** → меню `…` → **Publish**.
3. **ID плагина** уже в `manifest.json` (`1694455897646802978`). Не меняйте его: обновления публикуются в плагин с этим ID.
4. Заполнить страницы мастера по разделам ниже.
5. **Publish** → плагин появится в Published со статусом *In review*, решение придёт на почту.

## Страница «Describe»

**Name**
```
Native Kit for Telegram Mini Apps
```

**Tagline**
```
Design native Telegram Mini Apps: theme params as variables, every theme in one click, real system UI.
```

**Description**
```
Native Kit helps you design Telegram Mini Apps that take their colors from the user's Telegram theme — and see how a screen looks in every theme before it ships.

THEMES
• All 15 Telegram theme params as Figma variables, one mode per theme: iOS Light & Dark, Android Light & Dark, plus a harsh Stress Test theme for custom themes.
• Dev Mode shows the Telegram CSS variable, e.g. var(--tg-theme-bg-color).
• Apply a theme to a frame in one click, or lay a screen out in every theme side by side.
• Theme colors match the default themes of the Telegram iOS and Android apps.

SYSTEM COMPONENTS
• Header with Close/Back, menu and setHeaderColor variants.
• Main & Secondary buttons: every layout (side by side, stacked, left/right/top/bottom) and state — pressed, inactive, loading, shine.
• Fullscreen controls with a toggleable safe-area guide.
• Sizes, colors and states are taken from the open-source Telegram iOS and Android apps. Applying a theme switches components to its platform.

CHECKS
• Unbound colors: finds raw colors, suggests the closest theme param by usage and binds them in one click. Mark illustrations and logos as exceptions.
• Contrast: WCAG 2.1 for every text layer, in every theme.

HANDOFF
• Generates the Telegram.WebApp code for a screen — BackButton, setHeaderColor, setBottomBarColor, MainButton/SecondaryButton params — plus the list of CSS variables it uses.

The plugin has no network access and only writes to the current file. Open source.
Not affiliated with or endorsed by Telegram.
```

**Category:** `Design tools`  (вторая подходящая — `Development`)

**Tags** (если попросит)
```
telegram, mini apps, web app, theme, variables, dark mode, design system, accessibility, contrast, handoff
```

## Страница «Images»

| Поле | Файл |
|---|---|
| Icon (128 × 128) | `store/icon.png` |
| Thumbnail / cover (1920 × 1080) | `store/cover.png` |
| Carousel | `store/carousel-1-themes.png`, `carousel-2-variables.png`, `carousel-3-components.png`, `carousel-4-checks.png`, `carousel-5-handoff.png` |

Playground file — необязательно. Можно позже сделать файл с примером экрана и матрицей тем.

## Страница «Data security» (необязательная, проверяется до 2 недель)

Ответы по фактам кода — использовать, если решите заполнять:

- **Does the plugin make network requests?** No. `networkAccess.allowedDomains` is `["none"]`.
- **Does it collect, store or transmit user data?** No data leaves Figma. The plugin stores:
  - in the current document: plugin data on its own variable collection, variables, component sets and on layers the user marks as exceptions (`tgModes`, `tgParam`, `tgSystem`, `tgPreset`, `tgIgnore`, `tgComponent`, `tgMatrixFor`, `tgMatrixCopyOf`);
  - in Figma client storage: the list of themes chosen for the theme matrix.
- **Does it require sign-in or third-party services?** No.
- **Does it access other files?** No, only the current file.
- **Does it use AI / LLMs?** No.

## Страница «Final details»

- **Publish as:** you (Daniel).
- **Support contact:** `https://github.com/cybertatar/tgminiappfigmaplugin/issues`
- **Pricing:** Free.
- **Comments:** включить — так быстрее узнаете о проблемах.

## После одобрения

- Ссылку на плагин добавить в README.
- Обновления: собрать (`npm run build`) → Manage plugins → `…` → **Publish new version** с коротким описанием изменений. Повторное ревью обычно быстрее.
