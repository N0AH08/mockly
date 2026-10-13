/* ==========================================================================
   Home — una schermata alla volta. Lo carica solo index.html.
   Senza questo script (o con "riduci movimento") la pagina si legge lo
   stesso: le schermate sono in fila e i quattro passi sono tutti visibili.
   ========================================================================== */
(function () {
  var body = document.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(value) { return Math.max(0, Math.min(1, value)); }

  /* ---- Entrata delle schermate ---------------------------------------- */
  var scenes = Array.prototype.slice.call(document.querySelectorAll("[data-scene]"));
  if (!reduce && typeof IntersectionObserver === "function") {
    body.classList.add("scenes-ready");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add("is-in");
      });
    }, { threshold: 0.25 });
    scenes.forEach(function (scene) {
      if (scene.classList.contains("scene")) observer.observe(scene);
    });
  }

  /* ---- Puntini a destra: dove sei nella pagina ------------------------- */
  var nav = document.createElement("nav");
  nav.className = "scene-dots";
  nav.setAttribute("aria-label", "Schermate");
  var dots = scenes.map(function (scene) {
    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", scene.getAttribute("data-scene"));
    button.title = scene.getAttribute("data-scene");
    button.addEventListener("click", function () {
      scene.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
    nav.appendChild(button);
    return button;
  });
  body.appendChild(nav);

  /* ---- Domande: cinque in vista, le altre con "Altre domande" ----------- */
  var faq = document.querySelector(".faq .accordion");
  if (faq) {
    var extra = Array.prototype.slice.call(faq.querySelectorAll(".accordion__item"), 5);
    if (extra.length) {
      extra.forEach(function (item) { item.hidden = true; });
      var more = document.createElement("button");
      more.type = "button";
      more.className = "button button--secondary faq__more";
      more.textContent = "Altre domande";
      more.addEventListener("click", function () {
        extra.forEach(function (item) { item.hidden = false; });
        more.remove();
        var first = extra[0].querySelector(".accordion__trigger");
        if (first) first.focus();
      });
      faq.parentNode.insertBefore(more, faq.nextSibling);
    }
  }

  /* ---- La schermata dei quattro passi --------------------------------- */
  var pin = document.querySelector("[data-pin]");
  var stage = pin && pin.querySelector(".hero__reveal-stage");
  var steps = pin ? Array.prototype.slice.call(pin.querySelectorAll(".pin__step")) : [];
  var bars = pin ? Array.prototype.slice.call(pin.querySelectorAll(".pin__bar span")) : [];
  var last_step = -1;

  function update() {
    var viewport = window.innerHeight;
    if (pin && stage) {
      var box = pin.getBoundingClientRect();
      var progress = reduce ? 1 : clamp(-box.top / Math.max(1, box.height - viewport));
      /* lo schizzo lascia il posto al sito vero */
      stage.style.setProperty("--reveal-pct", (100 - progress * 100).toFixed(1) + "%");
      var index = Math.round(progress * (steps.length - 1));
      if (index !== last_step) {
        last_step = index;
        steps.forEach(function (el, i) { el.classList.toggle("is-active", reduce || i === index); });
        bars.forEach(function (el, i) { el.classList.toggle("is-on", i <= index); });
      }
    }

    /* quale schermata è al centro dello schermo */
    var current = 0;
    scenes.forEach(function (scene, i) {
      if (scene.getBoundingClientRect().top <= viewport * 0.5) current = i;
    });
    dots.forEach(function (button, i) { button.setAttribute("aria-current", String(i === current)); });
  }

  var is_waiting = false;
  function on_scroll() {
    if (is_waiting) return;
    is_waiting = true;
    window.requestAnimationFrame(function () {
      is_waiting = false;
      update();
    });
  }

  window.addEventListener("scroll", on_scroll, { passive: true });
  window.addEventListener("resize", on_scroll);
  update();
})();
