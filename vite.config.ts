import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Everything (JS, CSS, fonts, SVG art) is inlined into one index.html,
// so the game opens from a USB stick or a local file with no internet.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2019',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
});
