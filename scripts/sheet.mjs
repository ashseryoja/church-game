// Builds a contact sheet of the object SVGs on card-coloured tiles and renders it to PNG
// with macOS Quick Look, for quick visual review.
// Usage: node scripts/sheet.mjs [outDir] [id1 id2 ...]
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dir = join(root, 'src/art/objects');
const outDir = resolve(process.argv[2] ?? join(root, '.sheet'));
const only = process.argv.slice(3);
mkdirSync(outDir, { recursive: true });

let files = readdirSync(dir).filter((f) => f.endsWith('.svg')).sort();
if (only.length) files = files.filter((f) => only.includes(f.replace(/\.svg$/, '')));

const tile = 220;
const cols = Math.min(5, Math.max(1, files.length));
const rows = Math.ceil(files.length / cols);
const W = cols * tile;
const H = rows * (tile + 24);
let body = '';
files.forEach((f, i) => {
  const x = (i % cols) * tile;
  const y = Math.floor(i / cols) * (tile + 24);
  const src = readFileSync(join(dir, f), 'utf8');
  const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  body += `<rect x="${x + 6}" y="${y + 6}" width="${tile - 12}" height="${tile - 12}" rx="16" fill="#e4eef2"/>`;
  body += `<svg x="${x + 10}" y="${y + 10}" width="${tile - 20}" height="${tile - 20}" viewBox="0 0 200 200">${inner}</svg>`;
  body += `<text x="${x + tile / 2}" y="${y + tile + 12}" font-family="Helvetica" font-size="16" text-anchor="middle" fill="#333">${f.replace('.svg', '')} (${(src.length / 1024).toFixed(1)}KB)</text>`;
});
const S = Math.max(W, H); // Quick Look crops non-square sheets, so keep the canvas square
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" fill="#ffffff"/>${body}</svg>`;
const name = only.length ? `sheet-${only.join('_').slice(0, 60)}` : 'sheet-all';
const svgPath = join(outDir, `${name}.svg`);
writeFileSync(svgPath, sheet);
execFileSync('qlmanage', ['-t', '-s', String(Math.max(W, H)), '-o', outDir, svgPath], { stdio: 'ignore' });
console.log(join(outDir, `${name}.svg.png`));
