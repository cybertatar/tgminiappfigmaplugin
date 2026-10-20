# References

What the system components are checked against. Images are not copied here — follow the links.

## Official (core.telegram.org/bots/webapps)

| What | Shows | Link |
|---|---|---|
| WebViewColors explained | iOS windowed header (Cancel · title + "bot" · ⋯), content, bottom button; which theme param paints what | https://telegram.org/file/400780400851/2/6GwDkk6T-aY.416569/b591d589108b487d63 |
| SafeAreaInset explained | iOS fullscreen, portrait + landscape: floating controls (✕ + app name pill, ⌄ ⋯ pill), system safe area | https://telegram.org/file/400780400066/1/tTFDI7OC8tE.1374724/9e496dd312c7706a38 |
| ContentSafeAreaInset explained | same, with content safe area below the floating controls | https://telegram.org/file/400780400676/2/8VT7jCQvpsk.1386608/d249aa072662450345 |

## Figma Community (unofficial)

- Telegram iOS UI Kit — https://www.figma.com/community/file/1248591742072330278
- Telegram Android UI Kit — https://www.figma.com/community/file/1248594479379883056
- Telegram Mini Apps 2.0 (fullscreen) — https://www.figma.com/community/file/1443850297619320287
- Telegram Mini Apps · UI Kit — https://www.figma.com/community/file/1348989725141777736

## Client screenshots

Put own captures here as `<platform>-<scheme>-<what>.png` (e.g. `android-light-bar-main.png`),
with device model and Telegram version in the commit message.

## Client source code (primary source)

Values in `presets/` and `src/components/` are taken from the open-source Telegram clients:

| What | Telegram Android ([DrKLO/Telegram](https://github.com/DrKLO/Telegram) @ 0aae959) | Telegram iOS ([TelegramMessenger/Telegram-iOS](https://github.com/TelegramMessenger/Telegram-iOS) @ f1dd7a2) |
|---|---|---|
| themeParams mapping | `ui/bots/BotWebViewAttachedSheet.makeThemeParams` | `submodules/WebUI/Sources/WebAppController.swift` (`webAppThemeParams`) |
| Default theme colors | `ui/ActionBar/ThemeColors.java`, `assets/bluebubbles.attheme`, `assets/darkblue.attheme` | `TelegramPresentationData/DefaultDayPresentationTheme.swift`, `DefaultDarkPresentationTheme.swift` |
| Bottom buttons | `ui/bots/BotButtons.java` | `submodules/AttachmentUI/Sources/AttachmentPanel.swift` (legacy style) |
| Header | `BotWebViewAttachedSheet` (default `windowBackgroundWhite`, contrast by luminance), `ActionBar.java` | `WebAppController.updateHeaderBackgroundColor` |
| Fullscreen controls | — | `submodules/WebUI/Sources/FullscreenControlsComponent.swift` |
| Status bar / insets | AOSP `SystemBarUtils.getStatusBarHeight`, `NavigationBarModeGesturalOverlay` dimens | iPhone 17 screenshots |
