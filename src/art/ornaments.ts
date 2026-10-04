// Card back ornament, team emblems and small UI icons (all inline SVG strings).

const INK = '#3a2618';

/** Budding cross in a ring, as carved on Armenian khachkars. Gold on the lapis card back. */
export const CARD_BACK_ORNAMENT = (() => {
  const lobe = (cx: number, cy: number) => `<circle cx="${cx}" cy="${cy}" r="6.2"/>`;
  const tip = (x: number, y: number, dx: number, dy: number) => {
    // three lobes at the end of an arm pointing in direction (dx, dy)
    const px = -dy, py = dx;
    return lobe(x + dx * 2, y + dy * 2) + lobe(x - dx * 4 + px * 7, y - dy * 4 + py * 7) + lobe(x - dx * 4 - px * 7, y - dy * 4 - py * 7);
  };
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<circle cx="50" cy="50" r="44" fill="none" stroke="#f6d779" stroke-width="2.5" opacity=".7"/>` +
    `<circle cx="50" cy="50" r="39" fill="none" stroke="#f6d779" stroke-width="1.2" stroke-dasharray="2 4" opacity=".7"/>` +
    `<g fill="#e8b33a" stroke="#7a5512" stroke-width="1.6">` +
    `<path d="M45 22 H55 V45 H78 V55 H55 V80 H45 V55 H22 V45 H45 Z"/>` +
    tip(50, 20, 0, -1) + tip(50, 82, 0, 1) + tip(20, 50, -1, 0) + tip(80, 50, 1, 0) +
    `</g>` +
    `<circle cx="50" cy="50" r="6" fill="#d9432b" stroke="#7a5512" stroke-width="1.6"/>` +
    `</svg>`
  );
})();

/** Tiny repeating diamond lattice for the card back field. */
export const CARD_BACK_TILE =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">` +
  `<path d="M10 2 L18 10 L10 18 L2 10 Z" fill="none" stroke="#f6d779" stroke-width=".9" opacity=".22"/>` +
  `<circle cx="10" cy="10" r="1.3" fill="#f6d779" opacity=".35"/></svg>`;

/** Team 1: pomegranate. */
export const POMEGRANATE =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
  `<path d="M24 14 L27 6 L32 12 L37 6 L40 14 Z" fill="#a82f1c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
  `<circle cx="32" cy="36" r="22" fill="#d9432b" stroke="${INK}" stroke-width="3"/>` +
  `<path d="M20 28 Q24 20 32 18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>` +
  `<circle cx="38" cy="42" r="3" fill="#a82f1c"/><circle cx="30" cy="46" r="3" fill="#a82f1c"/><circle cx="42" cy="34" r="3" fill="#a82f1c"/>` +
  `</svg>`;

/** Team 2: bunch of grapes. */
export const GRAPES = (() => {
  const g = [[24, 26], [34, 26], [44, 26], [29, 35], [39, 35], [34, 44], [24, 44], [44, 44], [29, 52], [39, 52], [34, 60]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y - 4}" r="6.5" fill="#7a4a9e" stroke="${INK}" stroke-width="2.4"/>`)
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<path d="M34 16 Q34 8 40 4" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M38 10 C46 2 58 6 58 14 C50 18 42 16 38 10 Z" fill="#3f9a5a" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` +
    g +
    `<circle cx="22" cy="20" r="2" fill="#fff" opacity=".6"/></svg>`
  );
})();

export const TEAM_EMBLEMS = [POMEGRANATE, GRAPES] as const;

const icon = (d: string, extra = '') =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${d}${extra}</svg>`;

export const ICONS = {
  pause: icon('<path d="M9 5v14M15 5v14"/>'),
  play: icon('<path d="M8 5l11 7-11 7z" fill="currentColor"/>'),
  soundOn: icon('<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  soundOff: icon('<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  musicOn: icon('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/>'),
  musicOff: icon('<path d="M9 18V5l11-2v13" opacity=".45"/><circle cx="6" cy="18" r="3" fill="currentColor" opacity=".45"/><circle cx="17" cy="16" r="3" fill="currentColor" opacity=".45"/><path d="M3 3l18 18"/>'),
  fullscreen: icon('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  close: icon('<path d="M6 6l12 12M18 6L6 18"/>'),
  book: icon('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>'),
  swap: icon('<path d="M4 8h14l-4-4M20 16H6l4 4"/>'),
  flag: icon('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  restart: icon('<path d="M4 12a8 8 0 1 0 2.5-5.8L4 8.5"/><path d="M4 3.5v5h5"/>'),
  eye: icon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
};

export const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
