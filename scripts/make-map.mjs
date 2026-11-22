// make-map.mjs — genera assets/data/map.json dai confini Natural Earth (dominio pubblico).
// Da lanciare A MANO, una volta (o quando cambiano i confini): non gira in CI.
//   node scripts/make-map.mjs
// Nessuna dipendenza: proiezione Mercator e semplificazione Douglas-Peucker scritte qui.
// Sorgenti: https://www.naturalearthdata.com (50m, file GeoJSON su GitHub).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "data", "map.json");
const SRC_COUNTRIES = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const SRC_STATES = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson";

const TOL = 0.05;     // tolleranza di semplificazione (unità Mercator ~ gradi)
const DECIMALS = 2;   // precisione coordinate in output

// Riquadri di zoom in gradi (lon/lat). Il client li converte in viewBox.
const VIEWS = {
  Mondo:    { lon: [-180, 190], lat: [-60, 80] },
  Europa:   { lon: [-25, 45],   lat: [34, 72] },
  Americhe: { lon: [-170, -30], lat: [-56, 72] },
  Asia:     { lon: [25, 150],   lat: [-10, 60] },
  Africa:   { lon: [-20, 60],   lat: [-36, 38] },
  Oceania:  { lon: [100, 220],  lat: [-50, 0] },
  USA:      { lon: [-170, -65], lat: [18, 72] },
};

// --- proiezione --------------------------------------------------------------
const DEG = 180 / Math.PI;
const clampLat = (lat) => Math.max(-85, Math.min(85, lat));
const mercX = (lon) => lon;
const mercY = (lat) => -DEG * Math.log(Math.tan(Math.PI / 4 + (clampLat(lat) * Math.PI) / 360));
const proj = ([lon, lat]) => [mercX(lon), mercY(lat)];

// --- geometrie ---------------------------------------------------------------
// Srotola un anello sul meridiano di continuità (evita i salti a ±180°).
function unwrap(ring, shiftPositive) {
  const out = [];
  let prev = null;
  for (const [lon0, lat] of ring) {
    let lon = lon0;
    if (prev !== null) {
      while (lon - prev > 180) lon -= 360;
      while (lon - prev < -180) lon += 360;
    }
    out.push([lon, lat]);
    prev = lon;
  }
  if (shiftPositive) {
    const mean = out.reduce((s, p) => s + p[0], 0) / out.length;
    if (mean < 0) for (const p of out) p[0] += 360;
  }
  return out;
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// Douglas-Peucker. Anelli piccoli (<= 20 punti) restano intatti: isole minuscole.
function simplify(pts, tol) {
  if (pts.length <= 20) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = perpDist(pts[i], pts[a], pts[b]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx !== -1 && maxD > tol) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const fmt = (n) => String(Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS);

// Converte un Polygon/MultiPolygon in { d, polys } (polys: anelli esterni proiettati, per centroide).
function geometryToPaths(geom, shiftPositive) {
  const polygons = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  const parts = [];
  const outers = [];
  for (const poly of polygons) {
    const rings = [];
    poly.forEach((ring, i) => {
      const projected = unwrap(ring, shiftPositive).map(proj);
      const s = simplify(projected, TOL);
      if (s.length < 4) return;
      rings.push(s);
      if (i === 0) outers.push(s);
    });
    for (const r of rings) {
      parts.push("M" + r.map((p) => fmt(p[0]) + " " + fmt(p[1])).join("L") + "Z");
    }
  }
  return { d: parts.join(""), outers };
}

// Centroide del poligono esterno più grande (formula di Gauss); fallback: centro del bbox.
function labelPoint(outers) {
  let best = null, bestArea = 0;
  for (const ring of outers) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
      const f = x0 * y1 - x1 * y0;
      a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
    }
    a /= 2;
    if (Math.abs(a) > bestArea) { bestArea = Math.abs(a); best = [cx / (6 * a), cy / (6 * a)]; }
  }
  if (!best) {
    const xs = outers.flat().map((p) => p[0]), ys = outers.flat().map((p) => p[1]);
    best = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  }
  return [Math.round(best[0] * 100) / 100, Math.round(best[1] * 100) / 100];
}

// Vista: riquadro in coordinate proiettate [x, y, larghezza, altezza].
function viewBox({ lon, lat }) {
  const [x0, y1] = proj([lon[0], lat[0]]);
  const [x1, y0] = proj([lon[1], lat[1]]);
  return [fmt(x0), fmt(y0), fmt(x1 - x0), fmt(y1 - y0)];
}

// --- main --------------------------------------------------------------------
async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download fallito (${r.status}): ${url}`);
  return r.json();
}

const countryIso = JSON.parse(readFileSync(join(ROOT, "data", "country-iso.json"), "utf-8"));
delete countryIso._nota;

console.log("Scarico Natural Earth 50m…");
const [worldFc, statesFc] = await Promise.all([getJson(SRC_COUNTRIES), getJson(SRC_STATES)]);

// Raggruppa le feature per ADM0_A3 (una nazione può avere più poligoni/feature).
const byIso = new Map();
for (const f of worldFc.features) {
  const iso = f.properties.ADM0_A3;
  if (!iso || iso === "ATA") continue; // niente Antartide
  if (!byIso.has(iso)) byIso.set(iso, []);
  byIso.get(iso).push(f.geometry);
}

const missing = Object.entries(countryIso).filter(([, v]) => !byIso.has(v.iso3));
if (missing.length) {
  console.error("Nazioni senza geometria in Natural Earth:", missing.map(([n, v]) => `${n} (${v.iso3})`).join(", "));
  process.exit(1);
}

const collectionIso = new Set(Object.values(countryIso).map((v) => v.iso3));

// Centro di lettura manuale per nazioni con poligono principale lontano dal territorio di interesse.
const CENTRO = { Russia: [40, 58], Italia: [13.6, 42.3] }; // Italia spostata per non coprire San Marino e Vaticano

const countries = [];
for (const [name, meta] of Object.entries(countryIso)) {
  const shift = meta.continent === "Oceania";
  const parts = byIso.get(meta.iso3).map((g) => geometryToPaths(g, shift));
  const d = parts.map((p) => p.d).join("");
  const outers = parts.flatMap((p) => p.outers);
  const c = CENTRO[name] ? proj(CENTRO[name]).map((v) => Math.round(v * 100) / 100) : labelPoint(outers);
  countries.push({ name, iso3: meta.iso3, continent: meta.continent, d, c });
}

// Sfondo: tutti gli altri paesi del mondo, solo disegno (nessun conteggio).
const background = [];
for (const [iso, geoms] of byIso) {
  if (collectionIso.has(iso)) continue;
  const d = geoms.map((g) => geometryToPaths(g, false).d).join("");
  if (d) background.push({ iso3: iso, d });
}

// Stati USA (Natural Earth admin-1).
const usStates = [];
for (const f of statesFc.features) {
  if (f.properties.iso_a2 !== "US") continue;
  const { d, outers } = geometryToPaths(f.geometry, false);
  usStates.push({ name: f.properties.name, d, c: labelPoint(outers) });
}
usStates.sort((a, b) => a.name.localeCompare(b.name, "en"));

const out = {
  fonte: "Natural Earth 50m (dominio pubblico) — naturalearthdata.com",
  proiezione: "Mercator; x = longitudine, y = -Mercator(latitudine); viewBox in queste unità",
  viste: Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, viewBox(v)])),
  paesi: countries,
  sfondo: background,
  statiUSA: usStates,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
const kb = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0);
console.log(`Scritto ${OUT} — ${countries.length} paesi, ${background.length} di sfondo, ${usStates.length} stati USA, ${kb} KB`);
