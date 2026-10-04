// Turns the single-file build (dist/index.html) into the Artifact page format:
// no doctype/html/head/body wrappers (the host adds them), <title> and <style> first.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '..', 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');

const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '';
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? '').replace(/<script[^>]*>[\s\S]*?<\/script>/g, '').trim();

const out = [title, ...styles, body, ...scripts].join('\n');
writeFileSync(join(dist, 'artifact.html'), out);
console.log(`dist/index.html ${(html.length / 1024).toFixed(0)} KB, dist/artifact.html ${(out.length / 1024).toFixed(0)} KB`);
