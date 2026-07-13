/* Lightbox vanilla per la scheda mazzo. Nessuna libreria esterna. */
(function () {
  var lb = document.getElementById("lightbox");
  if (!lb) return;
  var img = lb.querySelector("img");
  var lastFocus = null;

  function open(src, alt) {
    lastFocus = document.activeElement;
    img.src = src; img.alt = alt || "";
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    lb.querySelector(".close").focus();
  }
  function close() {
    lb.setAttribute("aria-hidden", "true");
    img.src = "";
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    var zoom = e.target.closest(".zoom");
    if (zoom) {
      var full = zoom.getAttribute("data-full");
      var im = zoom.querySelector("img");
      if (full) open(full, im ? im.alt : "");
      return;
    }
    if (e.target.closest(".close") || e.target === lb) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lb.getAttribute("aria-hidden") === "false") close();
  });
})();
