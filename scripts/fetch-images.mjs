// fetch-images.mjs — prepara le immagini per il sito da una cartella LOCALE di origine.
// L'utente scarica la cartella Drive `Database_Images` come zip, la scompatta, e la indica qui.
// Genera: assets/img/thumb/<file> (lato lungo ~500px) e assets/img/full/<file> (originale ottimizzato).
// Idempotente: salta ciò che è già presente e aggiornato. Guidato da data/cards.json.
//
// Origine (in ordine di priorità): 1° argomento CLI, env IMG_SRC, default data/_images_src.
import {
  readFileSync, existsSync, mkdirSync, readdirSync, statSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, basename } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const THUMB_MAX = 500;
const EXITS = { OK: 0, SETUP: 2 };

const SRC = process.argv[2] || process.env.IMG_SRC || join(ROOT, "data", "_images_src");
const FULL_DIR = join(ROOT, "assets", "img", "full");
const THUMB_DIR = join(ROOT, "assets", "img", "thumb");
const DATA = join(ROOT, "data", "cards.json");

function die(msg) {
  console.error(`\n[fetch-images] ${msg}\n`);
  process.exit(EXITS.SETUP);
}

// --- Controlli preliminari (niente crash brutti) ---
let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  die(
    "Il modulo 'sharp' non è installato.\n" +
    "  Esegui:  npm install\n" +
    "  (sharp genera le miniature; è l'unica dipendenza del progetto)."
  );
}

if (!existsSync(SRC) || !statSync(SRC).isDirectory()) {
  die(
    `Cartella di origine non trovata: ${SRC}\n` +
    "  1) Scarica la cartella Drive 'Database_Images' come ZIP.\n" +
    "  2) Scompattala in  data/_images_src/  (i .jpg/.png devono stare direttamente lì dentro).\n" +
    "  Oppure indica un'altra cartella:  node scripts/fetch-images.mjs /percorso/della/cartella\n" +
    "  Oppure:  IMG_SRC=/percorso node scripts/fetch-images.mjs"
  );
}

if (!existsSync(DATA)) die(`data/cards.json non trovato. Esegui prima:  npm run sync`);

// --- Indicizza i file dell'origine (per basename, case-insensitive) ---
const VALID_EXT = new Set([".jpg", ".jpeg", ".png"]);
const srcIndex = new Map();          // nome-lowercase -> path assoluto
function indexDir(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) indexDir(p);            // supporta sottocartelle
    else if (VALID_EXT.has(extname(entry).toLowerCase())) srcIndex.set(entry.toLowerCase(), p);
  }
}
indexDir(SRC);

mkdirSync(FULL_DIR, { recursive: true });
mkdirSync(THUMB_DIR, { recursive: true });

// --- Elenco file richiesti da cards.json ---
const data = JSON.parse(readFileSync(DATA, "utf-8"));
const wanted = new Set();
for (const c of data.cards) {
  if (c.cover) wanted.add(c.cover);
  if (c.deck) wanted.add(c.deck);
}

// upToDate: destinazione esiste ed è più recente della sorgente.
function upToDate(srcPath, dstPath) {
  if (!existsSync(dstPath)) return false;
  try { return statSync(dstPath).mtimeMs >= statSync(srcPath).mtimeMs; }
  catch { return false; }
}

let found = 0, missing = [], skipped = 0, wroteFull = 0, wroteThumb = 0, errors = 0;

for (const name of wanted) {
  const srcPath = srcIndex.get(name.toLowerCase());
  if (!srcPath) { missing.push(name); continue; }
  found++;

  const fullPath = join(FULL_DIR, name);
  const thumbPath = join(THUMB_DIR, name);
  const isPng = extname(name).toLowerCase() === ".png";

  try {
    if (!upToDate(srcPath, fullPath)) {
      const img = sharp(srcPath).rotate();       // rispetta orientamento EXIF
      const pipe = isPng
        ? img.png({ compressionLevel: 9 })
        : img.jpeg({ quality: 82, mozjpeg: true });
      await pipe.toFile(fullPath);
      wroteFull++;
    } else skipped++;

    if (!upToDate(srcPath, thumbPath)) {
      const img = sharp(srcPath).rotate().resize({
        width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true,
      });
      const pipe = isPng ? img.png({ compressionLevel: 9 }) : img.jpeg({ quality: 78, mozjpeg: true });
      await pipe.toFile(thumbPath);
      wroteThumb++;
    }
  } catch (e) {
    errors++;
    console.error(`  ERRORE su ${name}: ${e.message}`);
  }
}

// --- Orfane: file dell'origine non referenziati da cards.json ---
const orphans = [];
for (const [low, p] of srcIndex) {
  if (!wanted.has(basename(p))) orphans.push(basename(p));
}

// --- Riepilogo ---
console.log(`\n[fetch-images] origine: ${SRC}`);
console.log(`  richiesti da cards.json : ${wanted.size}`);
console.log(`  trovati                 : ${found}`);
console.log(`  full generati/aggiornati: ${wroteFull}   thumb: ${wroteThumb}   già aggiornati (full): ${skipped}`);
console.log(`  MANCANTI                : ${missing.length}`);
if (missing.length) console.log(`     ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? ` … (+${missing.length - 20})` : ""}`);
console.log(`  orfane (nell'origine, non usate): ${orphans.length}`);
if (orphans.length) console.log(`     ${orphans.slice(0, 20).join(", ")}${orphans.length > 20 ? ` … (+${orphans.length - 20})` : ""}`);
if (errors) console.log(`  errori di conversione   : ${errors}`);
console.log("");

process.exit(errors ? 1 : EXITS.OK);
