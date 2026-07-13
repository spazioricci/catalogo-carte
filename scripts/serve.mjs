// serve.mjs — static file server di dist/. Solo moduli core di Node, zero dipendenze.
// Porta da env PORT (default 8080), host 0.0.0.0. URL "pulite" -> index.html.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function tryFile(p) {
  try {
    const s = await stat(p);
    if (s.isFile()) return p;
    if (s.isDirectory()) {
      const idx = join(p, "index.html");
      const si = await stat(idx).catch(() => null);
      if (si && si.isFile()) return idx;
    }
  } catch { /* non esiste */ }
  return null;
}

const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    // Normalizza e impedisci path traversal fuori da DIST.
    let rel = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    let target = join(DIST, rel);
    if (!target.startsWith(DIST)) { res.writeHead(403).end("403 Forbidden"); return; }

    let file = await tryFile(target);
    // URL pulita senza slash finale: prova la cartella con index.html.
    if (!file && !extname(target)) file = await tryFile(join(target, "index.html"));

    if (!file) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>404</h1><p>Pagina non trovata.</p>");
      return;
    }

    const body = await readFile(file);
    const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Content-Length": body.length });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500 Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Catalogo Carte servito su http://${HOST}:${PORT}/  (dist: ${DIST})`);
  console.log(`Ferma con Ctrl+C. Cambia porta con env PORT.`);
});
