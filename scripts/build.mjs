// build.mjs — genera il sito statico in dist/ da templates/ + data/cards.json.
// Zero dipendenze. Implementa un renderer mini-Mustache come da docs/CONTRACT.md.
import {
  readFileSync, writeFileSync, mkdirSync, existsSync,
  readdirSync, copyFileSync, statSync, rmSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Renderer mini-Mustache — supporta SOLO ciò che indica il CONTRACT:
//   {{var}}   valore con escape HTML
//   {{{var}}} valore RAW (nessun escape)
//   {{#s}}..{{/s}}  sezione: truthy -> rende; array -> ripete (contesto=elemento);
//                   dentro array di stringhe {{.}} è l'elemento corrente.
//   {{^s}}..{{/s}}  inversa: rende se falso/vuoto/array vuoto.
// Niente altro. I commenti HTML restano nel testo.
// ---------------------------------------------------------------------------

export function escapeHtml(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Tokenizza il template. Il triplo {{{ }}} va provato PRIMA del doppio.
const TOKEN_RE = /\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([#\/^&])?\s*([\w.]+)\s*\}\}/g;

function tokenize(tpl) {
  const tokens = [];
  let last = 0, m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(tpl))) {
    if (m.index > last) tokens.push({ t: "text", v: tpl.slice(last, m.index) });
    if (m[1] !== undefined) {
      tokens.push({ t: "raw", name: m[1] });          // {{{var}}}
    } else {
      const sigil = m[2], name = m[3];
      if (sigil === "#") tokens.push({ t: "open", name });
      else if (sigil === "^") tokens.push({ t: "inv", name });
      else if (sigil === "/") tokens.push({ t: "close", name });
      else if (sigil === "&") tokens.push({ t: "raw", name });   // {{&var}} = raw
      else tokens.push({ t: "var", name });            // {{var}}
    }
    last = TOKEN_RE.lastIndex;
  }
  if (last < tpl.length) tokens.push({ t: "text", v: tpl.slice(last) });
  return tokens;
}

// Costruisce un albero (gestisce sezioni annidate).
function parse(tokens) {
  const root = { children: [] };
  const stack = [root];
  for (const tok of tokens) {
    const cur = stack[stack.length - 1];
    if (tok.t === "open" || tok.t === "inv") {
      const node = { t: tok.t, name: tok.name, children: [] };
      cur.children.push(node);
      stack.push(node);
    } else if (tok.t === "close") {
      if (stack.length < 2 || stack[stack.length - 1].name !== tok.name)
        throw new Error(`Sezione mal chiusa: {{/${tok.name}}}`);
      stack.pop();
    } else {
      cur.children.push(tok);
    }
  }
  if (stack.length !== 1)
    throw new Error(`Sezione non chiusa: {{#${stack[stack.length - 1].name}}}`);
  return root;
}

// stack[0] = contesto più interno.
function lookup(stack, name) {
  if (name === ".") return stack[0];
  const parts = name.split(".");
  for (const frame of stack) {
    if (frame != null && typeof frame === "object" && Object.prototype.hasOwnProperty.call(frame, parts[0])) {
      let v = frame, ok = true;
      for (const p of parts) {
        if (v != null && typeof v === "object" && p in v) v = v[p];
        else { ok = false; break; }
      }
      if (ok) return v;
    }
  }
  return undefined;
}

const isFalsy = (v) =>
  v === undefined || v === null || v === false || v === "" || v === 0 ||
  (Array.isArray(v) && v.length === 0);

function renderNodes(nodes, stack) {
  let out = "";
  for (const n of nodes) {
    if (n.t === "text") out += n.v;
    else if (n.t === "var") { const v = lookup(stack, n.name); out += v == null ? "" : escapeHtml(v); }
    else if (n.t === "raw") { const v = lookup(stack, n.name); out += v == null ? "" : String(v); }
    else if (n.t === "open") {
      const v = lookup(stack, n.name);
      if (Array.isArray(v)) {
        for (const item of v) out += renderNodes(n.children, [item, ...stack]);
      } else if (!isFalsy(v)) {
        out += renderNodes(n.children, [v, ...stack]);
      }
    } else if (n.t === "inv") {
      const v = lookup(stack, n.name);
      if (isFalsy(v)) out += renderNodes(n.children, stack);
    }
  }
  return out;
}

export function render(tpl, context) {
  const tree = parse(tokenize(tpl));
  return renderNodes(tree.children, [context]);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function slug(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // rimuove accenti
    .replace(/[^a-z0-9]+/g, "-")                       // spazi/altro -> trattino
    .replace(/^-+|-+$/g, "");
}

function copyDir(src, dst) {
  if (!existsSync(src)) return 0;
  mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const entry of readdirSync(src)) {
    const s = join(src, entry), d = join(dst, entry);
    if (statSync(s).isDirectory()) n += copyDir(s, d);
    else { copyFileSync(s, d); n++; }
  }
  return n;
}

function writePage(distDir, relPath, html) {
  const full = join(distDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html);
}

// I template sono frammenti: tutto ciò che precede <!--BODY--> (link CSS + script
// anti-flash del tema) va nel <head> generato; il resto nel <body>. Qui aggiungiamo
// lo scheletro del documento con charset, viewport (essenziale per il responsive) e title.
function wrapPage(rendered, title) {
  const MARK = "<!--BODY-->";
  let head = "", body = rendered;
  const i = rendered.indexOf(MARK);
  if (i !== -1) { head = rendered.slice(0, i).trim(); body = rendered.slice(i + MARK.length); }
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${head}
</head>
<body>${body}</body>
</html>
`;
}

// Arricchisce una card con i campi derivati del CONTRACT.
function enrichCard(card, base, common, prev, next) {
  return {
    ...common,
    ...card,
    base,
    hasDeck: !!card.deck,
    coverFull: `${base}assets/img/full/${card.cover}`,
    coverThumb: `${base}assets/img/thumb/${card.cover}`,
    deckFull: card.deck ? `${base}assets/img/full/${card.deck}` : "",
    prev: prev ? { id: prev.id, title: prev.title } : null,
    next: next ? { id: next.id, title: next.title } : null,
  };
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function build({ tplDir, distDir, dataFile, assetsDir } = {}) {
  tplDir = tplDir || join(ROOT, "templates");
  distDir = distDir || join(ROOT, "dist");
  dataFile = dataFile || join(ROOT, "data", "cards.json");
  assetsDir = assetsDir || join(ROOT, "assets");

  const need = ["index.html", "catalogo.html", "mazzo.html"];
  const missing = need.filter((f) => !existsSync(join(tplDir, f)));
  if (missing.length) {
    throw Object.assign(
      new Error(`Template mancanti in ${tplDir}: ${missing.join(", ")}. build.mjs è pronto; attendo i template del Design.`),
      { code: "NO_TEMPLATES" },
    );
  }

  const data = JSON.parse(readFileSync(dataFile, "utf-8"));
  const cards = data.cards;
  const siteTitle = "Catalogo Carte di Luigi";
  const year = String(new Date().getFullYear());
  const common = { siteTitle, year, count: data.count };

  const tplIndex = readFileSync(join(tplDir, "index.html"), "utf-8");
  const tplCat = readFileSync(join(tplDir, "catalogo.html"), "utf-8");
  const tplMazzo = readFileSync(join(tplDir, "mazzo.html"), "utf-8");

  // Pulizia output
  if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });

  let pages = 0;

  // --- HOME ---
  const countCountries = new Set(cards.map((c) => c.country).filter(Boolean)).size;

  const contCounts = new Map();
  for (const c of cards) if (c.continent) contCounts.set(c.continent, (contCounts.get(c.continent) || 0) + 1);
  const continents = data.continents
    .filter((name) => contCounts.has(name))
    .map((name) => ({ name, count: contCounts.get(name), slug: slug(name) }));

  const catCounts = new Map();
  for (const c of cards) {
    const code = c.categoryCode || "";
    if (!catCounts.has(code)) catCounts.set(code, { code, name: c.category || data.categories[code] || "Non categorizzato", count: 0 });
    catCounts.get(code).count++;
  }
  const categories = [...catCounts.values()].sort((a, b) => b.count - a.count);

  const featured = cards
    .filter((c) => c.trivia)
    .slice(0, 8)
    .map((c) => enrichCard(c, "", common, null, null));

  const homeCtx = {
    ...common,
    base: "",
    count: data.count,
    countCountries,
    countContinents: continents.length,
    countCategories: categories.length,
    continents,
    categories,
    featured,
  };
  writePage(distDir, "index.html", wrapPage(render(tplIndex, homeCtx), siteTitle));
  pages++;

  // --- CATALOGO (guscio statico) ---
  writePage(distDir, join("catalogo", "index.html"),
    wrapPage(render(tplCat, { ...common, base: "../" }), `Catalogo — ${siteTitle}`));
  pages++;

  // --- SCHEDE MAZZO ---
  for (let i = 0; i < cards.length; i++) {
    const ctx = enrichCard(cards[i], "../../", common, cards[i - 1], cards[i + 1]);
    const title = `${cards[i].title || "Mazzo n. " + cards[i].num} — ${siteTitle}`;
    writePage(distDir, join("mazzo", cards[i].id, "index.html"), wrapPage(render(tplMazzo, ctx), title));
    pages++;
  }

  // --- Copia asset e dati ---
  const nAssets = copyDir(assetsDir, join(distDir, "assets"));
  mkdirSync(join(distDir, "data"), { recursive: true });
  copyFileSync(dataFile, join(distDir, "data", "cards.json"));
  // NON copiare data/source.csv né data/categories.json (privacy/inutili).

  // Su GitHub Pages evita che Jekyll reinterpreti l'output.
  writeFileSync(join(distDir, ".nojekyll"), "");

  return { pages, cardPages: cards.length, nAssets, distDir };
}

// Esecuzione diretta
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const r = build();
    console.log(`OK  ${r.pages} pagine generate in ${relative(ROOT, r.distDir) || r.distDir}`);
    console.log(`    home + catalogo + ${r.cardPages} schede mazzo | ${r.nAssets} file asset copiati`);
  } catch (e) {
    if (e.code === "NO_TEMPLATES") { console.error(`ATTENZIONE  ${e.message}`); process.exit(1); }
    throw e;
  }
}
