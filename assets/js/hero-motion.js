/* ==========================================================================
   Mockly — movimento della hero, solo home (D92)
   Ispirato al modo in cui linearity.io tiene la hero "agganciata" allo
   schermo mentre scorri, invece del solito fade-e-sali-di-10px: qui la hero
   resta ferma per un tratto di scroll e lo slider schizzo→sito (già presente,
   D35) avanza da solo — il sito si costruisce mentre scorri, non prima.
   File a parte, non dentro main.js: usa GSAP + ScrollTrigger (autorizzati
   una sola volta in D77), l'unica dipendenza esterna del sito, e nessun'altra
   pagina deve scaricarla. Se cdnjs non risponde, esce subito: l'hero resta
   quella statica di sempre, mai bloccata a metà.
   ========================================================================== */
(function () {
  "use strict";

  function prefers_reduced_motion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function init_hero_scroll_motion() {
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
    if (prefers_reduced_motion()) return;
    /* Stessa soglia della hero asimmetrica (D90): sotto, la colonna della
       demo non c'è più nella stessa forma, agganciare lo scroll non avrebbe
       lo stesso senso. */
    if (!window.matchMedia("(min-width: 64em)").matches) return;

    var hero = document.querySelector("[data-hero]");
    var input = document.querySelector("[data-reveal-input]");
    if (!hero || !input) return;

    gsap.registerPlugin(ScrollTrigger);

    /* Il resto del sito usa "scroll-behavior: smooth" per i link con ancora:
       in scia con uno scroll guidato da JS, lo smooth nativo del browser lo
       fa a scatti. Spento solo qui, solo per questa pagina. */
    document.documentElement.style.scrollBehavior = "auto";

    ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "+=100%",
      pin: true,
      /* Zero smoothing (era 0.6, poi 0.15): `true` lega lo slider allo
         scroll fotogramma per fotogramma, come una sezione bloccata con
         lo scroll solo al suo interno — vedi la stessa nota in
         scroll-rows.js sul confronto con position:sticky di linearity.io. */
      scrub: true,
      onUpdate: function (self) {
        var value = Math.round(6 + self.progress * 88); // 6 -> 94, mai ai due estremi
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init_hero_scroll_motion);
  } else {
    init_hero_scroll_motion();
  }
})();
