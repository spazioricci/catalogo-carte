# CLAUDE.md — Catalogo Carte di Luigi

## Cos'è
Sito web **statico, leggero e professionale** per consultare la collezione di ~1240 mazzi di
carte da gioco di Luigi. I dati provengono da un'app Google AppSheet appoggiata al foglio Google
"Catalogo Carte" (`1NajnJ4CuYMpUzt5V0pxTk3lHqk7KLznJ-iyFBdwht1U`, proprietà `gigiricci21@gmail.com`).
Le immagini stanno nella cartella Drive `Database_Images` (accanto al foglio).

Online su **https://spazioricci.github.io/catalogo-carte/** (GitHub Pages, repo pubblico
`spazioricci/catalogo-carte`). Si aggiorna da solo ogni notte. Due lingue: **italiano**
(radice del sito) e **inglese** (`/en/`), con bandierina di scambio nella barra in alto.

## Stack e filosofia
- **Nessun framework, nessun DB a runtime.** Sito statico generato da dati.
- Node 24 (già presente). Unica dipendenza: `sharp` (thumbnail immagini).
- Il catalogo si aggiorna raramente → build on-demand, non server dinamico.

## Struttura
```
data/
  source.csv        # export CSV del foglio (SORGENTE PRIVATA, non servita)
  cards.json        # dataset pubblico normalizzato (generato) — servito al client
  categories.json   # mapping codice categoria -> nome (editabile a mano)
  _drive_manifest.json # mappa nome file -> ID Drive (generata da fetch-drive.mjs)
scripts/
  fetch-sheet.mjs   # foglio Google -> data/source.csv (export CSV pubblico, no credenziali)
  sync-data.mjs     # source.csv (+ categories.json) -> data/cards.json
  fetch-drive.mjs   # elenca la cartella Drive -> _drive_manifest.json; scarica le immagini
                    #   MANCANTI in data/_images_src (delta, non tutte)
  fetch-images.mjs  # data/_images_src -> assets/img/full + thumb con sharp (idempotente)
  i18n.mjs          # dizionari it/en: stringhe UI + continenti, nazioni, categorie
  build.mjs         # templates + cards.json -> dist/ (una volta per lingua)
  serve.mjs         # static server di dist/ (porta 8080, override con env PORT)
.github/workflows/deploy.yml  # cron 24h: aggiorna, ricostruisce, pubblica su Pages
templates/          # HTML template (home, catalogo, scheda mazzo) — resi 2 volte, uno per lingua
assets/css assets/js assets/img/{full,thumb}
dist/               # output statico servito
  index.html catalogo/ mazzo/<id>/ data/cards.json    # italiano
  en/index.html en/catalogo/ en/mazzo/<id>/ en/data/cards.json  # inglese
  assets/           # condivisi dalle due lingue (le immagini NON sono duplicate)
```

## Schema di data/cards.json
```jsonc
{
  "generatedAt": "ISO",
  "count": 1244,
  "categories": { "<codice>": "<nome>" },
  "continents": ["Africa","Americhe","Asia","Europa","Oceania"],
  "cards": [{
    "id": "5550edde",           // hex univoco (dal foglio)
    "num": 1222,                 // N. progressivo
    "title": "Big Five",
    "cover": "5550edde.Immagine.114205.jpg",  // basename in assets/img/{full,thumb}
    "deck": "5550edde.Mazzo.222000.jpg",       // oppure null
    "continent": "Africa",
    "country": "Kenya",
    "categoryCode": "994a3300",
    "category": "Turismo e Paesaggi",
    "type": "POKER",             // colonna Tag (tipo mazzo/produttore)
    "usState": "",               // colonna "Stati Uniti" (raro)
    "trivia": {                   // presente solo se il foglio ha testo Curiosità
      "deckName": "...", "producer": "...", "year": "...",
      "notes": ["curiosità 1", "curiosità 2", ...]
    }
  }]
}
```

## PRIVACY — regola invariabile
Il campo **"Ipotesi di valore di vendita"** presente in alcune Curiosità è **sensibile**:
- NON deve finire in `cards.json` (che è pubblico/servito al client).
- `sync-data.mjs` lo estrae e lo **scarta**; non va mai renderizzato a schermo.
- `data/source.csv` è in `.gitignore`: **non si committa mai**, né finisce in `dist/`.
  In CI vive solo nel workspace effimero di GitHub Actions.

## Comandi
```bash
npm run sheet   # scarica il foglio Google -> data/source.csv
npm run sync    # rigenera data/cards.json da data/source.csv
npm run drive   # rigenera il manifest Drive e scarica le immagini nuove
npm run images  # genera assets/img/full + thumb dagli originali
npm run build   # genera dist/
npm run serve   # serve dist/ su http://0.0.0.0:8080
npm run all     # sheet + sync + drive + images + build (la stessa catena della CI)
```

## Aggiornare i dati
**Non serve fare nulla**: GitHub Actions esegue `.github/workflows/deploy.yml` ogni notte alle 03:00 UTC
(più a ogni push su `main`, più a mano dal pulsante "Run workflow"). Il job scarica il foglio, rigenera
`cards.json`, scarica da Drive **solo le immagini nuove**, ricommitta i dati aggiornati e pubblica su Pages.

In locale l'equivalente è `npm run all && npm run serve`.

## Accessi (nessuna credenziale, nessun secret)
Tutto passa da risorse Google condivise pubblicamente in lettura — niente API key, niente OAuth:
- **Foglio**: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv`
- **Cartella immagini** (`12JyJqpgnLRsZRJY3ENxP0TkXAw8IWgfC`): l'elenco completo (2958 file) arriva da
  `https://drive.google.com/embeddedfolderview?id=<ID>#list`, i singoli file da `uc?export=download&id=<fileId>`.

Se un giorno Luigi togliesse la condivisione pubblica, `fetch-sheet.mjs` / `fetch-drive.mjs` **falliscono
apposta** (exit ≠ 0) invece di pubblicare dati monchi: il workflow diventa rosso e il sito resta all'ultima
versione buona.

## GitHub Pages — impostazione da non toccare
In **Settings → Pages** la sorgente **deve restare "GitHub Actions"**, non "Deploy from a branch".
Con "branch" Pages pubblica la *radice del repo* (che non ha `index.html`: home in 404, mentre
immagini e `cards.json` risponderebbero comunque, sintomo ingannevole) invece dell'artefatto `dist/`.
Non va impostata da codice: `actions/configure-pages` ha un'opzione `enablement: true` che
**riporta la sorgente su branch**. Non usarla — c'è già un commento nel workflow che lo ricorda.

## Lingue (it / en)
- L'italiano è la **lingua sorgente**: i dati arrivano in italiano dal foglio di Luigi.
- `scripts/i18n.mjs` contiene tutto il tradotto: stringhe di interfaccia (`UI.it` / `UI.en`) e i
  vocabolari **chiusi** — 5 continenti, 87 nazioni, 14 categorie. `build.mjs` rende gli stessi
  template due volte e scrive `dist/en/data/cards.json` con quei campi già tradotti.
- **Restano in italiano** anche sul sito inglese: titoli dei mazzi e colonna Tag (nomi propri) e il
  testo libero delle **Curiosità**, che sulle schede EN ha il badge "in Italian" e `lang="it"`.
- Un valore nuovo nel foglio (una nazione mai vista) **non rompe niente**: se manca dal dizionario
  resta in italiano. Per tradurlo basta aggiungere la voce in `i18n.mjs`.
- Nuove stringhe di interfaccia: mai scriverle nei template: aggiungere la chiave a `UI.it`/`UI.en`
  e usare `{{t.chiave}}`. Le stringhe del catalogo lato client stanno in `UI.<lang>.js`.

## Convenzioni template (contratto design ↔ build)
- I template in `templates/` usano token `{{campo}}`; `build.mjs` ripete i blocchi `{{#array}}…{{/array}}`
  per ogni card. Vedi `docs/CONTRACT.md` e i commenti dentro i template per l'elenco dei token.
- **`{{base}}` ≠ `{{home}}`**: `base` è la radice del *sito* (solo asset, condivisi fra le lingue),
  `home` la radice della *lingua* (tutti i link interni e `data/cards.json`). Usare `base` per un
  link interno spedisce il lettore inglese sulla pagina italiana.
- Pagine generate: `dist/index.html`, `dist/catalogo/index.html`, `dist/mazzo/<id>/index.html`
  (e le stesse sotto `dist/en/`).
- Il filtraggio/ricerca del catalogo è **lato client** leggendo il `cards.json` della lingua.

## Mapping categorie (ipotesi, correggibili in data/categories.json)
az3=Pubblicità e Aziende · 994a3300=Turismo e Paesaggi · b6152b31=Arte e Cultura · 7496aab6=Sport ·
38dbcf94=Storia e Personaggi · az1=Città · 7fd4fd31=Aviazione e Trasporti · az7=Monumenti e Architettura ·
a9b11345=Bevande e Alcolici · 1227f527=Fumetti e Cartoon · 04d748dd=Stati USA · 88a660a2=Riviste e Editoria ·
4ef8cdb4=Carte Tradizionali (Naipes) · 8eabbd62=Non categorizzato

## Note dataset
- ~1244 mazzi validi (righe vuote scartate). Continenti: Africa, Americhe, Asia, Europa, Oceania
  (la voce "Australia" nel foglio va normalizzata a Oceania). 88 nazioni.
- Tutti hanno Copertina; ~146 senza foto `Mazzo`; solo ~37 hanno testo Curiosità ricco.
