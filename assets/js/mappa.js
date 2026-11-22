/* =========================================================================
   Mappa lato client — disegna la mappa SVG da assets/data/map.json e conta
   le carte da data/cards.json (già tradotto per lingua).
   Stato in URL: #europa  #europa/italia  #americhe/stati-uniti-d-america/california
   Livelli: Mondo -> continente -> nazione (USA: stati) -> pannello con le carte.
   Nessuna dipendenza esterna.
   ========================================================================= */
(function () {
  var root = document.getElementById("mappa");
  if (!root) return;
  /* BASE = radice del sito (asset condivisi), HOME = radice della lingua. */
  var BASE = root.getAttribute("data-base") || "";
  var HOME = root.getAttribute("data-home") || "";
  var LOCALE = root.getAttribute("data-locale") || "it-IT";
  var T = JSON.parse(root.getAttribute("data-i18n") || "{}");
  /* NAMES: nomi tradotti dei paesi e dei continenti (chiave = nome italiano). */
  var NAMES = JSON.parse(root.getAttribute("data-names") || "{}");

  var NS = "http://www.w3.org/2000/svg";
  var USA = "Stati Uniti d'America";
  var CONTINENTS = ["Europa", "Americhe", "Asia", "Africa", "Oceania"];
  var SHOW_MAX = 60;
  var ANIM_MS = 450;

  var svg = document.getElementById("map");
  var crumbs = document.getElementById("crumbs");
  var note = document.getElementById("map-note");
  var panel = document.getElementById("map-panel");
  var pTitle = document.getElementById("panel-title");
  var pCount = document.getElementById("panel-count");
  var pGrid = document.getElementById("panel-grid");
  var pLink = document.getElementById("panel-link");
  var pClose = document.getElementById("panel-close");
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var MAP = null;
  var ST = { continent: null, country: null, state: null };
  var byCountry = {}, byState = {};
  var unlocated = 0, usNoState = 0;
  var animId = 0;

  /* ---------- utilità ---------- */
  function slug(s) {
    return (s || "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function esc(s) {
    return (s || "").toString()
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function cw(n) { return n === 1 ? T.mapCard : T.mapCards; }
  function level(n) { return n === 0 ? 0 : n < 3 ? 1 : n < 10 ? 2 : n < 50 ? 3 : 4; }
  function displayOf(canon) { return NAMES.countries[canon] || canon; }
  function contName(k) { return NAMES.continents[k] || k; }
  function countN(canon) { return (byCountry[displayOf(canon)] || []).length; }
  function contTotal(k) {
    return MAP.paesi.reduce(function (s, p) { return p.continent === k ? s + countN(p.name) : s; }, 0);
  }

  /* ---------- stato <-> URL ---------- */
  function parseHash() {
    var st = { continent: null, country: null, state: null };
    var parts;
    try {
      parts = decodeURIComponent(location.hash.replace(/^#/, "")).split("/").filter(Boolean);
    } catch (e) {
      return st; /* hash malformato: si mostra il mondo */
    }
    var cont = CONTINENTS.filter(function (k) { return slug(k) === parts[0]; })[0];
    if (!cont) return st;
    st.continent = cont;
    if (parts[1]) {
      var c = MAP.paesi.filter(function (p) { return slug(p.name) === parts[1]; })[0];
      if (!c) return st;
      st.country = c.name;
      st.continent = c.continent;
      if (c.name === USA && parts[2]) {
        var s = MAP.statiUSA.filter(function (x) { return slug(x.name) === parts[2]; })[0];
        if (s) st.state = s.name;
      }
    }
    return st;
  }
  function hashOf(st) {
    var parts = [];
    if (st.continent) parts.push(slug(st.continent));
    if (st.country) parts.push(slug(st.country));
    if (st.state) parts.push(slug(st.state));
    return parts.length ? "#" + parts.join("/") : "#";
  }

  /* ---------- animazione del viewBox ---------- */
  function setVB(v) { svg.setAttribute("viewBox", v.join(" ")); }
  function sizePins(w) {
    /* Dimensione in unità della vista: cerchi più larghi per i numeri a tre cifre. */
    var pins = svg.querySelectorAll(".pin");
    for (var i = 0; i < pins.length; i++) {
      var digits = String(pins[i].getAttribute("data-n")).length;
      pins[i].querySelector("circle").setAttribute("r", w * (digits >= 3 ? 0.03 : digits === 2 ? 0.02 : 0.016));
      pins[i].querySelector("text").setAttribute("font-size", w * (digits >= 3 ? 0.017 : 0.02));
    }
  }
  function animateTo(target) {
    var from = svg.getAttribute("viewBox").split(/\s+/).map(Number);
    var to = target.map(Number);
    var id = ++animId;
    if (reduceMotion || from.some(isNaN)) { setVB(to); sizePins(to[2]); return; }
    var t0 = null;
    function step(ts) {
      if (id !== animId) return;
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / ANIM_MS);
      var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      var v = from.map(function (f, i) { return f + (to[i] - f) * e; });
      setVB(v); sizePins(v[2]);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- disegno ---------- */
  function pin(x, y, n, go, title) {
    var g = el("g", { "class": "pin", tabindex: "0", role: "button", "aria-label": title + " — " + n + " " + cw(n), "data-go": go, "data-n": n });
    g.appendChild(el("circle", { cx: x, cy: y, r: 1 }));
    var tx = el("text", { x: x, y: y, "text-anchor": "middle", "dominant-baseline": "central" });
    tx.textContent = n;
    g.appendChild(tx);
    return g;
  }

  function render() {
    var usa = ST.country === USA;
    var viewKey = usa ? "USA" : (ST.continent || "Mondo");

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var gBg = el("g", { "class": "bg" });
    MAP.sfondo.forEach(function (b) { gBg.appendChild(el("path", { d: b.d })); });
    svg.appendChild(gBg);

    /* Paesi della collezione. Cliccabili: sotto la voce del proprio continente. */
    var gCo = el("g", { "class": "countries" });
    MAP.paesi.forEach(function (p) {
      if (usa && p.name === USA) return; /* al posto del paese ci sono gli stati */
      var n = countN(p.name);
      var path = el("path", { d: p.d, "class": "c lvl-" + level(n) });
      if (n > 0) path.setAttribute("data-go", hashOf({ continent: p.continent, country: p.name }));
      var tt = el("title", {});
      tt.textContent = displayOf(p.name) + (n ? " — " + n + " " + cw(n) : "");
      path.appendChild(tt);
      gCo.appendChild(path);
    });
    svg.appendChild(gCo);

    var gPins = el("g", { "class": "pins" });
    if (usa) {
      /* Stati USA: colorati per numero di carte, cliccabili. */
      var gSt = el("g", { "class": "states" });
      MAP.statiUSA.forEach(function (s) {
        var n = (byState[s.name] || []).length;
        var cls = "s lvl-" + level(n) + (ST.state === s.name ? " sel" : "");
        var path = el("path", { d: s.d, "class": cls });
        if (n > 0) path.setAttribute("data-go", hashOf({ continent: ST.continent, country: USA, state: s.name }));
        var tt = el("title", {});
        tt.textContent = s.name + (n ? " — " + n + " " + cw(n) : "");
        path.appendChild(tt);
        gSt.appendChild(path);
        if (n > 0) gPins.appendChild(pin(s.c[0], s.c[1], n, hashOf({ continent: ST.continent, country: USA, state: s.name }), s.name));
      });
      svg.appendChild(gSt);
    } else if (ST.continent) {
      /* Continente: un numero per ogni nazione con carte. */
      MAP.paesi.forEach(function (p) {
        var n = countN(p.name);
        if (p.continent !== ST.continent || n === 0) return;
        gPins.appendChild(pin(p.c[0], p.c[1], n, hashOf({ continent: p.continent, country: p.name }), displayOf(p.name)));
      });
    } else {
      /* Mondo: un numero per continente, al centro della sua vista. */
      CONTINENTS.forEach(function (k) {
        var n = contTotal(k);
        var v = MAP.viste[k].map(Number);
        gPins.appendChild(pin(v[0] + v[2] / 2, v[1] + v[3] / 2, n, hashOf({ continent: k }), contName(k)));
      });
    }
    svg.appendChild(gPins);

    animateTo(MAP.viste[viewKey]);
    renderCrumbs();
    renderPanel();

    var parts = [];
    if (unlocated) parts.push(unlocated + " " + T.mapUnlocated);
    if (usa && usNoState) parts.push(usNoState + " " + T.mapNoState);
    note.textContent = parts.join(" · ");
  }

  function renderCrumbs() {
    crumbs.textContent = "";
    var items = [{ label: T.mapWorld, st: {} }];
    if (ST.continent) items.push({ label: contName(ST.continent), st: { continent: ST.continent } });
    if (ST.country) items.push({ label: displayOf(ST.country), st: { continent: ST.continent, country: ST.country } });
    if (ST.state) items.push({ label: ST.state, st: { continent: ST.continent, country: ST.country, state: ST.state } });
    items.forEach(function (it, i) {
      if (i > 0) {
        var sep = document.createElement("span");
        sep.className = "sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "›";
        crumbs.appendChild(sep);
      }
      if (i === items.length - 1) {
        var cur = document.createElement("span");
        cur.setAttribute("aria-current", "page");
        cur.textContent = it.label;
        crumbs.appendChild(cur);
      } else {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "crumb";
        b.setAttribute("data-go", hashOf(it.st));
        b.textContent = it.label;
        crumbs.appendChild(b);
      }
    });
  }

  function renderPanel() {
    var usa = ST.country === USA;
    if (!(ST.state || (ST.country && !usa))) { panel.hidden = true; return; }
    var key = ST.state ? ST.state : displayOf(ST.country);
    var cards = ST.state ? (byState[ST.state] || []) : (byCountry[displayOf(ST.country)] || []);
    pTitle.textContent = key;
    var count = cards.length + " " + cw(cards.length);
    if (cards.length > SHOW_MAX) count += " — " + T.mapTruncated.replace("{n}", SHOW_MAX);
    pCount.textContent = count;
    pGrid.innerHTML = cards.slice(0, SHOW_MAX).map(cardHTML).join("");
    pLink.href = HOME + "catalogo/?nazione=" + encodeURIComponent(displayOf(ST.country));
    pLink.textContent = T.mapOpenCatalog;
    panel.hidden = false;
  }

  /* Stessa scheda della griglia del catalogo (assets/js/catalogo.js). */
  function cardHTML(c) {
    var img = BASE + "assets/img/thumb/" + encodeURIComponent(c.cover);
    var ph = BASE + "assets/img/placeholder.svg";
    var title = c.title && c.title.trim() ? esc(c.title) : T.deckNo + " " + c.num;
    var country = c.country ? '<span class="country">' + esc(c.country) + "</span>" : "";
    var type = c.type ? '<span class="tag">' + esc(c.type) + "</span>" : "";
    return '<a class="deck-card" href="' + HOME + "mazzo/" + encodeURIComponent(c.id) + '/">' +
      '<div class="frame"><span class="num">' + c.num + "</span>" +
        '<img loading="lazy" decoding="async" src="' + img + '" alt="' + title + '" ' +
          "onerror=\"this.onerror=null;this.src='" + ph + "'\">" +
      "</div>" +
      '<div class="body"><div class="title">' + title + "</div>" +
        '<div class="meta">' + country + type + "</div></div></a>";
  }

  /* ---------- eventi ---------- */
  function go(target) {
    if (target && location.hash !== target) location.hash = target;
  }
  svg.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-go]") : null;
    if (t) go(t.getAttribute("data-go"));
  });
  svg.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var t = e.target.closest ? e.target.closest("[data-go]") : null;
    if (t) { e.preventDefault(); go(t.getAttribute("data-go")); }
  });
  crumbs.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-go]") : null;
    if (t) go(t.getAttribute("data-go"));
  });
  pClose.addEventListener("click", function () {
    go(hashOf(ST.state ? { continent: ST.continent, country: ST.country } : { continent: ST.continent }));
  });
  window.addEventListener("hashchange", function () {
    ST = parseHash();
    render();
  });

  /* ---------- avvio ---------- */
  Promise.all([
    fetch(HOME + "data/cards.json").then(function (r) { if (!r.ok) throw new Error(); return r.json(); }),
    fetch(BASE + "assets/data/map.json").then(function (r) { if (!r.ok) throw new Error(); return r.json(); }),
  ]).then(function (res) {
    var cards = res[0].cards || [];
    MAP = res[1];

    var known = {};
    MAP.paesi.forEach(function (p) { known[displayOf(p.name)] = true; });
    cards.forEach(function (c) {
      if (c.country && known[c.country]) {
        (byCountry[c.country] = byCountry[c.country] || []).push(c);
      } else {
        unlocated++;
      }
      if (c.usState) {
        (byState[c.usState] = byState[c.usState] || []).push(c);
      } else if (c.country === displayOf(USA)) {
        usNoState++;
      }
    });

    ST = parseHash();
    setVB(MAP.viste.Mondo.map(Number));
    render();
  }).catch(function () {
    note.textContent = T.error;
  });
})();
