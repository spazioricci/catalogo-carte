/* =========================================================================
   Catalogo lato client — legge data/cards.json e costruisce griglia,
   filtri (Continente, Nazione, Categoria, Tipo), ricerca e ordinamento.
   Rendering incrementale (batch + IntersectionObserver) per reggere ~1244 card.
   Nessuna dipendenza esterna, nessuna richiesta di rete oltre al JSON locale.
   ========================================================================= */
(function () {
  var root = document.getElementById("catalog");
  if (!root) return;
  /* BASE = radice del sito (immagini, condivise fra le lingue).
     HOME = radice della lingua: link alle schede e dataset tradotto.
     T    = stringhe della lingua, iniettate dal template (scripts/i18n.mjs). */
  var BASE = root.getAttribute("data-base") || "";
  var HOME = root.getAttribute("data-home") || "";
  var LOCALE = root.getAttribute("data-locale") || "it-IT";
  var T = JSON.parse(root.getAttribute("data-i18n") || "{}");
  var BATCH = 60;

  var elGrid    = document.getElementById("grid");
  var elCount   = document.getElementById("count");
  var elTotal   = document.getElementById("total");
  var elSearch  = document.getElementById("q");
  var elCont    = document.getElementById("f-continent");
  var elCountry = document.getElementById("f-country");
  var elCat     = document.getElementById("f-category");
  var elType    = document.getElementById("f-type");
  var elSort    = document.getElementById("f-sort");
  var elReset   = document.getElementById("reset");
  var elSentinel= document.getElementById("sentinel");

  var ALL = [];
  var view = [];
  var shown = 0;

  function norm(s) {
    return (s || "").toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function esc(s) {
    return (s || "").toString()
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function option(value, label) {
    var o = document.createElement("option");
    o.value = value; o.textContent = label;
    return o;
  }

  function fillSelect(sel, values, allLabel) {
    values.sort(function (a, b) { return a.localeCompare(b, LOCALE); });
    sel.appendChild(option("", allLabel));
    values.forEach(function (v) { sel.appendChild(option(v, v)); });
  }

  function buildFilters() {
    var continents = {}, countries = {}, categories = {}, types = {};
    ALL.forEach(function (c) {
      if (c.continent) continents[c.continent] = 1;
      if (c.country)   countries[c.country] = 1;
      if (c.category)  categories[c.category] = 1;
      if (c.type)      types[c.type] = 1;
    });
    fillSelect(elCont,    Object.keys(continents), T.allContinents);
    fillSelect(elCountry, Object.keys(countries),  T.allCountries);
    fillSelect(elCat,     Object.keys(categories), T.allCategories);
    fillSelect(elType,    Object.keys(types),      T.allTypes);
  }

  function apply() {
    var q = norm(elSearch.value.trim());
    var fc = elCont.value, fn = elCountry.value, fk = elCat.value, ft = elType.value;

    view = ALL.filter(function (c) {
      if (fc && c.continent !== fc) return false;
      if (fn && c.country !== fn) return false;
      if (fk && c.category !== fk) return false;
      if (ft && c.type !== ft) return false;
      if (q) {
        var hay = c._search || (c._search = norm(
          [c.title, c.country, c.category, c.type, c.continent, c.num].join(" ")
        ));
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    var sort = elSort.value;
    view.sort(function (a, b) {
      switch (sort) {
        case "num-desc":   return b.num - a.num;
        case "title-asc":  return (a.title || "￿").localeCompare(b.title || "￿", LOCALE);
        case "title-desc": return (b.title || "").localeCompare(a.title || "", LOCALE);
        case "country":    return (a.country || "").localeCompare(b.country || "", LOCALE) || a.num - b.num;
        default:           return a.num - b.num; /* num-asc */
      }
    });

    elGrid.innerHTML = "";
    shown = 0;
    elCount.textContent = view.length.toLocaleString(LOCALE);

    if (view.length === 0) {
      elGrid.innerHTML = '<div class="empty"><div class="suits"><span class="s-blk">♠</span> <span class="s-red">♥</span> <span class="s-red">♦</span> <span class="s-blk">♣</span></div>' + esc(T.empty) + '</div>';
      return;
    }
    renderMore();
  }

  function cardHTML(c) {
    var img = BASE + "assets/img/thumb/" + encodeURIComponent(c.cover);
    var ph  = BASE + "assets/img/placeholder.svg";
    var title = c.title && c.title.trim() ? esc(c.title) : T.deckNo + " " + c.num;
    var country = c.country ? '<span class="country">' + esc(c.country) + "</span>" : "";
    var type = c.type ? '<span class="tag">' + esc(c.type) + "</span>" : "";
    return '<a class="deck-card" href="' + HOME + "mazzo/" + encodeURIComponent(c.id) + '/">' +
      '<div class="frame">' +
        '<span class="num">' + c.num + "</span>" +
        '<img loading="lazy" decoding="async" src="' + img + '" alt="' + title + '" ' +
          "onerror=\"this.onerror=null;this.src='" + ph + "'\">" +
      "</div>" +
      '<div class="body">' +
        '<div class="title">' + title + "</div>" +
        '<div class="meta">' + country + type + "</div>" +
      "</div></a>";
  }

  function renderMore() {
    if (shown >= view.length) return;
    var end = Math.min(shown + BATCH, view.length);
    var html = "";
    for (var i = shown; i < end; i++) html += cardHTML(view[i]);
    elGrid.insertAdjacentHTML("beforeend", html);
    shown = end;
  }

  function resetAll() {
    elSearch.value = "";
    elCont.value = elCountry.value = elCat.value = elType.value = "";
    elSort.value = "num-asc";
    apply();
  }

  /* debounce ricerca */
  var t;
  function debounced() { clearTimeout(t); t = setTimeout(apply, 140); }

  function init(data) {
    ALL = data.cards || [];
    if (elTotal) elTotal.textContent = ALL.length.toLocaleString(LOCALE);
    buildFilters();

    /* pre-seleziona filtro da querystring (?continente= / ?categoria=) */
    var p = new URLSearchParams(location.search);
    if (p.get("continente")) elCont.value = p.get("continente");
    if (p.get("nazione"))    elCountry.value = p.get("nazione");
    if (p.get("categoria"))  elCat.value = p.get("categoria");

    elSearch.addEventListener("input", debounced);
    [elCont, elCountry, elCat, elType, elSort].forEach(function (s) {
      s.addEventListener("change", apply);
    });
    elReset.addEventListener("click", resetAll);

    if ("IntersectionObserver" in window && elSentinel) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) renderMore();
      }, { rootMargin: "600px" }).observe(elSentinel);
    }

    apply();
  }

  fetch(HOME + "data/cards.json")
    .then(function (r) { return r.json(); })
    .then(init)
    .catch(function () {
      elGrid.innerHTML = '<div class="empty">' + esc(T.error) + '</div>';
    });
})();
