# TG Native Kit

Figma plugin for designing **native** Telegram Mini Apps — apps that take their colors from the user's Telegram theme.

- Theme params as Figma Variables (`Telegram Theme` collection, one mode per theme, `var(--tg-theme-*)` in Dev Mode)
- One-click theme switching and a theme matrix
- Telegram system components (header, Main/Secondary buttons, popups) bound to the theme
- Audits: unbound colors, contrast across all themes
- Handoff snippet for `Telegram.WebApp`

Full spec: [docs/SPEC.md](docs/SPEC.md).

## Status

| Block | State |
|---|---|
| `/core`: colors (CIEDE2000, WCAG), matching, presets, snippet | ✅ with tests |
| A1 `Telegram Theme` collection | ✅ |
| A2 Apply theme to selection (+ platform of kit components) | ✅ |
| Sniffer page | ✅ |
| A3 Theme matrix | ✅ |
| B1 Header (windowed): Close/Back, menu, header colors, pressed states | ✅ iOS from official docs, others draft |
| B2 Fullscreen controls + safe area guide | ✅ iOS from official docs, Android draft |
| B3 Bottom bar: Main/Secondary buttons, all layouts and states | ✅ iOS from official docs, others draft |
| B4, B5 Popups, screen template | ⏳ |
| C1 Unbound colors: scan, suggest, bind, exceptions | ✅ |
| C2 Contrast across themes | ⏳ |
| D Handoff UI | ⏳ (`generateSnippet` is ready in core) |

## Develop

```sh
npm install
npm run watch      # rebuilds dist/ on change
npm test           # unit tests for src/core and the collection sync
npm run typecheck
```

In **Figma desktop**: *Plugins → Development → Import plugin from manifest…* → pick `manifest.json`.
Then run it from *Plugins → Development → TG Native Kit*.

```
src/core        pure functions (no Figma API) — covered by tests
src/main        main thread: works with the document
src/ui          Preact UI (iframe), inlined into dist/ui.html
src/shared      UI <-> main message types
src/components  system component specs per platform (sizes, fonts) — edit here to adjust
presets/        theme presets, one JSON per theme
reference/      client screenshots used to verify components
sniffer/        Mini App page that captures real themeParams
```

## Presets

Every preset is `{ id, name, platform, scheme, params, draft?, source? }` in `presets/*.json`.
Presets with `"draft": true` hold **approximate** values and are marked DRAFT in the UI.
Replace them with real ones captured by the sniffer:

1. Host `sniffer/index.html` over HTTPS (e.g. GitHub Pages).
2. In [@BotFather](https://t.me/BotFather) create a test bot and set the page as its Mini App (`/newapp` or the bot's *Menu Button*).
3. Open it in each client (iOS, Android, Desktop) in light and dark themes, tap **Copy preset JSON**.
4. Paste into the matching `presets/<id>.json`, remove `"draft": true`, rebuild.

Adding a preset = add a JSON file and list it in `src/core/presets.ts`. New theme keys go into `src/core/theme-params.ts` only.

> Figma limits modes per collection by plan (Professional/Education: 10). The plugin reports presets that didn't fit.
