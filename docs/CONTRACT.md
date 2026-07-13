# Contratto Design ↔ Build

Documento condiviso tra l'agente **Design** (front-end) e l'agente **Codice** (pipeline).
Non modificare i nomi dei token/variabili senza aggiornare qui.

## Sintassi template (mini-Mustache implementata da build.mjs)
`build.mjs` implementa un renderer minimale che supporta SOLO:
- `{{var}}` → valore con escape HTML
- `{{{var}}}` → valore RAW (HTML già pronto, nessun escape)
- `{{#section}} ... {{/section}}` → se `section` è vero/non vuoto rende il blocco;
  se è un array, RIPETE il blocco una volta per elemento usando l'elemento come contesto;
  dentro un array di stringhe, `{{.}}` è l'elemento corrente.
- `{{^section}} ... {{/section}}` → rende il blocco se `section` è falso/vuoto/array vuoto.
Niente altro (no logica, no filtri). I commenti HTML `<!-- ... -->` sono liberi.

## File di proprietà
- **Design**: `templates/index.html`, `templates/catalogo.html`, `templates/mazzo.html`,
  `templates/_partials/*` (opzionale), `assets/css/*.css`, `assets/js/*.js`.
- **Codice**: `scripts/build.mjs`, `scripts/serve.mjs`, `scripts/fetch-images.mjs`.

## Percorsi immagine (relativi alla root del sito servito)
- Copertina piena: `assets/img/full/<cover>` — thumbnail: `assets/img/thumb/<cover>`
- Foto mazzo piena: `assets/img/full/<deck>` (può mancare)
Ogni pagina riceve `{{base}}` = prefisso per tornare alla root:
`""` per la home, `"../"` per `/catalogo/`, `"../../"` per `/mazzo/<id>/`.
Usare SEMPRE `{{base}}assets/...`, `{{base}}catalogo/`, `{{base}}mazzo/<id>/`.
Placeholder per immagini mancanti: `{{base}}assets/img/placeholder.svg` (lo fornisce il Design).

## Variabili per pagina

### Comuni a tutte le pagine
`siteTitle` (string), `base` (string), `year` (string, anno corrente), `count` (int, tot mazzi).

### templates/index.html (home → dist/index.html)
- `count`, `countCountries`, `countContinents`, `countCategories` (int)
- `continents`: array di `{ name, count, slug }` (slug = nome minuscolo senza accenti/spazi)
- `categories`: array di `{ code, name, count }` (ordinato per count desc)
- `featured`: array di card “in evidenza” (quelle con curiosità), ogni elemento con i campi CARD sotto.

### templates/catalogo.html (→ dist/catalogo/index.html)
Guscio statico. La griglia, i filtri (Continente/Nazione/Categoria/Tipo), la ricerca e
l'ordinamento sono costruiti **lato client** da `assets/js/catalogo.js` leggendo `{{base}}data/cards.json`.
Il template deve contenere: gli elementi dei filtri (possono essere popolati via JS), un input di ricerca,
un contenitore `<div id="grid"></div>` e un contatore risultati `<span id="count"></span>`.
Nessuna variabile card server-side qui.

### templates/mazzo.html (→ dist/mazzo/<id>/index.html, una per card)
Contesto = una CARD con i campi:
- `id, num, title, continent, country, category, categoryCode, type, usState`
- `cover` (basename), `deck` (basename o vuoto)
- `hasDeck` (bool), `coverFull`, `coverThumb`, `deckFull` (stringhe di percorso già pronte con `{{base}}`)
- `trivia`: oggetto o assente. Se presente: `deckName`, `producer`, `year`, `notes` (array di stringhe).
  Usare `{{#trivia}}…{{/trivia}}` e dentro `{{#notes}}<li>{{.}}</li>{{/notes}}`.
- `prev`, `next`: `{ id, title }` per navigazione (possono mancare ai bordi).
- **PRIVACY**: NON esiste alcun campo “valore/prezzo”. Non inventarlo, non mostrarlo.

## Oggetto CARD (per griglia client-side, da data/cards.json)
Vedi CLAUDE.md per lo schema completo di `cards.json`. In `catalogo.js` i percorsi immagine
vanno composti come `assets/img/thumb/<cover>` (thumb in griglia) e link a `mazzo/<id>/`.

## Note UX minime richieste
- Lingua: italiano. Tutto responsive; nessuna richiesta di rete esterna (font/dati locali).
- Il catalogo deve reggere ~1244 elementi fluido (paginazione o rendering incrementale nel JS).
