// Self-test del renderer e della build. Non tocca templates/ ufficiali.
import { render, slug, escapeHtml, build } from "../build.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, rmSync, existsSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  if (actual === expected) { pass++; }
  else { fail++; console.error(`FAIL ${msg}\n  atteso: ${JSON.stringify(expected)}\n  avuto:  ${JSON.stringify(actual)}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`FAIL ${msg}`); } }

// --- Renderer ---
eq(render("Ciao {{name}}", { name: "Luigi" }), "Ciao Luigi", "var semplice");
eq(render("{{html}}", { html: "<b>x</b>" }), "&lt;b&gt;x&lt;/b&gt;", "var escape");
eq(render("{{{html}}}", { html: "<b>x</b>" }), "<b>x</b>", "raw no-escape");
eq(render("{{missing}}", {}), "", "var mancante -> vuoto");
eq(render("{{#ok}}SI{{/ok}}", { ok: true }), "SI", "sezione truthy");
eq(render("{{#ok}}SI{{/ok}}", { ok: false }), "", "sezione falsy");
eq(render("{{#ok}}SI{{/ok}}", { ok: [] }), "", "sezione array vuoto = falsy");
eq(render("{{^ok}}NO{{/ok}}", { ok: false }), "NO", "inversa su falsy");
eq(render("{{^ok}}NO{{/ok}}", { ok: true }), "", "inversa su truthy");
eq(render("{{^ok}}NO{{/ok}}", { ok: [] }), "NO", "inversa su array vuoto");
eq(render("{{#items}}[{{.}}]{{/items}}", { items: ["a", "b", "c"] }), "[a][b][c]", "array di stringhe {{.}}");
eq(render("{{#items}}{{n}};{{/items}}", { items: [{ n: 1 }, { n: 2 }] }), "1;2;", "array di oggetti");
eq(render("{{#o}}{{base}}/{{k}}{{/o}}", { base: "R", o: { k: "x" } }), "R/x", "context stack: parent visibile in sezione");
eq(render("{{#a}}{{#b}}{{x}}{{/b}}{{/a}}", { a: { b: { x: "z" } } }), "z", "sezioni annidate");
eq(render("pre {{! ignore }} post", { }), "pre {{! ignore }} post", "token non gestito resta testo (nessun sigil valido -> var 'nome'?)"); // nota: {{! }} non è sintassi valida
eq(escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;", "escapeHtml completo");
eq(slug("Città  Perù—Test"), "citta-peru-test", "slug accenti+spazi");

// --- Build su template fittizi ---
const distDir = join(HERE, "_dist");
if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });
const r = build({
  tplDir: HERE,
  distDir,
  dataFile: join(HERE, "..", "..", "data", "cards.json"),
  assetsDir: join(HERE, "..", "..", "assets"),
});
ok(r.pages === r.cardPages + 2, `pagine totali = schede+2 (home+catalogo): ${r.pages} vs ${r.cardPages}+2`);
ok(existsSync(join(distDir, "index.html")), "dist/index.html esiste");
ok(existsSync(join(distDir, "catalogo", "index.html")), "dist/catalogo/index.html esiste");
ok(existsSync(join(distDir, "data", "cards.json")), "dist/data/cards.json copiato");
ok(!existsSync(join(distDir, "data", "source.csv")), "source.csv NON copiato (privacy)");
ok(!existsSync(join(distDir, "data", "categories.json")), "categories.json NON copiato");

const data = JSON.parse(readFileSync(join(HERE, "..", "..", "data", "cards.json"), "utf-8"));
const sampleId = data.cards.find((c) => c.trivia).id;
const mazzoPath = join(distDir, "mazzo", sampleId, "index.html");
ok(existsSync(mazzoPath), `scheda mazzo ${sampleId} esiste`);
const home = readFileSync(join(distDir, "index.html"), "utf-8");
const mazzo = readFileSync(mazzoPath, "utf-8");
ok(!/\{\{.*?\}\}/s.test(home), "home: nessun token {{...}} residuo");
ok(!/\{\{[#\/^&\w]/.test(mazzo), "mazzo: nessun token {{...}} residuo");
ok(!/valore di vendita/i.test(home + mazzo), "nessun 'valore di vendita' (privacy)");

rmSync(distDir, { recursive: true, force: true });

console.log(`\nSelf-test: ${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
