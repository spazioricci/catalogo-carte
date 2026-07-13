// sync-data.mjs — legge data/source.csv (export del foglio Google) e genera data/cards.json.
// Zero dipendenze. Normalizza i campi, risolve le categorie e RIMUOVE il valore di vendita (privacy).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "data", "source.csv");
const CATS = join(ROOT, "data", "categories.json");
const OUT = join(ROOT, "data", "cards.json");

// --- CSV parser (gestisce virgolette, virgole e newline nei campi) ---
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const stripImg = (p) => (p || "").trim().replace(/^Database_Images\//, "") || null;

// Estrae i sotto-campi dal testo "Curiosità". Scarta la riga del valore di vendita.
function parseTrivia(raw) {
  const text = (raw || "").trim();
  if (!text) return null;
  const t = { deckName: "", producer: "", year: "", notes: [] };
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let inNotes = false;
  for (const line of lines) {
    if (/valore di vendita/i.test(line)) continue;            // PRIVACY: scarta il valore
    if (/^nome del mazzo\s*:/i.test(line)) { t.deckName = line.split(/:/).slice(1).join(":").trim(); continue; }
    if (/^produttore\s*:/i.test(line)) { t.producer = line.split(/:/).slice(1).join(":").trim(); continue; }
    if (/^anno\s*:/i.test(line)) { t.year = line.split(/:/).slice(1).join(":").trim(); continue; }
    if (/^curiosit[aà]\s*:?\s*$/i.test(line)) { inNotes = true; continue; }
    const m = line.match(/^\d+\s*[.)]\s*(.+)$/);              // punto elenco numerato
    if (m) { t.notes.push(m[1].trim()); inNotes = true; continue; }
    if (inNotes && t.notes.length) t.notes[t.notes.length - 1] += " " + line; // continua nota precedente
  }
  const hasContent = t.deckName || t.producer || t.year || t.notes.length;
  return hasContent ? t : null;
}

const normContinent = (c) => {
  c = (c || "").trim();
  if (c === "Australia") return "Oceania";  // "Australia" è nazione, non continente
  return c;
};

const catMap = JSON.parse(readFileSync(CATS, "utf-8"));
const rows = parseCSV(readFileSync(SRC, "utf-8"));
const header = rows.shift().map((h) => h.trim());
const col = (name) => header.indexOf(name);
const idx = {
  id: col("ID"), num: col("N. progressivo"), title: col("Titolo"),
  cover: col("Copertina"), deck: col("Mazzo"), continent: col("Continente"),
  country: col("Nazione"), category: col("Categoria"), tag: col("Tag"),
  usState: col("Stati Uniti"), trivia: col("Curiosità"),
};

const cards = [];
const seen = new Set();
for (const r of rows) {
  const id = (r[idx.id] || "").trim();
  if (!id || seen.has(id)) continue;
  seen.add(id);
  const categoryCode = (r[idx.category] || "").trim();
  cards.push({
    id,
    num: Number((r[idx.num] || "").trim()) || null,
    title: (r[idx.title] || "").trim(),
    cover: stripImg(r[idx.cover]),
    deck: stripImg(r[idx.deck]),
    continent: normContinent(r[idx.continent]),
    country: (r[idx.country] || "").trim(),
    categoryCode,
    category: catMap[categoryCode] || "Non categorizzato",
    type: (r[idx.tag] || "").trim(),
    usState: (r[idx.usState] || "").trim(),
    trivia: parseTrivia(r[idx.trivia]),
  });
}

cards.sort((a, b) => (a.title || "").localeCompare(b.title || "", "it"));

const continents = [...new Set(cards.map((c) => c.continent).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
const out = {
  generatedAt: new Date().toISOString(),
  count: cards.length,
  categories: catMap,
  continents,
  cards,
};
writeFileSync(OUT, JSON.stringify(out, null, 2));

// Riepilogo a schermo
const withTrivia = cards.filter((c) => c.trivia).length;
const noDeck = cards.filter((c) => !c.deck).length;
console.log(`OK  ${cards.length} mazzi -> ${OUT}`);
console.log(`    continenti: ${continents.join(", ")}`);
console.log(`    con curiosità: ${withTrivia} | senza foto mazzo: ${noDeck}`);
