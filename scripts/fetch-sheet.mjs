// fetch-sheet.mjs — scarica il foglio Google "Catalogo Carte" in data/source.csv.
// Il foglio è condiviso in lettura pubblica, quindi l'export CSV non richiede credenziali.
//
// ATTENZIONE PRIVACY: il CSV contiene "Ipotesi di valore di vendita". Resta locale,
// è in .gitignore e sync-data.mjs lo scarta prima di generare cards.json.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHEET_ID = process.env.SHEET_ID || "1NajnJ4CuYMpUzt5V0pxTk3lHqk7KLznJ-iyFBdwht1U";
const OUT = join(ROOT, "data", "source.csv");
const URL_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const HEADER = "ID,N. progressivo,Titolo";
const EXITS = { OK: 0, SETUP: 2 };

function die(msg) {
  console.error(`\n[fetch-sheet] ${msg}\n`);
  process.exit(EXITS.SETUP);
}

const res = await fetch(URL_CSV, { redirect: "follow" });
if (!res.ok) {
  die(`Il foglio ha risposto HTTP ${res.status}. Non è più pubblico, oppure l'ID è sbagliato.`);
}

const csv = await res.text();

// Se il foglio non è più condiviso, Google risponde 200 con una pagina di login HTML:
// meglio fallire qui che rigenerare cards.json da spazzatura.
if (!csv.startsWith(HEADER)) {
  const head = csv.slice(0, 120).replace(/\s+/g, " ");
  die(`Risposta inattesa (non inizia con "${HEADER}"). Il foglio è ancora condiviso "chiunque con il link"?\nRicevuto: ${head}…`);
}

writeFileSync(OUT, csv);
const rows = csv.split("\n").length;
console.log(`[fetch-sheet] data/source.csv aggiornato — ${csv.length} byte, ~${rows} righe.`);
