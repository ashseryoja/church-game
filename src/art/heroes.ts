// Parametric bust portraits for the 25 Bible heroes.
// One shared face/body template keeps the whole set consistent; each hero gets
// its own hair, beard, headwear, clothes and a few distinguishing details.
// Output: standalone SVG strings (viewBox 0 0 200 200) in the same ink-and-manuscript
// style as the object pictures (see docs/art-style.md).

const INK = '#3a2618';

const C = {
  lapis: '#2c5aa0', lapisL: '#6f9ad8', lapisD: '#1d3f75',
  verm: '#d9432b', vermL: '#f07a5f', vermD: '#a82f1c',
  gold: '#e8b33a', goldL: '#f6d779', goldD: '#b9831c',
  mal: '#3f9a5a', malL: '#8cc97a', malD: '#2a6e3e',
  brown: '#8a5a36', brownL: '#b88457', brownD: '#5e3b22',
  stone: '#b9ad9c', stoneL: '#ddd3c3',
  sky: '#5fb3d9', skyL: '#a9dcef',
  purple: '#7a4a9e', purpleL: '#a77cc8', purpleD: '#56317a',
  cream: '#f6e7c8', white: '#fffaf0',
  camel: '#c99a5b', bronze: '#c98a3a', teal: '#2a9d8f', ochre: '#d98e2b', maroon: '#8e2c3c',
};

const SKIN = { light: '#f3cfab', mid: '#e9b98f', tan: '#d9a274', deep: '#c98d61' };
const HAIR = {
  white: '#f7f3ea', gray: '#bdb7ae', black: '#33241c', dark: '#4a2f1f', brown: '#7a4e2c', auburn: '#b05a2a',
};

type HairStyle = 'short' | 'curly' | 'long' | 'bald' | 'balding' | 'wild' | 'parted' | 'none' | 'locks';
type Beard = 'stubble' | 'short' | 'medium' | 'long' | 'veryLong' | 'pointed';
type Head =
  | { kind: 'turban'; color: string; band: string }
  | { kind: 'royalTurban'; color: string }
  | { kind: 'veil'; color: string; trim?: string; inner?: string }
  | { kind: 'scarf'; color: string; dots: string }
  | { kind: 'helmet' }
  | { kind: 'headband'; color: string }
  | { kind: 'nemes' }
  | { kind: 'tallHat'; color: string };
type Extra = 'armor' | 'apron' | 'goldCollar' | 'necklace' | 'jewelNecklace' | 'strap' | 'trim' | 'fur' | 'forehead' | 'shine' | 'earrings';

interface Look {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  beard?: Beard;
  beardColor?: string;
  elder?: boolean;
  young?: boolean;
  female?: boolean;
  bushyBrows?: boolean;
  robe: string;
  tunic: string;
  mantle?: string;
  mantleTrim?: string;
  head?: Head;
  extras?: Extra[];
  broad?: boolean;
}

const stroke = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const fillPath = (d: string, fill: string, w = 4, extra = '') => `<path d="${d}" fill="${fill}" ${stroke(w)}${extra}/>`;
const line = (d: string, color = INK, w = 2.5, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const shade = (d: string, op = 0.12) => `<path d="${d}" fill="${INK}" opacity="${op}"/>`;
const mirror = (svg: string) => `<g transform="translate(200 0) scale(-1 1)">${svg}</g>`;
const both = (svg: string) => svg + mirror(svg);

// ---------- body ----------
function body(l: Look): string {
  const shoulders = l.broad
    ? 'M10 206 C12 160 42 141 84 137 L116 137 C158 141 188 160 190 206 Z'
    : 'M22 206 C24 165 48 144 86 138 L114 138 C152 144 176 165 178 206 Z';
  let s = '';
  if (l.extras?.includes('fur')) {
    // camel-hair garment with a shaggy neckline
    s += fillPath(shoulders, C.camel);
    s += fillPath('M80 137 L86 146 L92 138 L97 148 L103 138 L108 148 L114 138 L120 146 L124 137 Z', C.camel, 2.5);
    for (const [x, y] of [[44, 172], [60, 160], [146, 166], [132, 180], [56, 190], [150, 192], [70, 178], [126, 158]]) {
      s += line(`M${x} ${y} l4 8 M${x + 7} ${y - 2} l3 8`, C.brownD, 2.5, ' opacity=".55"');
    }
  } else {
    s += fillPath(shoulders, l.robe);
    s += fillPath('M86 138 L100 164 L114 138 Z', l.tunic, 3);
    s += line('M62 178 Q66 192 63 206 M138 178 Q134 192 137 206', INK, 2.5, ' opacity=".35"');
  }
  if (l.mantle) {
    s += fillPath('M22 206 C24 165 48 144 86 138 L104 174 L92 206 Z', l.mantle);
    if (l.mantleTrim) s += line('M81 145 L96 174 L85 204', l.mantleTrim, 5);
    s += line('M50 168 Q62 182 60 204', INK, 2.5, ' opacity=".3"');
  }
  if (l.extras?.includes('trim')) s += line('M87 140 L100 162 L113 140', C.gold, 5);
  if (l.extras?.includes('strap')) {
    s += line('M64 150 L136 210', INK, 13);
    s += line('M64 150 L136 210', C.brown, 8);
  }
  if (l.extras?.includes('fur')) {
    s += line('M62 152 L138 212', INK, 13);
    s += line('M62 152 L138 212', C.brownD, 8);
  }
  if (l.extras?.includes('armor')) {
    s += fillPath('M58 206 L58 166 C70 152 130 152 142 166 L142 206 Z', C.bronze);
    s += line('M60 178 Q100 168 140 178 M60 192 Q100 182 140 192', INK, 2.5);
    s += `<circle cx="100" cy="166" r="6" fill="${C.goldL}" ${stroke(2.5)}/>`;
    s += both(fillPath('M24 196 C26 170 40 154 60 150 L66 168 C48 174 40 186 38 200 Z', C.bronze, 3.5));
  }
  if (l.extras?.includes('apron')) {
    s += line('M84 154 L92 139 M116 154 L108 139', C.white, 5);
    s += fillPath('M78 154 L122 154 L130 206 L70 206 Z', C.white, 3.5);
    s += fillPath('M88 176 L112 176 L112 190 L88 190 Z', C.cream, 2.5);
  }
  if (l.extras?.includes('goldCollar')) {
    s += fillPath('M62 144 C70 178 130 178 138 144 L120 140 C114 160 86 160 80 140 Z', C.gold, 3.5);
    s += line('M70 150 C80 170 120 170 130 150', C.lapis, 5);
    s += line('M76 146 C86 162 114 162 124 146', C.vermL, 3);
  }
  if (l.extras?.includes('necklace')) {
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI * (0.15 + (0.7 * i) / 6);
      s += `<circle cx="${(100 - Math.cos(a) * 20).toFixed(1)}" cy="${(138 + Math.sin(a) * 18).toFixed(1)}" r="3.4" fill="${C.gold}" ${stroke(1.6)}/>`;
    }
  }
  if (l.extras?.includes('jewelNecklace')) {
    s += line('M78 142 Q100 166 122 142', C.gold, 4);
    s += `<path d="M100 156 L106 163 L100 172 L94 163 Z" fill="${C.verm}" ${stroke(2)}/>`;
  }
  return s;
}

// ---------- hair behind the head ----------
function backHair(l: Look): string {
  const c = l.hair;
  switch (l.hairStyle) {
    case 'long':
      return fillPath('M66 78 C52 108 52 142 60 168 L140 168 C148 142 148 108 134 78 C128 52 72 52 66 78 Z', c);
    case 'locks':
      return fillPath('M66 78 C50 110 48 150 56 178 L144 178 C152 150 150 110 134 78 C128 50 72 50 66 78 Z', c);
    case 'wild': {
      let d = '';
      const pts: [number, number][] = [];
      for (let i = 0; i <= 16; i++) {
        const a = ((150 + i * 15) * Math.PI) / 180;
        const r = i % 2 === 0 ? 46 : 58;
        pts.push([100 + Math.cos(a) * r, 86 + Math.sin(a) * r * 1.05]);
      }
      pts.push([146, 146], [136, 140], [64, 140], [54, 146]);
      d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z';
      return fillPath(d, c);
    }
    case 'balding':
      return both(fillPath('M66 64 C54 78 54 104 64 118 L74 114 L74 70 Z', c, 3.5));
    case 'curly':
      return both(
        [ [64, 96], [62, 110] ].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${c}" ${stroke(3.5)}/>`).join(''),
      );
    default:
      return '';
  }
}

// ---------- side locks in front of the shoulders ----------
function locks(l: Look): string {
  if (l.hairStyle === 'long') {
    return both(fillPath('M70 84 C58 110 58 144 64 170 C70 176 80 174 84 166 C78 140 76 112 78 94 Z', l.hair, 3.5));
  }
  if (l.hairStyle === 'locks') {
    // Samson's long braided locks
    let s = '';
    for (const [x, len] of [[62, 92], [74, 100]] as const) {
      const d = `M${x} 90 C${x - 8} 120 ${x + 6} 150 ${x - 2} ${90 + len}`;
      s += line(d, INK, 13) + line(d, l.hair, 8);
      for (let k = 1; k <= 5; k++) {
        const y = 90 + (k * len) / 6;
        s += line(`M${x - 5} ${y.toFixed(0)} l8 4`, INK, 2, ' opacity=".5"');
      }
    }
    return both(s);
  }
  return '';
}

// ---------- head ----------
const FACE = 'M100 49 C121 49 134 64 134 88 C134 110 120 126 100 126 C80 126 66 110 66 88 C66 64 79 49 100 49 Z';

function head(l: Look): string {
  let s = '';
  s += fillPath('M88 110 L88 144 L112 144 L112 110 Z', l.skin, 3.5);
  s += shade('M89 118 Q100 130 111 118 L111 112 L89 112 Z', 0.16);
  s += both(`<ellipse cx="66" cy="92" rx="6.5" ry="9.5" fill="${l.skin}" ${stroke(3.5)}/>` + line('M66 87 Q63 92 66 97', INK, 2, ' opacity=".5"'));
  s += fillPath(FACE, l.skin);
  return s;
}

// ---------- hair on top of the head ----------
function frontHair(l: Look): string {
  const c = l.hair;
  switch (l.hairStyle) {
    case 'short':
    case 'long':
    case 'locks':
      return fillPath('M66 90 C62 60 80 44 100 44 C122 44 139 60 134 90 C130 76 124 68 114 64 C108 70 94 72 84 68 C76 72 70 80 66 90 Z', c);
    case 'curly': {
      let s = `<path d="M66 86 C62 56 80 44 100 44 C120 44 138 56 134 86 C126 72 114 66 100 66 C86 66 74 72 66 86 Z" fill="${c}"/>`;
      for (let i = 0; i <= 8; i++) {
        const a = ((192 + i * 19.5) * Math.PI) / 180;
        s += `<circle cx="${(100 + Math.cos(a) * 33).toFixed(1)}" cy="${(80 + Math.sin(a) * 31).toFixed(1)}" r="10.5" fill="${c}" ${stroke(3.5)}/>`;
      }
      return s;
    }
    case 'wild':
      return fillPath('M66 86 L70 64 L80 72 L84 54 L94 66 L100 50 L108 66 L118 54 L120 72 L130 64 L134 86 C126 72 112 66 100 66 C88 66 74 72 66 86 Z', c);
    case 'parted':
      return fillPath('M100 56 C84 56 72 66 68 86 L76 88 C80 72 90 64 100 62 C110 64 120 72 124 88 L132 86 C128 66 116 56 100 56 Z', c, 3);
    default:
      return '';
  }
}

// ---------- face ----------
function face(l: Look): string {
  let s = '';
  const browC = l.bushyBrows ? (l.beardColor ?? l.hair) : l.hair === HAIR.white || l.hair === HAIR.gray ? '#8f867c' : l.hair;
  if (l.bushyBrows) {
    s += line('M78 78 Q87 72 95 78 M105 78 Q113 72 122 78', INK, 9);
    s += line('M78 78 Q87 72 95 78 M105 78 Q113 72 122 78', browC, 5.5);
  } else {
    s += line('M80 78 Q87 74 94 78 M106 78 Q113 74 120 78', browC === l.skin ? INK : browC, 3.5);
  }
  const rx = l.young ? 5 : 4.5;
  const ry = l.young ? 6.2 : 5.5;
  s += `<ellipse cx="87" cy="91" rx="${rx}" ry="${ry}" fill="${INK}"/><ellipse cx="113" cy="91" rx="${rx}" ry="${ry}" fill="${INK}"/>`;
  s += `<circle cx="88.8" cy="88.8" r="1.7" fill="#fff"/><circle cx="114.8" cy="88.8" r="1.7" fill="#fff"/>`;
  if (l.female) s += line('M82.5 87 L78.5 84 M117.5 87 L121.5 84', INK, 2.5);
  s += `<circle cx="78" cy="103" r="7" fill="#f08f7a" opacity=".45"/><circle cx="122" cy="103" r="7" fill="#f08f7a" opacity=".45"/>`;
  if (l.elder) s += line('M88 64 Q100 60 112 64 M91 70 Q100 67 109 70', INK, 2, ' opacity=".3"');
  if (!l.beard || l.beard === 'stubble') {
    if (l.beard === 'stubble') s += shade('M70 100 C72 118 86 128 100 128 C114 128 128 118 130 100 C124 112 114 116 100 116 C86 116 76 112 70 100 Z', 0.16);
    s += `<path d="M90 109 Q100 120 110 109 Q100 113 90 109 Z" fill="${l.female ? '#c4473e' : '#8f2f22'}" ${stroke(2.5)}/>`;
  }
  return s;
}

function beard(l: Look): string {
  if (!l.beard || l.beard === 'stubble') return '';
  const c = l.beardColor ?? l.hair;
  const top = 'C128 104 120 110 112 110 L88 110 C80 110 72 104';
  const shapes: Record<Exclude<Beard, 'stubble'>, string> = {
    short: `M68 94 C68 118 82 134 100 134 C118 134 132 118 132 94 ${top} 68 94 Z`,
    medium: `M67 92 C66 124 80 148 100 150 C120 148 134 124 133 92 ${top} 67 92 Z`,
    long: `M66 90 C64 128 78 158 100 170 C122 158 136 128 134 90 ${top} 66 90 Z`,
    veryLong: `M65 88 C58 130 68 168 84 190 Q92 184 100 194 Q108 184 116 190 C132 168 142 130 135 88 ${top} 65 88 Z`,
    pointed: `M67 92 C66 126 84 160 100 184 C116 160 134 126 133 92 ${top} 67 92 Z`,
  };
  let s = fillPath(shapes[l.beard], c);
  const len = { short: 128, medium: 142, long: 160, veryLong: 178, pointed: 170 }[l.beard];
  s += line(`M86 124 Q89 ${len - 10} 87 ${len - 4} M100 128 L100 ${len} M114 124 Q111 ${len - 10} 113 ${len - 4}`, INK, 2.2, ' opacity=".28"');
  s += fillPath('M81 112 C87 103 96 103 100 107 C104 103 113 103 119 112 C112 115 106 115 100 112 C94 115 88 115 81 112 Z', c, 2.5);
  s += `<path d="M94 118 Q100 123 106 118 Z" fill="#8f2f22" ${stroke(2)}/>`;
  return s;
}

const nose = (l: Look) => line('M100 93 C104.5 99 104.5 102 98 103.5', INK, 2.5) + (l.extras?.includes('shine') ? `<ellipse cx="88" cy="60" rx="9" ry="5" fill="#fff" opacity=".45" transform="rotate(-20 88 60)"/>` : '');

// ---------- headwear ----------
function headwear(l: Look): string {
  const h = l.head;
  if (!h) return '';
  switch (h.kind) {
    case 'turban':
    case 'royalTurban': {
      const color = h.color;
      let s = fillPath('M60 84 C54 52 76 32 100 32 C124 32 146 52 140 84 C128 72 114 68 100 68 C86 68 72 72 60 84 Z', color);
      s += line('M70 50 Q100 62 132 46 M64 66 Q98 52 136 66', INK, 2.5, ' opacity=".45"');
      if (h.kind === 'turban') {
        s += line('M63 76 C76 66 88 62 100 62 C112 62 124 66 137 76', h.band, 6);
      } else {
        s += line('M63 77 C76 67 88 63 100 63 C112 63 124 67 137 77', C.gold, 8);
        s += `<circle cx="100" cy="58" r="9" fill="${C.gold}" ${stroke(3)}/><circle cx="100" cy="58" r="5" fill="${C.verm}"/>`;
        s += fillPath('M100 47 C96 36 104 26 112 22 C108 32 106 40 100 47 Z', C.white, 2.5);
      }
      return s;
    }
    case 'veil': {
      const outer = 'M100 36 C130 36 146 58 144 92 C143 120 152 156 172 210 L28 210 C48 156 57 120 56 92 C54 58 70 36 100 36 Z';
      const inner = 'M100 56 C80 56 69 68 69 90 C69 110 77 123 88 131 L88 210 L112 210 L112 131 C123 123 131 110 131 90 C131 68 120 56 100 56 Z';
      let s = '';
      if (h.inner) s += fillPath('M100 50 C80 50 64 64 64 90 L72 90 C72 70 84 60 100 60 C116 60 128 70 128 90 L136 90 C136 64 120 50 100 50 Z', h.inner, 3);
      s += `<path d="${outer} ${inner}" fill="${h.color}" fill-rule="evenodd" ${stroke(4)}/>`;
      if (h.trim) s += line('M88 132 C77 123 69 110 69 90 C69 68 80 56 100 56 C120 56 131 68 131 90 C131 110 123 123 112 132', h.trim, 4, ' opacity=".95"');
      s += line('M70 128 Q64 164 52 204 M130 128 Q136 164 148 204', INK, 2.5, ' opacity=".35"');
      return s;
    }
    case 'scarf': {
      let s = fillPath('M62 92 C56 56 78 38 100 38 C122 38 144 56 138 92 C134 76 124 66 112 62 C104 66 96 66 88 62 C76 66 66 76 62 92 Z', h.color);
      for (const [x, y] of [[80, 50], [100, 46], [120, 50], [90, 58], [110, 58], [70, 64], [130, 64]]) {
        s += `<circle cx="${x}" cy="${y}" r="3" fill="${h.dots}"/>`;
      }
      s += fillPath('M136 80 C146 82 152 90 150 98 C144 100 138 94 136 88 Z', h.color, 3);
      s += fillPath('M146 96 L158 122 L148 124 L142 100 Z', h.color, 3);
      return s;
    }
    case 'helmet': {
      let s = fillPath('M78 42 C80 16 120 16 122 42 Q100 34 78 42 Z', C.verm, 3.5);
      s += line('M86 40 Q90 26 100 24 M114 40 Q110 26 100 24', INK, 2, ' opacity=".4"');
      s += both(fillPath('M62 82 L60 110 Q66 118 72 110 L72 84 Z', C.bronze, 3.5));
      s += fillPath('M60 86 C56 52 78 36 100 36 C122 36 144 52 140 86 C128 74 114 70 100 70 C86 70 72 74 60 86 Z', C.bronze);
      s += line('M62 80 C76 70 88 67 100 67 C112 67 124 70 138 80', C.goldD, 6);
      s += `<ellipse cx="86" cy="50" rx="8" ry="4" fill="#fff" opacity=".4" transform="rotate(-25 86 50)"/>`;
      return s;
    }
    case 'headband':
      return (
        fillPath('M66 70 C80 62 120 62 134 70 L134 79 C120 71 80 71 66 79 Z', h.color, 3) +
        fillPath('M132 74 L148 88 L142 94 L130 80 Z', h.color, 3) +
        fillPath('M132 76 L150 76 L148 84 Z', h.color, 3)
      );
    case 'nemes': {
      const outer = 'M100 36 C126 36 144 52 144 80 L154 154 L46 154 L56 80 C56 52 74 36 100 36 Z';
      const inner = 'M100 72 C80 72 68 80 68 94 C68 112 78 126 88 132 L88 154 L112 154 L112 132 C122 126 132 112 132 94 C132 80 120 72 100 72 Z';
      let s = `<path d="${outer} ${inner}" fill="${C.lapis}" fill-rule="evenodd" ${stroke(4)}/>`;
      for (const y of [92, 106, 120, 134, 148]) {
        const xe = 56 - ((y - 80) * 10) / 74;
        s += both(line(`M${(xe + 3).toFixed(1)} ${y} L${y < 128 ? 67 : 86} ${y}`, C.gold, 4));
      }
      s += line('M66 56 Q100 34 134 56', C.gold, 4) + line('M60 68 Q100 46 140 68', C.gold, 4);
      s += fillPath('M64 74 C80 64 120 64 136 74 L136 82 C120 72 80 72 64 82 Z', C.gold, 3);
      return s;
    }
    case 'tallHat': {
      let s = fillPath('M68 74 C68 44 80 18 100 10 C120 18 132 44 132 74 C120 68 80 68 68 74 Z', h.color);
      s += fillPath('M66 66 C84 58 116 58 134 66 L134 78 C116 70 84 70 66 78 Z', C.gold, 3);
      for (const [x, y] of [[92, 34], [108, 44], [96, 52]]) s += `<circle cx="${x}" cy="${y}" r="2.6" fill="${C.goldL}"/>`;
      return s;
    }
  }
}

function frontExtras(l: Look): string {
  let s = '';
  if (l.extras?.includes('forehead')) {
    s += line('M84 60 Q100 70 116 60', C.gold, 3);
    s += `<path d="M100 66 L104 71 L100 77 L96 71 Z" fill="${C.verm}" ${stroke(2)}/>`;
  }
  if (l.extras?.includes('earrings')) {
    s += both(`<circle cx="70" cy="118" r="4.5" fill="none" stroke="${C.gold}" stroke-width="3"/>`);
  }
  return s;
}

function portrait(l: Look): string {
  const halo = `<circle cx="100" cy="100" r="88" fill="${C.goldL}" opacity=".35"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
    halo +
    backHair(l) +
    body(l) +
    locks(l) +
    head(l) +
    frontHair(l) +
    face(l) +
    headwear(l) +
    beard(l) +
    nose(l) +
    frontExtras(l) +
    `</svg>`
  );
}

// ---------- the 25 heroes ----------
const LOOKS: Record<string, Look> = {
  noah: {
    skin: SKIN.mid, hair: HAIR.white, hairStyle: 'none', beard: 'veryLong', beardColor: HAIR.white, elder: true, bushyBrows: true,
    robe: C.brown, tunic: C.cream, mantle: C.mal, mantleTrim: C.malL,
    head: { kind: 'veil', color: C.brownL, inner: HAIR.white },
  },
  abraham: {
    skin: SKIN.tan, hair: HAIR.gray, hairStyle: 'short', beard: 'long', beardColor: HAIR.gray, elder: true, bushyBrows: true,
    robe: C.verm, tunic: C.cream, mantle: C.cream, mantleTrim: C.vermD,
    head: { kind: 'turban', color: C.white, band: C.vermD },
  },
  moses: {
    skin: SKIN.mid, hair: HAIR.white, hairStyle: 'long', beard: 'long', beardColor: HAIR.white, elder: true, bushyBrows: true,
    robe: C.vermD, tunic: C.cream, mantle: C.brownL, mantleTrim: C.gold,
  },
  joshua: {
    skin: SKIN.tan, hair: HAIR.dark, hairStyle: 'short', beard: 'short', beardColor: HAIR.dark,
    robe: C.verm, tunic: C.cream, head: { kind: 'helmet' }, extras: ['armor'],
  },
  gideon: {
    skin: SKIN.tan, hair: HAIR.brown, hairStyle: 'short', beard: 'short', beardColor: HAIR.brown,
    robe: C.malD, tunic: C.cream, head: { kind: 'headband', color: C.ochre }, extras: ['strap'],
  },
  samson: {
    skin: SKIN.deep, hair: HAIR.black, hairStyle: 'locks', beard: 'short', beardColor: HAIR.black, broad: true,
    robe: C.brownL, tunic: C.skyL, extras: ['strap'],
  },
  david: {
    skin: SKIN.light, hair: HAIR.auburn, hairStyle: 'curly', young: true,
    robe: C.sky, tunic: C.cream, extras: ['strap'],
  },
  solomon: {
    skin: SKIN.tan, hair: HAIR.black, hairStyle: 'short', beard: 'medium', beardColor: HAIR.black,
    robe: C.purple, tunic: C.goldL, mantle: C.purpleD, mantleTrim: C.gold,
    head: { kind: 'royalTurban', color: C.white }, extras: ['trim', 'necklace'],
  },
  elijah: {
    skin: SKIN.tan, hair: HAIR.gray, hairStyle: 'wild', beard: 'long', beardColor: HAIR.gray, elder: true, bushyBrows: true,
    robe: C.stone, tunic: C.cream, mantle: C.brownD, mantleTrim: C.brown,
  },
  elisha: {
    skin: SKIN.mid, hair: HAIR.brown, hairStyle: 'bald', beard: 'medium', beardColor: HAIR.brown,
    robe: C.cream, tunic: C.stoneL, mantle: C.brown, mantleTrim: C.brownD, extras: ['shine'],
  },
  daniel: {
    skin: SKIN.light, hair: HAIR.black, hairStyle: 'short', young: true,
    robe: C.lapis, tunic: C.goldL, head: { kind: 'turban', color: C.skyL, band: C.lapis }, extras: ['trim'],
  },
  jonah: {
    skin: SKIN.mid, hair: HAIR.brown, hairStyle: 'curly', beard: 'medium', beardColor: HAIR.brown,
    robe: C.teal, tunic: C.cream, mantle: C.skyL, mantleTrim: C.lapis,
  },
  esther: {
    skin: SKIN.light, hair: HAIR.black, hairStyle: 'parted', female: true, young: true,
    robe: C.purple, tunic: C.goldL, head: { kind: 'veil', color: C.purpleL, trim: C.gold },
    extras: ['jewelNecklace', 'forehead'],
  },
  joseph: {
    skin: SKIN.tan, hair: HAIR.black, hairStyle: 'none', young: true,
    robe: C.white, tunic: C.white, head: { kind: 'nemes' }, extras: ['goldCollar'],
  },
  ruth: {
    skin: SKIN.mid, hair: HAIR.brown, hairStyle: 'long', female: true, young: true,
    robe: C.mal, tunic: C.cream, head: { kind: 'scarf', color: C.ochre, dots: C.goldL },
  },
  peter: {
    skin: SKIN.mid, hair: HAIR.gray, hairStyle: 'balding', beard: 'short', beardColor: HAIR.gray, elder: true,
    robe: C.lapis, tunic: C.cream, mantle: C.gold, mantleTrim: C.goldD, extras: ['shine'],
  },
  thomas: {
    skin: SKIN.tan, hair: HAIR.dark, hairStyle: 'curly', beard: 'short', beardColor: HAIR.dark,
    robe: C.malL, tunic: C.cream, mantle: C.mal, mantleTrim: C.malD,
  },
  matthew: {
    skin: SKIN.mid, hair: HAIR.brown, hairStyle: 'short', beard: 'medium', beardColor: HAIR.brown,
    robe: C.ochre, tunic: C.cream, mantle: C.vermD, mantleTrim: C.gold,
    head: { kind: 'headband', color: C.lapis },
  },
  paul: {
    skin: SKIN.tan, hair: HAIR.dark, hairStyle: 'balding', beard: 'pointed', beardColor: HAIR.dark,
    robe: C.mal, tunic: C.cream, mantle: C.verm, mantleTrim: C.vermD, extras: ['shine'],
  },
  'john-baptist': {
    skin: SKIN.deep, hair: HAIR.black, hairStyle: 'wild', beard: 'long', beardColor: HAIR.black,
    robe: C.camel, tunic: C.camel, extras: ['fur'],
  },
  mary: {
    skin: SKIN.light, hair: HAIR.dark, hairStyle: 'parted', female: true, young: true,
    robe: C.verm, tunic: C.cream, head: { kind: 'veil', color: C.lapis, trim: C.gold, inner: C.white },
  },
  martha: {
    skin: SKIN.mid, hair: HAIR.brown, hairStyle: 'parted', female: true,
    robe: C.lapisL, tunic: C.cream, head: { kind: 'scarf', color: C.verm, dots: C.white }, extras: ['apron'],
  },
  zacchaeus: {
    skin: SKIN.tan, hair: HAIR.black, hairStyle: 'short', beard: 'short', beardColor: HAIR.black,
    robe: C.purple, tunic: C.gold, mantle: C.gold, mantleTrim: C.verm,
    head: { kind: 'turban', color: C.gold, band: C.purple }, extras: ['trim'],
  },
  'samaritan-woman': {
    skin: SKIN.tan, hair: HAIR.black, hairStyle: 'parted', female: true,
    robe: C.maroon, tunic: C.cream, head: { kind: 'veil', color: C.teal, trim: C.ochre }, extras: ['necklace'],
  },
  balaam: {
    skin: SKIN.mid, hair: HAIR.gray, hairStyle: 'long', beard: 'veryLong', beardColor: HAIR.gray, elder: true, bushyBrows: true,
    robe: C.lapisD, tunic: C.cream, mantle: C.purpleD, mantleTrim: C.gold,
    head: { kind: 'tallHat', color: C.purple },
  },
};

const cache = new Map<string, string>();

export function heroSvg(pairId: string): string {
  let svg = cache.get(pairId);
  if (!svg) {
    const look = LOOKS[pairId];
    if (!look) throw new Error(`No portrait for ${pairId}`);
    svg = portrait(look);
    cache.set(pairId, svg);
  }
  return svg;
}

export const HERO_IDS = Object.keys(LOOKS);
