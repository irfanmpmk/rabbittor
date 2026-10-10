// Builds dist/rabbittor.html: the whole game in one file (easy to share or open offline).
// Usage: node tools/build-single.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'css/style.css'), 'utf8');
const icon = readFileSync(join(root, 'icon.svg'), 'utf8');

html = html.replace('<link rel="stylesheet" href="css/style.css">', `<style>\n${css}</style>`);
html = html.replace('<link rel="icon" href="icon.svg" type="image/svg+xml">',
  `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon)}">`);
html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, src) =>
  `<script>\n${readFileSync(join(root, src), 'utf8')}</script>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/rabbittor.html'), html);
console.log('Wrote dist/rabbittor.html', (html.length / 1024).toFixed(1) + ' KB');
