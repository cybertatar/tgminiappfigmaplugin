// Builds the plugin: main thread -> dist/code.js, UI -> single inlined dist/ui.html
// (Figma loads the UI as one HTML string, so JS and CSS must be inlined).
import * as esbuild from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');

const common = {
  bundle: true,
  logLevel: 'info',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
};

const inlineHtml = {
  name: 'inline-html',
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length) return;
      const js = result.outputFiles.find((f) => f.path.endsWith('.js'))?.text ?? '';
      const css = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';
      const template = await readFile('src/ui/index.html', 'utf8');
      const html = template
        .replace('/*__CSS__*/', () => css)
        .replace('/*__JS__*/', () => js.replace(/<\/script/gi, '<\\/script'));
      await mkdir('dist', { recursive: true });
      await writeFile('dist/ui.html', html);
    });
  },
};

const mainCtx = await esbuild.context({
  ...common,
  entryPoints: ['src/main/code.ts'],
  outfile: 'dist/code.js',
  target: 'es2017',
  format: 'iife',
});

const uiCtx = await esbuild.context({
  ...common,
  entryPoints: ['src/ui/main.tsx'],
  outdir: 'dist/.ui',
  target: 'es2020',
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  write: false,
  plugins: [inlineHtml],
});

if (watch) {
  await Promise.all([mainCtx.watch(), uiCtx.watch()]);
} else {
  await Promise.all([mainCtx.rebuild(), uiCtx.rebuild()]);
  await Promise.all([mainCtx.dispose(), uiCtx.dispose()]);
}
