/* ==========================================================================
   Mockly — righe che scorrono in orizzontale agganciate allo scroll
   (D95, ristrutturata in D99)
   Stessa tecnica della hero della home (hero-motion.js, D92): GSAP +
   ScrollTrigger, l'unica dipendenza esterna del sito, caricata solo dove
   serve. Attiva solo le sezioni con questo markup — se non c'è, il file non
   fa nulla:
     [data-scroll-row]           il blocco che si blocca per intero
                                  (titolo di sezione compreso)
       [data-scroll-row-viewport]  la finestra che ritaglia la fila
         [data-scroll-row-track]     la fila stessa, quella che si sposta
   Prima (D95) si bloccava solo la fila stretta: il titolo sopra era già
   scorso via, quindi le card si muovevano senza più dire a cosa si
   riferivano. Ora si blocca l'intero blocco — titolo compreso — e solo la
   fila dentro scorre in orizzontale.
   Sotto i 64em, senza GSAP o con "riduci movimento" attivo: tutto resta la
   griglia normale che va a capo, niente si nasconde per un motore che non
   parte.
   ========================================================================== */
(function () {
  "use strict";

  function prefers_reduced_motion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function init_scroll_rows() {
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
    if (prefers_reduced_motion()) return;
    /* Sotto i 64em la griglia è già una sola colonna: agganciare lo scroll
       non avrebbe lo stesso senso. */
    if (!window.matchMedia("(min-width: 64em)").matches) return;

    var rows = document.querySelectorAll("[data-scroll-row]");
    if (!rows.length) return;

    gsap.registerPlugin(ScrollTrigger);

    Array.prototype.forEach.call(rows, function (row) {
      var viewport = row.querySelector("[data-scroll-row-viewport]");
      var track = row.querySelector("[data-scroll-row-track]");
      if (!viewport || !track) return;

      row.classList.add("is-active");

      var distance = track.scrollWidth - viewport.clientWidth;
      if (distance <= 0) {
        row.classList.remove("is-active");
        return;
      }

      /* Con la fila a scorrimento la curatela "Scopri di più" non serve
         più: la fila mostra già tutte le card, sfogliabili scorrendo la
         pagina. Va fatto da JS e prima che GSAP pinni il blocco — il pin
         avvolge `row` in un div.pin-spacer, che la sposta fuori dai
         fratelli originali e romperebbe un selettore CSS "~". */
      var show_more_wrap = row.parentElement
        ? row.parentElement.querySelector("[data-show-more-wrap]")
        : null;
      if (show_more_wrap) show_more_wrap.classList.add("is-hidden");

      gsap.to(track, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: row,
          /* Margine sotto l'intestazione sospesa, così il titolo della
             sezione non ci finisce sotto quando il blocco si aggancia. */
          start: "top top+=120",
          end: "+=" + distance,
          pin: true,
          /* Zero smoothing: la fila segue lo scroll fotogramma per
             fotogramma, senza nessuna interpolazione — la stessa
             sensazione di "sezione bloccata, scroll solo lì dentro" che si
             ha su linearity.io, dove però la ottengono con position:sticky
             nativo del CSS (senza libreria, zero ritardo per definizione)
             invece di un pin animato via JS: qui restiamo su GSAP (già in
             uso, gestisce da solo lo spazio di scroll riservato) ma senza
             smoothing il risultato è lo stesso, immediato. */
          scrub: true
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init_scroll_rows);
  } else {
    init_scroll_rows();
  }
})();
