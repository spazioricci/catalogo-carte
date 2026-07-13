/* Gestione tema chiaro/scuro con persistenza locale. Nessuna richiesta di rete. */
(function () {
  var KEY = "cc-theme";
  var root = document.documentElement;

  function apply(t) {
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
    else root.removeAttribute("data-theme"); // "auto" -> segue il sistema
  }

  // applica il prima possibile (lo snippet inline in <head> lo fa già; qui per sicurezza)
  try { apply(localStorage.getItem(KEY)); } catch (e) {}

  function current() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".theme-toggle");
    if (!btn) return;
    var next = current() === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, next); } catch (e2) {}
    apply(next);
    btn.setAttribute("aria-label", next === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro");
  });
})();
