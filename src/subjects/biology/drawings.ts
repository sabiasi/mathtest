/**
 * Biology: the built-in drawings for "Label the diagram" questions.
 *
 * Simple, original line drawings, black on white (they must print well on
 * black-and-white school printers: shades of grey, never colour). They have
 * NO words on them: the labels come from the question.
 *
 * Each drawing also lists its main `parts` (where they are, and their names),
 * so a teacher can add all the labels with one click and then edit them.
 *
 * Plain data and strings (no React), so the editor, print and tests share it.
 */
import { BIO_DRAWING_IDS, type BioDrawingId } from "./drawingIds";

export { BIO_DRAWING_IDS, type BioDrawingId };

export type DrawingPart = { x: number; y: number; ka: string; en: string };
export type Drawing = { id: BioDrawingId; width: number; height: number; ka: string; en: string; svg: string; parts: DrawingPart[] };

// ---------------------------------------------------------------------------
// Little helpers that write SVG
// ---------------------------------------------------------------------------

const r1 = (n: number) => Math.round(n * 10) / 10;

function svg(width: number, height: number, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ` +
    `fill="none" stroke="#111" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`
  );
}

const circle = (cx: number, cy: number, r: number, attrs = "") => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r}" ${attrs}/>`;
const dots = (points: [number, number][], r = 2.6, fill = "#111") => points.map(([x, y]) => circle(x, y, r, `fill="${fill}" stroke="none"`)).join("");

/** An arc of a circle around (cx, cy), from angle a1 to a2 (degrees, clockwise on screen). */
function arc(cx: number, cy: number, r: number, a1: number, a2: number, attrs = "") {
  const p = (a: number) => [r1(cx + r * Math.cos((a * Math.PI) / 180)), r1(cy + r * Math.sin((a * Math.PI) / 180))];
  const [x1, y1] = p(a1);
  const [x2, y2] = p(a2);
  return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}" ${attrs}/>`;
}
const onArc = (cx: number, cy: number, r: number, a: number): [number, number] => [
  cx + r * Math.cos((a * Math.PI) / 180),
  cy + r * Math.sin((a * Math.PI) / 180),
];

/** A hollow tube along a path: a thick black line with a thinner light line inside. */
const tube = (d: string, outer: number, inner: number, fill = "#fff") =>
  `<path d="${d}" stroke-width="${outer}"/><path d="${d}" stroke="${fill}" stroke-width="${inner}"/>`;

/** A mitochondrion: outer membrane, inner membrane folded into cristae. */
function mitochondrion(cx: number, cy: number, angle: number, rx = 30, ry = 15) {
  const step = 6;
  let d = `M ${-rx + 7} 0`;
  for (let x = -rx + 7 + step, up = true; x <= rx - 7; x += step, up = !up) d += ` L ${x} ${up ? -(ry - 6) : ry - 6}`;
  return (
    `<g transform="translate(${cx} ${cy}) rotate(${angle})">` +
    `<ellipse rx="${rx}" ry="${ry}" fill="#f1f1f1"/><ellipse rx="${rx - 4}" ry="${ry - 4}" stroke-width="1.2"/>` +
    `<path d="${d}" stroke-width="1.3"/></g>`
  );
}

/** A chloroplast: an oval with stacks of thylakoids (grana). */
function chloroplast(cx: number, cy: number, angle: number, rx = 22, ry = 11) {
  const stacks = [-11, 0, 11]
    .map((x) => [-4, 0, 4].map((y) => `<line x1="${x - 3.5}" y1="${y}" x2="${x + 3.5}" y2="${y}" stroke-width="2.2"/>`).join(""))
    .join("");
  return (
    `<g transform="translate(${cx} ${cy}) rotate(${angle})">` +
    `<ellipse rx="${rx}" ry="${ry}" fill="#dedede"/><line x1="-15" y1="0" x2="15" y2="0" stroke-width="0.8"/>${stacks}</g>`
  );
}

// ---------------------------------------------------------------------------
// The drawings
// ---------------------------------------------------------------------------

function animalCell(): Drawing {
  const nucleus = { x: 230, y: 170 };
  const rer = [70, 80, 90]
    .map(
      (r) =>
        arc(nucleus.x, nucleus.y, r, 140, 220, 'stroke-width="2"') +
        dots(Array.from({ length: 8 }, (_, i) => onArc(nucleus.x, nucleus.y, r + 3.5, 145 + i * 10)), 1.8),
    )
    .join("");
  const golgi =
    [222, 232, 242, 252].map((y) => tube(`M 302 ${y} Q 330 ${y - 14} 358 ${y}`, 7, 3.2)).join("") +
    [circle(366, 226, 4, 'fill="#fff"'), circle(368, 247, 4, 'fill="#fff"'), circle(296, 262, 3.5, 'fill="#fff"')].join("");
  const body = [
    `<path d="M 60 170 C 58 80 160 34 250 38 C 352 44 428 92 424 182 C 420 268 338 312 240 308 C 140 304 62 262 60 170 Z" fill="#fafafa" stroke-width="3"/>`,
    rer,
    golgi,
    mitochondrion(365, 124, -20),
    mitochondrion(135, 248, 30),
    mitochondrion(300, 282, -5),
    // nucleus: double membrane, chromatin, nucleolus
    circle(nucleus.x, nucleus.y, 58, 'fill="#ececec"'),
    circle(nucleus.x, nucleus.y, 52, 'stroke-width="1.2"'),
    `<path d="M 200 150 q 8 -10 16 0 t 14 2 M 205 190 q 10 8 18 -2 M 250 195 q 6 -10 14 -2" stroke="#666" stroke-width="1.2"/>`,
    circle(248, 158, 15, 'fill="#555"'),
    // lysosome, vacuole, centrioles
    circle(120, 140, 13, 'fill="#c8c8c8"'),
    dots([[116, 136], [124, 143], [118, 146]], 1.6, "#555"),
    circle(192, 270, 14, 'fill="#fff" stroke-width="1.6"'),
    `<rect x="288" y="74" width="24" height="10" rx="2" fill="#ddd"/><rect x="314" y="72" width="10" height="24" rx="2" fill="#ddd"/>`,
    `<path d="M 294 74 v 10 M 300 74 v 10 M 306 74 v 10 M 314 78 h 10 M 314 84 h 10 M 314 90 h 10" stroke-width="1"/>`,
    // free ribosomes
    dots([[395, 165], [402, 178], [388, 192], [170, 82], [182, 72], [262, 92], [392, 246], [380, 262], [160, 296]], 2.4),
  ].join("");
  return {
    id: "animal-cell",
    width: 480,
    height: 340,
    ka: "ცხოველური უჯრედი",
    en: "Animal cell",
    svg: svg(480, 340, body),
    parts: [
      { x: 424, y: 188, ka: "უჯრედის მემბრანა", en: "cell membrane" },
      { x: 404, y: 222, ka: "ციტოპლაზმა", en: "cytoplasm" },
      { x: 206, y: 204, ka: "ბირთვი", en: "nucleus" },
      { x: 248, y: 158, ka: "ბირთვაკი", en: "nucleolus" },
      { x: 365, y: 124, ka: "მიტოქონდრია", en: "mitochondrion" },
      { x: 150, y: 170, ka: "ენდოპლაზმური ბადე", en: "endoplasmic reticulum" },
      { x: 330, y: 225, ka: "გოლჯის აპარატი", en: "Golgi apparatus" },
      { x: 120, y: 140, ka: "ლიზოსომა", en: "lysosome" },
      { x: 300, y: 79, ka: "ცენტრიოლი", en: "centriole" },
      { x: 395, y: 165, ka: "რიბოსომა", en: "ribosome" },
      { x: 192, y: 270, ka: "ვაკუოლი", en: "vacuole" },
    ],
  };
}

function plantCell(): Drawing {
  const body = [
    `<rect x="40" y="30" width="400" height="280" rx="16" fill="#d8d8d8" stroke-width="3"/>`,
    `<rect x="53" y="43" width="374" height="254" rx="10" fill="#fafafa" stroke-width="1.6"/>`,
    `<rect x="165" y="80" width="225" height="178" rx="55" fill="#fff" stroke-width="2"/>`,
    circle(110, 106, 32, 'fill="#ececec"'),
    circle(110, 106, 27, 'stroke-width="1.2"'),
    circle(116, 100, 9, 'fill="#555"'),
    chloroplast(100, 250, 75),
    chloroplast(155, 280, 8),
    chloroplast(258, 63, 0),
    chloroplast(345, 62, 8),
    chloroplast(408, 170, 90),
    chloroplast(300, 281, -5),
    mitochondrion(106, 178, 80, 24, 12),
    dots([[150, 225], [140, 70], [408, 252], [205, 280], [410, 100]], 2.2),
  ].join("");
  return {
    id: "plant-cell",
    width: 480,
    height: 340,
    ka: "მცენარეული უჯრედი",
    en: "Plant cell",
    svg: svg(480, 340, body),
    parts: [
      { x: 330, y: 36, ka: "უჯრედის კედელი", en: "cell wall" },
      { x: 53, y: 210, ka: "უჯრედის მემბრანა", en: "cell membrane" },
      { x: 280, y: 170, ka: "ვაკუოლი", en: "vacuole" },
      { x: 97, y: 116, ka: "ბირთვი", en: "nucleus" },
      { x: 300, y: 281, ka: "ქლოროპლასტი", en: "chloroplast" },
      { x: 106, y: 178, ka: "მიტოქონდრია", en: "mitochondrion" },
      { x: 150, y: 150, ka: "ციტოპლაზმა", en: "cytoplasm" },
    ],
  };
}

function flower(): Drawing {
  const mirror = (d: string) => d.replace(/(-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/g, (_, x, __, y) => `${400 - Number(x)} ${y}`);
  const petal = "M 178 284 C 128 262 76 205 82 130 C 122 150 166 210 188 270 Z";
  const sepal = "M 174 292 C 142 292 118 278 106 256 C 134 262 160 272 182 284 Z";
  const leaf = "M 208 378 C 248 350 296 352 324 326 C 300 374 254 392 208 392 Z";
  const stamen = (fx: number, fy: number, ax: number, ay: number) => {
    const angle = (Math.atan2(ay - fy, ax - fx) * 180) / Math.PI + 90;
    return `<line x1="${fx}" y1="${fy}" x2="${ax}" y2="${ay}" stroke-width="2"/><ellipse cx="${ax}" cy="${ay}" rx="7" ry="12" transform="rotate(${r1(angle)} ${ax} ${ay})" fill="#444"/>`;
  };
  const body = [
    `<rect x="192" y="300" width="16" height="120" fill="#e6e6e6"/>`,
    `<path d="${leaf}" fill="#e6e6e6"/><path d="M 210 386 C 250 372 290 356 318 332" stroke-width="1.2"/>`,
    `<path d="M 186 270 C 176 200 180 132 200 100 C 220 132 224 200 214 270 Z" fill="#f4f4f4"/>`,
    `<path d="${sepal}" fill="#cfcfcf"/><path d="${mirror(sepal)}" fill="#cfcfcf"/>`,
    `<path d="${petal}" fill="#fafafa"/><path d="${mirror(petal)}" fill="#fafafa"/>`,
    `<ellipse cx="200" cy="292" rx="34" ry="12" fill="#e0e0e0"/>`,
    stamen(184, 272, 140, 176),
    stamen(190, 270, 166, 166),
    stamen(216, 272, 260, 176),
    stamen(210, 270, 234, 166),
    `<path d="M 178 280 C 170 252 180 230 192 222 L 208 222 C 220 230 230 252 222 280 Z" fill="#fff"/>`,
    dots([[193, 250], [207, 250], [200, 264], [200, 237]], 4.5, "#777"),
    `<path d="M 196 222 L 197 152 L 203 152 L 204 222 Z" fill="#fff"/>`,
    `<path d="M 185 152 C 185 136 215 136 215 152 Q 200 160 185 152 Z" fill="#999"/>`,
  ].join("");
  const shift = 90;
  return {
    id: "flower",
    width: 400,
    height: 420 - shift,
    ka: "ყვავილი",
    en: "Flower",
    svg: svg(400, 420 - shift, `<g transform="translate(0 ${-shift})">${body}</g>`),
    parts: ([
      { x: 108, y: 186, ka: "გვირგვინის ფურცელი", en: "petal" },
      { x: 130, y: 272, ka: "ჯამის ფოთოლი", en: "sepal" },
      { x: 200, y: 144, ka: "დინგი", en: "stigma" },
      { x: 200, y: 190, ka: "სვეტი", en: "style" },
      { x: 186, y: 266, ka: "ნასკვი", en: "ovary" },
      { x: 207, y: 250, ka: "თესლკვირტი", en: "ovule" },
      { x: 140, y: 176, ka: "სამტვრე", en: "anther" },
      { x: 162, y: 224, ka: "მტვრიანას ძაფი", en: "filament" },
      { x: 200, y: 295, ka: "ყვავილსაჯდომი", en: "receptacle" },
      { x: 200, y: 350, ka: "ღერო", en: "stem" },
    ] as DrawingPart[]).map((p) => ({ ...p, y: p.y - shift })),
  };
}

function leafSection(): Drawing {
  const bundle = { x: 260, y: 192 };
  const stoma = { x: 380, y: 258 };
  const parts: string[] = [];
  // cuticle and upper epidermis
  parts.push(`<rect x="20" y="26" width="480" height="6" fill="#bbb" stroke-width="1"/>`);
  for (let x = 20; x < 500; x += 30) parts.push(`<rect x="${x}" y="32" width="30" height="26" fill="#fff" stroke-width="1.4"/>`);
  // palisade cells with chloroplasts
  for (let x = 20; x < 500; x += 24) {
    parts.push(`<rect x="${x + 2}" y="61" width="20" height="80" rx="9" fill="#f3f3f3" stroke-width="1.4"/>`);
    parts.push(dots([72, 92, 112, 130].map((y, i) => [x + (i % 2 ? 15 : 9), y] as [number, number]), 3, "#555"));
  }
  // spongy mesophyll (round cells with air spaces), around the vascular bundle and the space above the stoma
  for (let row = 0; row < 3; row++) {
    const y = 160 + row * 34;
    for (let x = 34 + (row % 2) * 23; x < 500; x += 46) {
      if (Math.hypot(x - bundle.x, y - bundle.y) < 58 || Math.hypot(x - stoma.x, y - (stoma.y - 26)) < 30) continue;
      parts.push(`<ellipse cx="${x}" cy="${y}" rx="17" ry="14" fill="#f3f3f3" stroke-width="1.4"/>`);
      parts.push(dots([[x - 7, y - 3], [x + 6, y + 4]], 2.6, "#555"));
    }
  }
  // vascular bundle: xylem (big thick rings) above, phloem (small cells) below
  parts.push(circle(bundle.x, bundle.y, 42, 'fill="#fff" stroke-width="2"'));
  parts.push(
    [[245, 180], [260, 175], [275, 180], [252, 194], [268, 194]].map(([x, y]) => circle(x, y, 7, 'stroke-width="2.6" fill="#fff"')).join(""),
  );
  parts.push(
    [[246, 212], [254, 216], [262, 213], [270, 216], [278, 211], [258, 222], [267, 223]].map(([x, y]) => circle(x, y, 3.6, 'fill="#bbb" stroke-width="1"')).join(""),
  );
  // lower epidermis, cuticle, stoma with guard cells
  for (let x = 20; x < 500; x += 30) parts.push(`<rect x="${x}" y="246" width="30" height="24" fill="#fff" stroke-width="1.4"/>`);
  parts.push(`<rect x="20" y="270" width="480" height="5" fill="#bbb" stroke-width="1"/>`);
  parts.push(`<rect x="361" y="245" width="38" height="31" fill="#fff" stroke="none"/>`);
  parts.push(`<ellipse cx="${stoma.x - 8}" cy="${stoma.y}" rx="8" ry="12" fill="#cfcfcf"/><ellipse cx="${stoma.x + 8}" cy="${stoma.y}" rx="8" ry="12" fill="#cfcfcf"/>`);
  return {
    id: "leaf-section",
    width: 520,
    height: 300,
    ka: "ფოთლის განივი ჭრილი",
    en: "Leaf cross-section",
    svg: svg(520, 300, parts.join("")),
    parts: [
      { x: 62, y: 29, ka: "კუტიკულა", en: "cuticle" },
      { x: 65, y: 45, ka: "ზედა ეპიდერმისი", en: "upper epidermis" },
      { x: 80, y: 100, ka: "სვეტისებრი ქსოვილი", en: "palisade mesophyll" },
      { x: 126, y: 160, ka: "ღრუბლისებრი ქსოვილი", en: "spongy mesophyll" },
      { x: 57, y: 160, ka: "უჯრედშორისი სივრცე", en: "air space" },
      { x: 260, y: 175, ka: "ქსილემა", en: "xylem" },
      { x: 262, y: 217, ka: "ფლოემა", en: "phloem" },
      { x: 65, y: 258, ka: "ქვედა ეპიდერმისი", en: "lower epidermis" },
      { x: 380, y: 262, ka: "ბაგე", en: "stoma" },
      { x: 388, y: 252, ka: "მკეტი უჯრედი", en: "guard cell" },
    ],
  };
}

function heart(): Drawing {
  // Seen from the front, so the heart's RIGHT side is on the viewer's LEFT.
  const vessel = (d: string, width: number) => tube(d, width, width - 5, "#e2e2e2");
  const body = [
    // vessels first: the heart muscle covers their ends
    vessel("M 270 66 L 262 24 M 292 58 L 292 16 M 314 64 L 322 24", 12),
    vessel("M 200 200 L 206 112 M 60 112 L 380 112", 24),
    vessel("M 250 196 L 250 92 C 250 38 334 38 338 92 L 340 204", 32),
    vessel("M 136 30 L 136 196", 30),
    vessel("M 108 236 L 108 384", 30),
    vessel("M 330 198 L 394 198 M 330 230 L 394 230", 16),
    // the heart muscle
    `<path d="M 118 170 C 96 180 88 222 94 262 C 104 332 170 392 236 422 C 302 386 348 322 346 250 C 348 206 336 176 312 168 Z" fill="#c8c8c8" stroke-width="3"/>`,
    // chambers: right atrium, left atrium, right ventricle, left ventricle
    `<rect x="112" y="182" width="86" height="70" rx="10" fill="#fff"/>`,
    `<rect x="236" y="182" width="90" height="64" rx="10" fill="#fff"/>`,
    `<path d="M 112 270 L 202 270 L 210 372 C 166 350 126 312 112 270 Z" fill="#fff"/>`,
    `<path d="M 232 266 L 322 266 C 322 320 290 370 236 398 Z" fill="#fff"/>`,
    // valves between the atria and the ventricles
    `<path d="M 128 252 L 142 280 L 156 252 M 160 252 L 174 280 L 188 252" fill="#fff"/>`,
    `<path d="M 246 246 L 262 276 L 278 246 M 284 246 L 300 276 L 316 246" fill="#fff"/>`,
  ].join("");
  return {
    id: "heart",
    width: 440,
    height: 440,
    ka: "გული",
    en: "Heart",
    svg: svg(440, 440, body),
    parts: [
      { x: 154, y: 217, ka: "მარჯვენა წინაგული", en: "right atrium" },
      { x: 281, y: 214, ka: "მარცხენა წინაგული", en: "left atrium" },
      { x: 160, y: 310, ka: "მარჯვენა პარკუჭი", en: "right ventricle" },
      { x: 272, y: 310, ka: "მარცხენა პარკუჭი", en: "left ventricle" },
      { x: 292, y: 52, ka: "აორტა", en: "aorta" },
      { x: 84, y: 112, ka: "ფილტვის არტერია", en: "pulmonary artery" },
      { x: 136, y: 58, ka: "ზედა ღრუ ვენა", en: "superior vena cava" },
      { x: 108, y: 368, ka: "ქვედა ღრუ ვენა", en: "inferior vena cava" },
      { x: 382, y: 198, ka: "ფილტვის ვენები", en: "pulmonary veins" },
      { x: 220, y: 320, ka: "ძგიდე", en: "septum" },
      { x: 142, y: 266, ka: "სამკარიანი სარქველი", en: "tricuspid valve" },
      { x: 262, y: 262, ka: "ორკარიანი სარქველი", en: "bicuspid (mitral) valve" },
    ],
  };
}

function digestiveSystem(): Drawing {
  const smallIntestine = "M 196 300 C 160 318 150 334 168 346 L 236 350 C 252 360 244 376 228 378 L 150 380 C 134 392 140 408 156 410 L 230 412 C 244 418 240 432 226 436 L 176 440";
  const largeIntestine = "M 114 452 L 114 334 Q 114 322 126 322 L 252 322 Q 264 322 264 334 L 264 444 Q 262 462 228 466 L 192 468";
  const body = [
    // body outline (dashed, light)
    `<path d="M 180 18 C 214 18 226 44 224 70 C 222 96 206 112 194 116 L 196 132 C 240 138 296 150 306 176 L 310 506 L 50 506 L 54 176 C 64 150 120 138 164 132 L 166 116 C 154 112 138 96 136 70 C 134 44 146 18 180 18 Z" stroke="#999" stroke-width="1.5" stroke-dasharray="6 5"/>`,
    // mouth, salivary gland
    `<path d="M 166 86 Q 180 96 194 86" stroke-width="2.2"/>`,
    `<ellipse cx="148" cy="100" rx="10" ry="7" fill="#ddd"/>`,
    tube(largeIntestine, 24, 17, "#ececec"),
    tube("M 112 462 C 112 474 104 484 98 492", 10, 4, "#ececec"),
    tube("M 192 468 L 186 492", 18, 11, "#ececec"),
    tube(smallIntestine, 13, 7, "#fafafa"),
    `<path d="M 168 302 C 196 288 246 286 274 300 C 270 312 230 316 172 312 Z" fill="#ebebeb"/>`,
    dots([[190, 302], [210, 299], [232, 300], [252, 301]], 1.6, "#777"),
    tube("M 180 98 C 180 150 188 190 206 222", 12, 6),
    `<path d="M 200 216 C 214 208 266 210 276 236 C 288 266 260 296 224 294 C 206 292 196 288 188 292 L 184 280 C 196 274 214 276 228 272 C 240 266 238 248 220 238 C 210 232 202 228 200 216 Z" fill="#dedede"/>`,
    `<path d="M 86 216 C 96 194 190 192 214 206 C 208 236 160 262 102 264 C 84 254 80 232 86 216 Z" fill="#bdbdbd"/>`,
    `<path d="M 150 262 C 146 274 150 286 160 284 C 168 282 166 268 162 260 Z" fill="#777"/>`,
  ].join("");
  return {
    id: "digestive-system",
    width: 360,
    height: 520,
    ka: "საჭმლის მომნელებელი სისტემა",
    en: "Digestive system",
    svg: svg(360, 520, body),
    parts: [
      { x: 180, y: 90, ka: "პირის ღრუ", en: "mouth" },
      { x: 148, y: 100, ka: "სანერწყვე ჯირკვალი", en: "salivary gland" },
      { x: 184, y: 150, ka: "საყლაპავი მილი", en: "oesophagus" },
      { x: 250, y: 250, ka: "კუჭი", en: "stomach" },
      { x: 130, y: 232, ka: "ღვიძლი", en: "liver" },
      { x: 156, y: 274, ka: "ნაღვლის ბუშტი", en: "gall bladder" },
      { x: 250, y: 303, ka: "კუჭქვეშა ჯირკვალი", en: "pancreas" },
      { x: 200, y: 380, ka: "წვრილი ნაწლავი", en: "small intestine" },
      { x: 264, y: 400, ka: "მსხვილი ნაწლავი", en: "large intestine" },
      { x: 100, y: 488, ka: "ჭიანაწლავი", en: "appendix" },
      { x: 188, y: 484, ka: "სწორი ნაწლავი", en: "rectum" },
    ],
  };
}

function neuron(): Drawing {
  const dendrite = (x1: number, y1: number, x2: number, y2: number, branches: [number, number][]) =>
    `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke-width="4"/>` + branches.map(([bx, by]) => `<path d="M ${x2} ${y2} L ${bx} ${by}" stroke-width="2"/>`).join("");
  const myelin: string[] = [];
  for (let x = 180; x + 44 <= 452; x += 52) myelin.push(`<rect x="${x}" y="119" width="44" height="22" rx="11" fill="#e2e2e2"/>`);
  const terminal = (y: number) => `<path d="M 470 130 Q 500 130 520 ${y}" stroke-width="2.4"/>` + circle(524, y, 6, 'fill="#555"');
  const body = [
    dendrite(84, 108, 40, 60, [[18, 52], [34, 30]]),
    dendrite(78, 138, 30, 150, [[10, 136], [14, 172]]),
    dendrite(100, 168, 76, 220, [[50, 232], [86, 248]]),
    dendrite(124, 96, 130, 40, [[110, 20], [152, 22]]),
    dendrite(132, 164, 160, 214, [[150, 240], [186, 226]]),
    `<path d="M 140 130 L 470 130" stroke-width="5"/>`,
    myelin.join(""),
    `<ellipse cx="254" cy="121" rx="9" ry="4" fill="#777"/>`,
    `<path d="M 72 128 C 70 96 96 82 118 90 C 140 96 156 112 152 132 C 150 156 132 174 106 172 C 84 170 74 152 72 128 Z" fill="#e8e8e8" stroke-width="2.4"/>`,
    circle(110, 130, 16, 'fill="#c8c8c8"'),
    circle(114, 126, 5, 'fill="#555"'),
    [92, 112, 130, 150, 170].map(terminal).join(""),
  ].join("");
  return {
    id: "neuron",
    width: 560,
    height: 260,
    ka: "ნეირონი",
    en: "Neuron",
    svg: svg(560, 260, body),
    parts: [
      { x: 34, y: 30, ka: "დენდრიტი", en: "dendrite" },
      { x: 92, y: 158, ka: "ნეირონის სხეული", en: "cell body" },
      { x: 104, y: 136, ka: "ბირთვი", en: "nucleus" },
      { x: 164, y: 130, ka: "აქსონი", en: "axon" },
      { x: 306, y: 140, ka: "მიელინის გარსი", en: "myelin sheath" },
      { x: 228, y: 130, ka: "რანვიეს კვანძი", en: "node of Ranvier" },
      { x: 254, y: 121, ka: "შვანის უჯრედი", en: "Schwann cell" },
      { x: 524, y: 150, ka: "აქსონის დაბოლოება", en: "axon terminal" },
    ],
  };
}

function dna(): Drawing {
  const cx = 150;
  const amp = 78;
  const period = 240;
  const xAt = (y: number, phase: number) => cx + amp * Math.sin((2 * Math.PI * y) / period + phase);
  const strand = (phase: number) => {
    let d = "";
    for (let y = 20; y <= 460; y += 4) d += `${d ? " L" : "M"} ${r1(xAt(y, phase))} ${y}`;
    return d;
  };
  const rungs: string[] = [];
  for (let y = 32; y <= 452; y += 20) {
    const a = xAt(y, 0);
    const b = xAt(y, Math.PI);
    if (Math.abs(a - b) < 16) continue; // where the strands cross
    const mid = (a + b) / 2;
    const gap = Math.sign(b - a) * 3;
    rungs.push(`<line x1="${r1(a)}" y1="${y}" x2="${r1(mid - gap)}" y2="${y}" stroke-width="5"/>`);
    rungs.push(`<line x1="${r1(mid + gap)}" y1="${y}" x2="${r1(b)}" y2="${y}" stroke-width="5" stroke="#999"/>`);
  }
  const body = [rungs.join(""), tube(strand(Math.PI), 12, 6), `<path d="${strand(0)}" stroke-width="12"/>`].join("");
  const rungY = 92; // a base pair away from the crossings
  const a = xAt(rungY, 0);
  const b = xAt(rungY, Math.PI);
  return {
    id: "dna",
    width: 300,
    height: 480,
    ka: "დნმ-ის ორმაგი სპირალი",
    en: "DNA double helix",
    svg: svg(300, 480, body),
    parts: [
      { x: r1(xAt(150, 0)), y: 150, ka: "შაქარ-ფოსფატური ჯაჭვი", en: "sugar-phosphate backbone" },
      { x: r1((a + b) / 2), y: rungY, ka: "წყალბადური ბმა", en: "hydrogen bond" },
      { x: r1(a + (b - a) * 0.25), y: rungY, ka: "აზოტოვანი ფუძე", en: "nitrogenous base" },
      { x: r1((xAt(332, 0) + xAt(332, Math.PI)) / 2 - 20), y: 332, ka: "ფუძეთა წყვილი", en: "base pair" },
    ],
  };
}

const ALL: Drawing[] = [animalCell(), plantCell(), flower(), leafSection(), heart(), digestiveSystem(), neuron(), dna()];
const BY_ID = new Map(ALL.map((d) => [d.id, d]));

export const BIO_DRAWINGS: readonly Drawing[] = BIO_DRAWING_IDS.map((id) => BY_ID.get(id)!);

export function getDrawing(id: BioDrawingId): Drawing {
  return BY_ID.get(id) ?? ALL[0];
}

const urls = new Map<BioDrawingId, string>();
/** The drawing as an image address (an SVG "data URL"), for <img src>. */
export function drawingUrl(id: BioDrawingId): string {
  let url = urls.get(id);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(getDrawing(id).svg)}`;
    urls.set(id, url);
  }
  return url;
}
