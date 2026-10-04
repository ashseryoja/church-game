// Renders all hero portraits on parchment tiles into one PNG (macOS Quick Look) for review.
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { heroSvg, HERO_IDS } from '../src/art/heroes.ts';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(process.argv[2] ?? join(root, '.sheet'));
const ids = process.argv.slice(3).length ? process.argv.slice(3) : HERO_IDS;
mkdirSync(outDir, { recursive: true });
const tile = 220, cols = Math.min(5, ids.length), rows = Math.ceil(ids.length / cols);
const W = cols * tile, H = rows * (tile + 24);
let body = '';
ids.forEach((id, i) => {
  const x = (i % cols) * tile, y = Math.floor(i / cols) * (tile + 24);
  const inner = heroSvg(id).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  body += `<rect x="${x + 6}" y="${y + 6}" width="${tile - 12}" height="${tile - 12}" rx="16" fill="#fbefd6"/>`;
  body += `<svg x="${x + 10}" y="${y + 10}" width="${tile - 20}" height="${tile - 20}" viewBox="0 0 200 200">${inner}</svg>`;
  body += `<text x="${x + tile / 2}" y="${y + tile + 12}" font-family="Helvetica" font-size="16" text-anchor="middle" fill="#333">${id}</text>`;
});
const S = Math.max(W, H); // Quick Look crops non-square sheets, so keep the canvas square
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" fill="#fff"/>${body}</svg>`;
const p = join(outDir, 'heroes.svg');
writeFileSync(p, svg);
execFileSync('qlmanage', ['-t', '-s', String(Math.max(W, H)), '-o', outDir, p], { stdio: 'ignore' });
console.log(p + '.png');
