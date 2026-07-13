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

## Due lingue: `{{base}}` e `{{home}}` non sono la stessa cosa
Ogni template è reso **due volte** (italiano in `dist/`, inglese in `dist/en/`), quindi
esistono due prefissi diversi e vanno usati per cose diverse:
- `{{base}}` → radice del **SITO**: solo per asset condivisi fra le lingue.
  `{{base}}assets/css/…`, `{{base}}assets/img/…`, `{{base}}assets/js/…`
- `{{home}}` → radice della **LINGUA**: tutti i link interni e i dati.
  `{{home}}catalogo/`, `{{home}}mazzo/<id>/`, `{{home}}data/cards.json`

Usare `{{base}}` per un link interno porterebbe l'utente inglese sulla pagina italiana.

| pagina            | it: base / home   | en: base / home        |
|-------------------|-------------------|------------------------|
| home              | `""` / `""`       | `"../"` / `""`         |
| `catalogo/`       | `"../"` / `"../"` | `"../../"` / `"../"`   |
| `mazzo/<id>/`     | `"../../"` × 2    | `"../../../"` / `"../../"` |

## Percorsi immagine (relativi alla root del sito servito)
- Copertina piena: `{{base}}assets/img/full/<cover>` — thumbnail: `{{base}}assets/img/thumb/<cover>`
- Foto mazzo piena: `{{base}}assets/img/full/<deck>` (può mancare)
Placeholder per immagini mancanti: `{{base}}assets/img/placeholder.svg` (lo fornisce il Design).

## Variabili per pagina

### Comuni a tutte le pagine
`siteTitle` (string, tradotto), `base`, `home`, `lang` (`"it"`/`"en"`),
`altUrl` (stessa pagina nell'altra lingua → bandierina in header),
`year` (string, anno corrente), `count` (int, tot mazzi),
`t` (dizionario della lingua: `{{t.navHome}}`, `{{t.metaCountry}}`, … vedi `scripts/i18n.mjs`).

**Nessuna stringa visibile va scritta a mano nei template**: se serve un testo nuovo,
si aggiunge una chiave a `UI.it` e `UI.en` in `scripts/i18n.mjs` e si usa `{{t.chiave}}`.
Le stringhe che contengono HTML (`&rarr;`, `<em>`) si rendono con `{{{t.chiave}}}`.

### templates/index.html (home → dist/index.html)
- `count`, `countCountries`, `countContinents`, `countCategories` (int)
- `continents`: array di `{ name, count, slug }` (slug = nome minuscolo senza accenti/spazi)
- `categories`: array di `{ code, name, count }` (ordinato per count desc)
- `featured`: array di card “in evidenza” (quelle con curiosità), ogni elemento con i campi CARD sotto.

### templates/catalogo.html (→ dist/catalogo/ e dist/en/catalogo/)
Guscio statico. La griglia, i filtri (Continente/Nazione/Categoria/Tipo), la ricerca e
l'ordinamento sono costruiti **lato client** da `assets/js/catalogo.js` leggendo `{{home}}data/cards.json`
(il dataset della lingua: quello inglese ha nazioni/continenti/categorie già tradotti).
Il template deve contenere: gli elementi dei filtri (possono essere popolati via JS), un input di ricerca,
un contenitore `<div id="grid"></div>` e un contatore risultati `<span id="count"></span>`.
`catalogo.js` è un unico file per entrambe le lingue: legge quel che gli serve dagli attributi di
`#catalog` → `data-base`, `data-home`, `data-locale`, `data-i18n` (JSON di `t.js`, token `{{i18nJson}}`).
Nessuna variabile card server-side qui.

### templates/mazzo.html (→ dist/mazzo/<id>/ e dist/en/mazzo/<id>/, una per card)
Contesto = una CARD con i campi (nella build inglese `continent`, `country` e `category`
arrivano già tradotti; `title`, `type` e `trivia` restano in italiano):
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
- Lingue: italiano (sorgente) e inglese, con bandierina di scambio in header (`{{altUrl}}`).
  Tutto responsive; nessuna richiesta di rete esterna (font/dati locali).
- Il catalogo deve reggere ~1244 elementi fluido (paginazione o rendering incrementale nel JS).
