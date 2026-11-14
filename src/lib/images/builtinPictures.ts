/**
 * Pictures that ship with the app (no upload, no storage): an outline map
 * of Georgia and a few simple line drawings used by the sample tests.
 * A question refers to one with the image id "builtin:<name>".
 *
 * Everything here is drawn by us (original), black on white, with no words
 * on it (labels are the students' job). Plain data — no React.
 */

export const BUILTIN_PREFIX = "builtin:";

export type BuiltinPicture = { width: number; height: number; svg: string };

const svg = (width: number, height: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect width="${width}" height="${height}" fill="#fff" stroke="none"/>${body}</svg>`;

// ---------------------------------------------------------------------------
// Outline map of Georgia (simplified), from longitude / latitude
// ---------------------------------------------------------------------------

const WEST = 39.3;
const NORTH = 43.75;
const SCALE = 100;
const LON_FACTOR = Math.cos((42 * Math.PI) / 180); // degrees of longitude are shorter here

export const GEORGIA_MAP = { width: 570, height: 285 };

/** Where a place (longitude, latitude) is on the map, in px of the 570 × 285 drawing. */
export function georgiaPoint(lon: number, lat: number): { x: number; y: number } {
  return { x: Math.round((lon - WEST) * LON_FACTOR * SCALE * 10) / 10, y: Math.round((NORTH - lat) * SCALE * 10) / 10 };
}

/** The same place in % of the map (what map markers store). */
export function georgiaPercent(lon: number, lat: number): { x: number; y: number } {
  const p = georgiaPoint(lon, lat);
  return { x: Math.round((p.x / GEORGIA_MAP.width) * 1000) / 10, y: Math.round((p.y / GEORGIA_MAP.height) * 1000) / 10 };
}

/** The border, clockwise from the mouth of the Psou (simplified: a few dozen points). */
const BORDER: [number, number][] = [
  [40.0, 43.39], [40.1, 43.55], [40.55, 43.52], [41.0, 43.38], [41.45, 43.28], [41.85, 43.22], [42.3, 43.17], [42.85, 43.13],
  [43.2, 42.98], [43.6, 42.82], [43.95, 42.64], [44.3, 42.72], [44.63, 42.75], [44.9, 42.74], [45.2, 42.6], [45.7, 42.48],
  [45.95, 42.24], [46.4, 41.98], [46.72, 41.8], [46.55, 41.55], [46.45, 41.35], [46.15, 41.2], [45.75, 41.33], [45.38, 41.45],
  [45.2, 41.4], [45.05, 41.3], [44.8, 41.22], [44.5, 41.18], [44.1, 41.15], [43.85, 41.15], [43.6, 41.1], [43.45, 41.16],
  [43.2, 41.3], [42.9, 41.5], [42.6, 41.58], [42.3, 41.5], [41.95, 41.48], [41.55, 41.52],
  // Black Sea coast, south to north
  [41.62, 41.63], [41.73, 41.78], [41.78, 41.9], [41.67, 42.15], [41.6, 42.35], [41.5, 42.65], [41.25, 42.85], [41.0, 43.0],
  [40.7, 43.1], [40.27, 43.28],
];

const MTKVARI: [number, number][] = [[42.9, 41.5], [42.98, 41.64], [43.39, 41.84], [43.6, 41.99], [44.11, 41.98], [44.72, 41.84], [44.79, 41.72], [45.0, 41.55], [45.2, 41.4]];
const RIONI: [number, number][] = [[43.55, 42.62], [43.2, 42.5], [42.85, 42.35], [42.7, 42.27], [42.3, 42.2], [41.95, 42.17], [41.67, 42.15]];
const ALAZANI: [number, number][] = [[45.55, 42.32], [45.6, 42.1], [45.95, 41.8], [46.25, 41.62], [46.45, 41.35]];

const path = (points: [number, number][], close = false) =>
  points.map(([lon, lat], i) => {
    const p = georgiaPoint(lon, lat);
    return `${i === 0 ? "M" : "L"}${p.x} ${p.y}`;
  }).join(" ") + (close ? " Z" : "");

/** A city (dot), a summit (triangle), a lake (ellipse). */
const city = (lon: number, lat: number) => {
  const p = georgiaPoint(lon, lat);
  return `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#111" stroke="none"/>`;
};
const summit = (lon: number, lat: number) => {
  const p = georgiaPoint(lon, lat);
  return `<path d="M${p.x - 7} ${p.y + 5} L${p.x} ${p.y - 7} L${p.x + 7} ${p.y + 5} Z" fill="#111" stroke="none"/>`;
};
const lake = (lon: number, lat: number) => {
  const p = georgiaPoint(lon, lat);
  return `<ellipse cx="${p.x}" cy="${p.y}" rx="7" ry="4.5" fill="#fff" stroke-width="1.6"/>`;
};
const wave = (x: number, y: number) => `<path d="M${x} ${y} q6 -5 12 0 t12 0 t12 0" stroke-width="1.4"/>`;

/** The places drawn on the map (and used by the samples' markers). */
export const GEORGIA_PLACES = {
  tbilisi: [44.79, 41.72],
  kutaisi: [42.7, 42.27],
  batumi: [41.64, 41.65],
  kazbek: [44.52, 42.7],
  shkhara: [43.11, 43.0],
  paravani: [43.82, 41.45],
  sea: [40.25, 42.3],
} as const satisfies Record<string, readonly [number, number]>;

function georgiaSvg(): string {
  const P = GEORGIA_PLACES;
  return svg(
    GEORGIA_MAP.width,
    GEORGIA_MAP.height,
    [
      `<path d="${path(BORDER, true)}" stroke-width="2.4"/>`,
      `<path d="${path(MTKVARI)}" stroke-width="1.5"/>`,
      `<path d="${path(RIONI)}" stroke-width="1.5"/>`,
      `<path d="${path(ALAZANI)}" stroke-width="1.5"/>`,
      city(...P.tbilisi),
      city(...P.kutaisi),
      city(...P.batumi),
      summit(...P.kazbek),
      summit(...P.shkhara),
      lake(...P.paravani),
      wave(40, 190),
      wave(70, 215),
      wave(25, 240),
    ].join(""),
  );
}

// ---------------------------------------------------------------------------
// Simple objects for vocabulary questions (English picture match)
// ---------------------------------------------------------------------------

const UMBRELLA = svg(
  120,
  120,
  `<path d="M14 58 Q60 6 106 58 Q94 50 83 58 Q71 50 60 58 Q49 50 37 58 Q26 50 14 58 Z"/><path d="M60 58 V98 Q60 108 51 108 Q43 108 43 100"/><path d="M60 16 V10"/>`,
);
const CLOCK = svg(
  120,
  120,
  `<circle cx="60" cy="60" r="44"/><circle cx="60" cy="60" r="3" fill="#111"/><path d="M60 60 V30 M60 60 L80 70"/>` +
    Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      const r1 = 38;
      const r2 = i % 3 === 0 ? 31 : 34;
      const f = (n: number) => Math.round(n * 10) / 10;
      return `<path d="M${f(60 + r1 * Math.sin(a))} ${f(60 - r1 * Math.cos(a))} L${f(60 + r2 * Math.sin(a))} ${f(60 - r2 * Math.cos(a))}"/>`;
    }).join(""),
);
const KEY = svg(120, 120, `<circle cx="34" cy="60" r="18"/><circle cx="34" cy="60" r="6"/><path d="M52 60 H104 M90 60 V74 M100 60 V70 M78 60 V70"/>`);
const CUP = svg(
  120,
  120,
  `<path d="M26 44 H84 V86 Q84 102 68 102 H42 Q26 102 26 86 Z"/><path d="M84 54 Q100 54 100 68 Q100 82 84 82"/><path d="M44 34 Q38 26 44 18 M58 34 Q52 26 58 18 M72 34 Q66 26 72 18" stroke-width="1.8"/><path d="M18 108 H92"/>`,
);

/** A room for "label the picture": window, picture, lamp, table, chair, door (no words). */
const ROOM = svg(
  240,
  160,
  [
    `<path d="M6 132 H234" stroke-width="2"/>`,
    // window with four panes
    `<rect x="18" y="22" width="56" height="50"/><path d="M46 22 V72 M18 47 H74" stroke-width="1.6"/>`,
    // picture on the wall: mountains and a sun
    `<rect x="98" y="22" width="44" height="32"/><path d="M102 50 L114 36 L122 44 L130 34 L138 50" stroke-width="1.6"/><circle cx="108" cy="30" r="3" stroke-width="1.4"/>`,
    // table
    `<path d="M96 96 H170 M102 96 V132 M164 96 V132"/>`,
    // lamp on the table
    `<path d="M146 96 H158 M152 96 V74 M142 74 H162 L157 60 H147 Z"/>`,
    // chair
    `<path d="M66 70 V132 M66 104 H90 V132 M66 104"/>`,
    // door with a handle
    `<rect x="190" y="38" width="36" height="94"/><circle cx="198" cy="88" r="2.4" fill="#111"/>`,
  ].join(""),
);

/** A right triangle ABC (legs 6 and 8, the hypotenuse "?"). Letters only, no words. */
const TRIANGLE = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="260" viewBox="0 0 360 260"><rect width="360" height="260" fill="#fff"/>
<polygon points="40,220 320,220 40,30" fill="none" stroke="#000" stroke-width="3" stroke-linejoin="round"/>
<polyline points="40,196 64,196 64,220" fill="none" stroke="#000" stroke-width="2"/>
<g font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#000">
<text x="16" y="246">A</text><text x="324" y="246">B</text><text x="16" y="28">C</text>
<text x="172" y="248">8</text><text x="14" y="132">6</text><text x="192" y="114">?</text>
</g></svg>`;

export const BUILTIN_PICTURES: Record<string, BuiltinPicture> = {
  "georgia-map": { ...GEORGIA_MAP, svg: georgiaSvg() },
  room: { width: 240, height: 160, svg: ROOM },
  "triangle-abc": { width: 360, height: 260, svg: TRIANGLE },
  umbrella: { width: 120, height: 120, svg: UMBRELLA },
  clock: { width: 120, height: 120, svg: CLOCK },
  key: { width: 120, height: 120, svg: KEY },
  cup: { width: 120, height: 120, svg: CUP },
};

export const isBuiltinImage = (imageId: string) => imageId.startsWith(BUILTIN_PREFIX);

/** The picture as a data URL, or null for an unknown name. */
export function builtinImageUrl(imageId: string): string | null {
  const picture = BUILTIN_PICTURES[imageId.slice(BUILTIN_PREFIX.length)];
  return picture ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(picture.svg)}` : null;
}

/** "builtin:georgia-map" + its size, ready for a map question. */
export function builtinImage(name: keyof typeof BUILTIN_PICTURES & string) {
  const picture = BUILTIN_PICTURES[name];
  return { imageId: `${BUILTIN_PREFIX}${name}`, width: picture.width, height: picture.height };
}
