// i18n.mjs — dizionari per le due lingue del sito.
// L'italiano è la lingua sorgente (i dati arrivano in italiano dal foglio di Luigi).
// L'inglese traduce l'interfaccia e i vocabolari CHIUSI: continenti, nazioni, categorie.
// Restano in italiano (per scelta): i titoli dei mazzi (nomi propri), la colonna Tag
// (produttori) e il testo libero delle Curiosità, segnalato con un badge di lingua.

export const LANGS = ["it", "en"];

// Directory di output relativa a dist/: l'italiano sta in radice, l'inglese sotto en/.
export const langDir = (lang) => (lang === "it" ? "" : `${lang}/`);

// ---------------------------------------------------------------------------
// Vocabolari chiusi. Chiave = valore italiano così com'è in cards.json.
// Se un giorno il foglio introduce un valore nuovo, translate() lo lascia invariato:
// meglio una parola in italiano che una pagina rotta.
// ---------------------------------------------------------------------------

export const CONTINENTS = {
  Africa: "Africa",
  Americhe: "Americas",
  Asia: "Asia",
  Europa: "Europe",
  Oceania: "Oceania",
};

export const CATEGORIES = {
  "Pubblicità e Aziende": "Advertising & Brands",
  "Turismo e Paesaggi": "Tourism & Landscapes",
  "Arte e Cultura": "Art & Culture",
  "Sport": "Sport",
  "Storia e Personaggi": "History & Figures",
  "Città": "Cities",
  "Aviazione e Trasporti": "Aviation & Transport",
  "Monumenti e Architettura": "Monuments & Architecture",
  "Bevande e Alcolici": "Drinks & Spirits",
  "Fumetti e Cartoon": "Comics & Cartoons",
  "Stati USA": "US States",
  "Riviste e Editoria": "Magazines & Publishing",
  "Carte Tradizionali (Naipes)": "Traditional Cards (Naipes)",
  "Non categorizzato": "Uncategorised",
};

export const COUNTRIES = {
  "Albania": "Albania",
  "Algeria": "Algeria",
  "Andorra": "Andorra",
  "Argentina": "Argentina",
  "Aruba": "Aruba",
  "Australia": "Australia",
  "Austria": "Austria",
  "Bahamas": "Bahamas",
  "Bahrain": "Bahrain",
  "Barbados": "Barbados",
  "Belgio": "Belgium",
  "Brasile": "Brazil",
  "Brunei": "Brunei",
  "Bulgaria": "Bulgaria",
  "Canada": "Canada",
  "Cile": "Chile",
  "Cina": "China",
  "Città del Vaticano": "Vatican City",
  "Corea del Sud": "South Korea",
  "Costa Rica": "Costa Rica",
  "Croazia": "Croatia",
  "Curaçao": "Curaçao",
  "Danimarca": "Denmark",
  "Ecuador": "Ecuador",
  "Egitto": "Egypt",
  "Emirati Arabi Uniti": "United Arab Emirates",
  "Estonia": "Estonia",
  "eSwatini": "Eswatini",
  "Figi": "Fiji",
  "Filippine": "Philippines",
  "Finlandia": "Finland",
  "Francia": "France",
  "Germania": "Germany",
  "Giamaica": "Jamaica",
  "Giappone": "Japan",
  "Giordania": "Jordan",
  "Grecia": "Greece",
  "Grenada": "Grenada",
  "Hong Kong": "Hong Kong",
  "Indonesia": "Indonesia",
  "Irlanda": "Ireland",
  "Islanda": "Iceland",
  "Isole Cayman": "Cayman Islands",
  "Isole Vergini Americane": "US Virgin Islands",
  "Israele": "Israel",
  "Italia": "Italy",
  "Kenya": "Kenya",
  "Lettonia": "Latvia",
  "Libano": "Lebanon",
  "Liechtenstein": "Liechtenstein",
  "Maldive": "Maldives",
  "Malesia": "Malaysia",
  "Malta": "Malta",
  "Marocco": "Morocco",
  "Messico": "Mexico",
  "Namibia": "Namibia",
  "Norvegia": "Norway",
  "Nuova Zelanda": "New Zealand",
  "Paesi Bassi": "Netherlands",
  "Panama": "Panama",
  "Polinesia Francese": "French Polynesia",
  "Polonia": "Poland",
  "Porto Rico": "Puerto Rico",
  "Portogallo": "Portugal",
  "Principato di Monaco": "Monaco",
  "Regno Unito": "United Kingdom",
  "Repubblica Ceca": "Czech Republic",
  "Repubblica Dominicana": "Dominican Republic",
  "Romania": "Romania",
  "Russia": "Russia",
  "San Marino": "San Marino",
  "Seychelles": "Seychelles",
  "Singapore": "Singapore",
  "Spagna": "Spain",
  "Sri Lanka": "Sri Lanka",
  "Stati Uniti d'America": "United States",
  "Sudafrica": "South Africa",
  "Svezia": "Sweden",
  "Svizzera": "Switzerland",
  "Taiwan": "Taiwan",
  "Tanzania": "Tanzania",
  "Thailandia": "Thailand",
  "Turchia": "Turkey",
  "Ucraina": "Ukraine",
  "Ungheria": "Hungary",
  "Venezuela": "Venezuela",
  "Vietnam": "Vietnam",
};

// ---------------------------------------------------------------------------
// Stringhe di interfaccia. Le chiavi finiscono nei template come {{t.chiave}}
// e in catalogo.js come JSON (chiavi js.*).
// ---------------------------------------------------------------------------

export const UI = {
  it: {
    lang: "it",
    locale: "it-IT",
    siteTitle: "Catalogo Carte di Luigi",
    brandA: "Catalogo",
    brandB: "Carte",
    navHome: "Home",
    navCatalog: "Catalogo",
    themeToggle: "Cambia tema",
    // Bandierina che porta all'ALTRA lingua.
    altFlag: "🇬🇧",
    altName: "English",
    altTitle: "Switch to English",

    homeEyebrow: "Collezione privata di Luigi",
    homeH1: "Un <em>archivio</em> di carte da gioco dal mondo",
    homeLead: "Oltre milleduecento mazzi raccolti in anni di ricerca: souvenir, edizioni d'autore, carte tradizionali e rarità da ogni continente. Sfogliali per nazione, categoria o produttore.",
    statDecks: "Mazzi",
    statCountries: "Nazioni",
    statContinents: "Continenti",
    statCategories: "Categorie",
    featuredEyebrow: "Con curiosità e schede",
    featuredTitle: "Mazzi in evidenza",
    featuredLink: "Vedi tutto il catalogo &rarr;",
    continentsEyebrow: "Sfoglia per provenienza",
    continentsTitle: "Continenti",
    categoriesEyebrow: "Sfoglia per tema",
    categoriesTitle: "Categorie",
    footerDecks: "mazzi catalogati",
    footerPrivate: "Collezione privata",

    catalogTitle: "Catalogo",
    catalogEyebrow: "L'intera collezione",
    catalogH1: "Catalogo dei mazzi",
    catalogLead: "mazzi da sfogliare, filtrare e cercare.",
    searchLabel: "Cerca",
    searchPlaceholder: "Cerca per titolo, nazione, produttore…",
    filterContinent: "Filtra per continente",
    filterCountry: "Filtra per nazione",
    filterCategory: "Filtra per categoria",
    filterType: "Filtra per tipo",
    sortLabel: "Ordina",
    sortNumAsc: "N. crescente",
    sortNumDesc: "N. decrescente",
    sortTitleAsc: "Titolo A&rarr;Z",
    sortTitleDesc: "Titolo Z&rarr;A",
    sortCountry: "Nazione",
    reset: "Azzera",
    resultsFound: "mazzi trovati",

    breadcrumb: "Percorso",
    deckNo: "Mazzo n.",
    coverCaption: "Copertina",
    deckCaption: "Il mazzo",
    zoomCover: "Ingrandisci la copertina",
    zoomDeck: "Ingrandisci la foto del mazzo",
    altCover: "Copertina di",
    altDeck: "Foto del mazzo",
    metaCountry: "Nazione",
    metaContinent: "Continente",
    metaCategory: "Categoria",
    metaType: "Tipo",
    metaUsState: "Stato USA",
    metaRef: "Riferimento",
    refNo: "N.",
    triviaTitle: "Curiosità",
    triviaLangNote: "", // in italiano non serve avviso: è la lingua originale
    triviaDeckName: "Nome mazzo",
    triviaProducer: "Produttore",
    triviaYear: "Anno",
    navPrev: "&larr; Precedente",
    navNext: "Successivo &rarr;",
    deckNav: "Naviga tra i mazzi",
    lightbox: "Immagine ingrandita",
    close: "Chiudi",

    js: {
      allContinents: "Tutti i continenti",
      allCountries: "Tutte le nazioni",
      allCategories: "Tutte le categorie",
      allTypes: "Tutti i tipi",
      empty: "Nessun mazzo corrisponde ai criteri scelti.",
      error: "Impossibile caricare il catalogo. Riprova più tardi.",
      deckNo: "Mazzo n.",
    },
  },

  en: {
    lang: "en",
    locale: "en-GB",
    siteTitle: "Luigi's Playing Card Catalogue",
    brandA: "Card",
    brandB: "Catalogue",
    navHome: "Home",
    navCatalog: "Catalogue",
    themeToggle: "Switch theme",
    altFlag: "🇮🇹",
    altName: "Italiano",
    altTitle: "Passa all'italiano",

    homeEyebrow: "Luigi's private collection",
    homeH1: "An <em>archive</em> of playing cards from around the world",
    homeLead: "More than twelve hundred decks gathered over years of searching: souvenirs, artist editions, traditional cards and rarities from every continent. Browse them by country, category or maker.",
    statDecks: "Decks",
    statCountries: "Countries",
    statContinents: "Continents",
    statCategories: "Categories",
    featuredEyebrow: "With trivia and notes",
    featuredTitle: "Featured decks",
    featuredLink: "See the whole catalogue &rarr;",
    continentsEyebrow: "Browse by origin",
    continentsTitle: "Continents",
    categoriesEyebrow: "Browse by theme",
    categoriesTitle: "Categories",
    footerDecks: "decks catalogued",
    footerPrivate: "Private collection",

    catalogTitle: "Catalogue",
    catalogEyebrow: "The whole collection",
    catalogH1: "Deck catalogue",
    catalogLead: "decks to browse, filter and search.",
    searchLabel: "Search",
    searchPlaceholder: "Search by title, country, maker…",
    filterContinent: "Filter by continent",
    filterCountry: "Filter by country",
    filterCategory: "Filter by category",
    filterType: "Filter by type",
    sortLabel: "Sort",
    sortNumAsc: "No. ascending",
    sortNumDesc: "No. descending",
    sortTitleAsc: "Title A&rarr;Z",
    sortTitleDesc: "Title Z&rarr;A",
    sortCountry: "Country",
    reset: "Reset",
    resultsFound: "decks found",

    breadcrumb: "Breadcrumb",
    deckNo: "Deck no.",
    coverCaption: "Cover",
    deckCaption: "The deck",
    zoomCover: "Enlarge the cover",
    zoomDeck: "Enlarge the deck photo",
    altCover: "Cover of",
    altDeck: "Photo of deck",
    metaCountry: "Country",
    metaContinent: "Continent",
    metaCategory: "Category",
    metaType: "Type",
    metaUsState: "US state",
    metaRef: "Reference",
    refNo: "No.",
    triviaTitle: "Trivia",
    // I testi delle Curiosità arrivano dal foglio in italiano e non sono tradotti:
    // meglio dirlo al lettore che lasciarlo davanti a un blocco in lingua ignota.
    triviaLangNote: "in Italian",
    triviaDeckName: "Deck name",
    triviaProducer: "Maker",
    triviaYear: "Year",
    navPrev: "&larr; Previous",
    navNext: "Next &rarr;",
    deckNav: "Browse the decks",
    lightbox: "Enlarged image",
    close: "Close",

    js: {
      allContinents: "All continents",
      allCountries: "All countries",
      allCategories: "All categories",
      allTypes: "All types",
      empty: "No deck matches the selected filters.",
      error: "Could not load the catalogue. Please try again later.",
      deckNo: "Deck no.",
    },
  },
};

// Traduce un valore di vocabolario chiuso; se manca, restituisce l'originale.
const lookup = (map, value, lang) =>
  lang === "it" || !value ? value : (map[value] ?? value);

export const tContinent = (v, lang) => lookup(CONTINENTS, v, lang);
export const tCountry = (v, lang) => lookup(COUNTRIES, v, lang);
export const tCategory = (v, lang) => lookup(CATEGORIES, v, lang);

// Copia della card con i campi di vocabolario tradotti. Titolo, type e trivia
// restano invariati (nomi propri e testo libero del foglio).
export function translateCard(card, lang) {
  if (lang === "it") return card;
  return {
    ...card,
    continent: tContinent(card.continent, lang),
    country: tCountry(card.country, lang),
    category: tCategory(card.category, lang),
  };
}

// Il dataset servito al client, tradotto: stessa forma di cards.json.
export function translateDataset(data, lang) {
  if (lang === "it") return data;
  return {
    ...data,
    lang,
    categories: Object.fromEntries(
      Object.entries(data.categories).map(([code, name]) => [code, tCategory(name, lang)]),
    ),
    continents: data.continents.map((c) => tContinent(c, lang)),
    cards: data.cards.map((c) => translateCard(c, lang)),
  };
}
