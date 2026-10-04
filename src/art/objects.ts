// Object pictures: hand-drawn SVG files in ./objects, bundled as strings.
const files = import.meta.glob('./objects/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const byId: Record<string, string> = {};
for (const [path, svg] of Object.entries(files)) {
  const id = path.replace('./objects/', '').replace('.svg', '');
  byId[id] = svg.trim();
}

const MISSING =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="30" y="30" width="140" height="140" rx="20" fill="#ddd3c3" stroke="#3a2618" stroke-width="4"/></svg>';

export function objectSvg(id: string): string {
  return byId[id] ?? MISSING;
}

export const OBJECT_IDS = Object.keys(byId);
