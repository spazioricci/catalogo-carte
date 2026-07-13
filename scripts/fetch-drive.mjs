// fetch-drive.mjs — rigenera la mappa nome→ID della cartella Drive `Database_Images`
// e scarica in data/_images_src/ SOLO le immagini che mancano (delta).
//
// La cartella è condivisa "chiunque con il link", quindi niente API key né OAuth:
// `embeddedfolderview` restituisce l'elenco completo in una sola risposta HTML.
// Poi `npm run images` (fetch-images.mjs) trasforma gli originali in full/ + thumb/.
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FOLDER_ID = process.env.DRIVE_FOLDER_ID || "12JyJqpgnLRsZRJY3ENxP0TkXAw8IWgfC";
const MANIFEST = join(ROOT, "data", "_drive_manifest.json");
const CARDS = join(ROOT, "data", "cards.json");
const SRC_DIR = join(ROOT, "data", "_images_src");
const FULL_DIR = join(ROOT, "assets", "img", "full");

const UA = "Mozilla/5.0";
const CONCURRENCY = 6;
const RETRIES = 3;
const MIN_BYTES = 2048;
// Sotto questa soglia il parsing è quasi certamente rotto (Google ha cambiato l'HTML):
// meglio fallire che sovrascrivere un manifest buono con uno monco.
const MIN_ENTRIES = 2000;
const EXITS = { OK: 0, SETUP: 2, FAIL: 1 };

function die(code, msg) {
  console.error(`\n[fetch-drive] ${msg}\n`);
  process.exit(code);
}

// --- 1. Elenco della cartella --------------------------------------------------

async function listFolder(folderId) {
  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) die(EXITS.SETUP, `La cartella Drive ha risposto HTTP ${res.status}. È ancora condivisa "chiunque con il link"?`);
  const html = await res.text();

  const map = {};
  for (const block of html.split('<div class="flip-entry"').slice(1)) {
    const id = block.match(/id="entry-([A-Za-z0-9_-]+)"/)?.[1];
    const name = block.match(/flip-entry-title">([^<]+)</)?.[1];
    if (id && name) map[name] = id;
  }
  return map;
}

// --- 2. Download del delta -----------------------------------------------------

function looksLikeImage(buf) {
  if (buf.length < MIN_BYTES) return false;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return jpeg || png;
}

async function download(name, id) {
  const url = `https://drive.google.com/uc?export=download&id=${id}`;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60_000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        // Se Drive risponde con l'interstiziale HTML ("impossibile eseguire la scansione
        // antivirus") il body non è un'immagine: si riprova.
        if (looksLikeImage(buf)) {
          writeFileSync(join(SRC_DIR, name), buf);
          return true;
        }
      }
    } catch { /* timeout o errore di rete: si riprova */ }
    if (attempt < RETRIES) await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  return false;
}

async function runPool(items, worker) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(workers);
}

// --- main ----------------------------------------------------------------------

if (!existsSync(CARDS)) die(EXITS.SETUP, "data/cards.json non trovato. Lancia prima `npm run sync`.");

const manifest = await listFolder(FOLDER_ID);
const nEntries = Object.keys(manifest).length;
if (nEntries < MIN_ENTRIES) {
  die(EXITS.SETUP, `Trovate solo ${nEntries} voci nella cartella Drive (attese ≥ ${MIN_ENTRIES}). ` +
    "Il formato HTML di Google è probabilmente cambiato: il manifest esistente NON è stato toccato.");
}
// Una voce per riga e chiavi ordinate: così il diff git mostra solo i file davvero nuovi.
const lines = Object.keys(manifest).sort()
  .map((k) => `${JSON.stringify(k)}: ${JSON.stringify(manifest[k])}`);
writeFileSync(MANIFEST, `{\n${lines.join(",\n")}\n}`);
console.log(`[fetch-drive] manifest: ${nEntries} file nella cartella Drive.`);

// Cosa serve al sito, e cosa abbiamo già.
const data = JSON.parse(readFileSync(CARDS, "utf-8"));
const needed = new Set();
for (const c of data.cards) {
  if (c.cover) needed.add(c.cover);
  if (c.deck) needed.add(c.deck);
}

mkdirSync(SRC_DIR, { recursive: true });
const haveFull = new Set(existsSync(FULL_DIR) ? readdirSync(FULL_DIR) : []);
const haveSrc = new Set(readdirSync(SRC_DIR));

const missing = [...needed].filter((n) => !haveFull.has(n) && !haveSrc.has(n));
const unknown = missing.filter((n) => !manifest[n]);
const toDownload = missing.filter((n) => manifest[n]);

if (unknown.length) {
  console.warn(`[fetch-drive] ATTENZIONE: ${unknown.length} immagini citate dal foglio non esistono su Drive:`);
  for (const n of unknown.slice(0, 10)) console.warn(`  - ${n}`);
}

if (!toDownload.length) {
  console.log("[fetch-drive] nessuna immagine nuova da scaricare.");
  process.exit(EXITS.OK);
}

console.log(`[fetch-drive] scarico ${toDownload.length} immagini nuove…`);
const failed = [];
let done = 0;
await runPool(toDownload, async (name) => {
  const ok = await download(name, manifest[name]);
  if (ok) console.log(`  ✓ ${++done}/${toDownload.length} ${name}`);
  else failed.push(name);
});

if (failed.length) {
  console.error(`[fetch-drive] ${failed.length} download falliti:`);
  for (const n of failed) console.error(`  ✗ ${n} (${manifest[n]})`);
  die(EXITS.FAIL, "Alcune immagini non sono state scaricate: il sito non verrà pubblicato con schede senza foto.");
}

console.log(`[fetch-drive] fatto — ${done} immagini nuove in data/_images_src/.`);
