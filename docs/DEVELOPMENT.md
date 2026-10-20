# Development

How to build, test and run the plugin locally. For what the plugin does and how to use it, see the [README](../README.md).

## Build and run

```sh
npm install
npm run watch      # rebuilds dist/ on change
npm test           # unit tests (core, collection sync, audit, contrast, handoff)
npm run typecheck
```

In **Figma desktop**: *Plugins → Development → Import plugin from manifest…* → pick `manifest.json`.
Then run it from *Plugins → Development → Native Kit for Telegram Mini Apps*.

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

## Sources

Theme colors and component geometry come from the open-source Telegram clients; exact files are listed in [reference/README.md](../reference/README.md). Listing assets: `store/render.mjs`, publishing steps: [PUBLISHING.md](PUBLISHING.md). Original spec: [SPEC.md](SPEC.md).
