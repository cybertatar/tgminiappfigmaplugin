// Built-in presets, bundled from /presets/*.json. Order = order of modes in the collection.
import androidDark from '../../presets/android-dark.json';
import androidLight from '../../presets/android-light.json';
import iosDark from '../../presets/ios-dark.json';
import iosLight from '../../presets/ios-light.json';
import stress from '../../presets/stress.json';
import type { Preset } from './preset';

export const PRESETS: readonly Preset[] = [
  iosLight,
  iosDark,
  androidLight,
  androidDark,
  // desktop-dark.json is kept but hidden until it's taken from the Telegram Desktop sources.
  stress,
] as Preset[];
