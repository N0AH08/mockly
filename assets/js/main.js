/* ==========================================================================
   Mockly — comportamenti
   Niente librerie. Ogni blocco si attiva solo se trova il proprio markup,
   così lo stesso file vale per tutte le pagine.
   Naming: snake_case per funzioni e variabili (vedi docs/00-regole.md).
   ========================================================================== */

(function () {
  "use strict";

  function prefers_reduced_motion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* ------------------------------------------------------------------ *
   * Ingresso hero: la pagina segnala che è pronta e il CSS anima.
   * ------------------------------------------------------------------ */

  function init_page_ready() {
    function mark_ready() {
      document.body.classList.add("is-loaded");
    }

    if (document.readyState === "complete") {
      mark_ready();
    } else {
      window.addEventListener("load", mark_ready, { once: true });
      /* Rete lenta: dopo 1.2s si mostra comunque, niente pagina congelata. */
      window.setTimeout(mark_ready, 1200);
    }
  }

  /* ------------------------------------------------------------------ *
   * Preloader della home: un laptop, un cursore che clicca, il sito si
   * apre. Una sola volta per sessione del browser (sessionStorage), non a
   * ogni volta che si torna sulla home dal menu.
   * ------------------------------------------------------------------ */

  function init_preloader() {
    var preloader = document.querySelector("[data-preloader]");
    if (!preloader) return;

    var frame = document.querySelector("[data-viewport-frame]");

    var already_seen = false;
    try {
      already_seen = window.sessionStorage.getItem("mockly_preloader_seen") === "1";
    } catch (error) {
      already_seen = false;
    }

    if (already_seen || prefers_reduced_motion()) {
      preloader.classList.add("is-hidden");
      if (frame) frame.classList.remove("is-opening");
      return;
    }

    var file = preloader.querySelector("[data-preloader-file]");

    window.setTimeout(function () {
      if (file) file.classList.add("is-active");
    }, 2100);

    window.setTimeout(function () {
      preloader.classList.add("is-hidden");
      /* La cornice si chiude nello stesso istante: dietro al preloader per
         tutta la durata, il salto non si vede — si vede solo il risultato,
         la finestra che si assembla mentre il sito compare. Il solo
         cambio di spessore è troppo sottile ai bordi dello schermo, quindi
         un lampo di luce lungo il bordo interno segna il momento preciso. */
      if (frame) {
        frame.classList.remove("is-opening");
        frame.classList.add("is-settled-flash");
        window.setTimeout(function () {
          frame.classList.remove("is-settled-flash");
        }, 900);
      }
      try {
        window.sessionStorage.setItem("mockly_preloader_seen", "1");
      } catch (error) {
        /* Storage non disponibile (privata/bloccato): si rivedrà ogni
           volta, non è grave quanto restare bloccati sull'overlay. */
      }
    }, 3400);
  }

  /* ------------------------------------------------------------------ *
   * Intestazione: stato "scrollata" (vetro più solido)
   * ------------------------------------------------------------------ */

  function init_header_scroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;

    var is_ticking = false;

    function update_state() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      is_ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (is_ticking) return;
        is_ticking = true;
        window.requestAnimationFrame(update_state);
      },
      { passive: true }
    );

    update_state();
  }

  /* ------------------------------------------------------------------ *
   * Barra di avanzamento: quanto manca alla fine della pagina.
   * ------------------------------------------------------------------ */

  function init_scroll_progress() {
    var bar = document.querySelector("[data-scroll-progress]");
    if (!bar) return;

    var is_ticking = false;

    function update_state() {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      bar.style.width = progress + "%";
      is_ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (is_ticking) return;
        is_ticking = true;
        window.requestAnimationFrame(update_state);
      },
      { passive: true }
    );
    window.addEventListener("resize", update_state);

    update_state();
  }

  /* ------------------------------------------------------------------ *
   * Firma: il faretto blu segue il puntatore su ogni card del sito,
   * invece del solito sollevamento con ombra che hanno tutti — e la card
   * si inclina verso il punto dove sta il faretto, come se la luce ci
   * cadesse sopra davvero, non due effetti indipendenti messi insieme.
   * Inclinazione piccola apposta (max ~5deg): una card che si piega di
   * più sembra un plugin, non un dettaglio.
   * ------------------------------------------------------------------ */

  function init_card_spotlight() {
    var cards = document.querySelectorAll(".bento__card, .product-card, .price-card, .project-card");
    if (!cards.length) return;
    if (prefers_reduced_motion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    var max_tilt = 5;

    Array.prototype.forEach.call(cards, function (card) {
      function set_spot(event) {
        var rect = card.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        card.style.setProperty("--spot-x", x + "px");
        card.style.setProperty("--spot-y", y + "px");

        var ratio_x = x / rect.width - 0.5;
        var ratio_y = y / rect.height - 0.5;
        card.style.setProperty("--tilt-x", (ratio_y * -2 * max_tilt).toFixed(2) + "deg");
        card.style.setProperty("--tilt-y", (ratio_x * 2 * max_tilt).toFixed(2) + "deg");
      }

      card.addEventListener("mouseenter", function (event) {
        set_spot(event);
        card.classList.add("is-spotlit");
      });
      card.addEventListener("mousemove", set_spot);
      card.addEventListener("mouseleave", function () {
        card.classList.remove("is-spotlit");
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Reveal on scroll: le sezioni entrano una volta sola.
   * ------------------------------------------------------------------ */

  function init_reveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (prefers_reduced_motion() || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(items, function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        Array.prototype.forEach.call(entries, function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    Array.prototype.forEach.call(items, function (item) {
      observer.observe(item);
    });
  }

  /* ------------------------------------------------------------------ *
   * L'accento si disegna da sé quando entra nello schermo, invece di
   * comparire con un fade: [data-draw] parte tagliato a zero larghezza
   * (clip-path in components.css) e questa funzione toglie il taglio
   * quando l'elemento diventa visibile, una volta sola.
   * ------------------------------------------------------------------ */

  function init_mark_draw() {
    var marks = document.querySelectorAll("[data-draw]");
    if (!marks.length) return;

    if (prefers_reduced_motion() || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(marks, function (mark) {
        mark.classList.add("is-drawn");
      });
      return;
    }

    /* Non si osserva lo span stesso: partendo con clip-path a larghezza
       zero, un elemento tagliato così non risulta mai "intersecante" per
       IntersectionObserver — resterebbe tagliato per sempre, un blocco che
       si autoalimenta. Si osserva il paragrafo/titolo che lo contiene,
       mai clippato, e si scopre il segno quando quello entra in vista. */
    var observer = new IntersectionObserver(
      function (entries) {
        Array.prototype.forEach.call(entries, function (entry) {
          if (!entry.isIntersecting) return;
          var marks_in_view = entry.target.querySelectorAll("[data-draw]");
          Array.prototype.forEach.call(marks_in_view, function (mark) {
            mark.classList.add("is-drawn");
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    Array.prototype.forEach.call(marks, function (mark) {
      var container = mark.closest("p, h1, h2, h3") || mark.parentElement;
      observer.observe(container);
    });
  }

  /* ------------------------------------------------------------------ *
   * Faretto dell'hero: segue il puntatore, solo mouse fine.
   * ------------------------------------------------------------------ */

  function init_hero_spotlight() {
    var hero = document.querySelector("[data-hero]");
    var spotlight = document.querySelector("[data-hero-spotlight]");
    if (!hero || !spotlight) return;
    if (prefers_reduced_motion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    var is_ticking = false;
    var last_event = null;

    function update_state() {
      var rect = hero.getBoundingClientRect();
      spotlight.style.setProperty("--spot-x", last_event.clientX - rect.left + "px");
      spotlight.style.setProperty("--spot-y", last_event.clientY - rect.top + "px");
      is_ticking = false;
    }

    hero.addEventListener(
      "pointermove",
      function (event) {
        last_event = event;
        spotlight.style.opacity = "1";
        if (is_ticking) return;
        is_ticking = true;
        window.requestAnimationFrame(update_state);
      },
      { passive: true }
    );

    hero.addEventListener("pointerleave", function () {
      spotlight.style.opacity = "0";
    });
  }

  /* ------------------------------------------------------------------ *
   * Vetro liquido dell'intestazione: la distorsione del filtro SVG
   * risponde al puntatore invece di restare fissa — più intensa vicino
   * al cursore, come se il vetro si piegasse davvero sotto il dito.
   * Solo dove il filtro è supportato (Chromium) e con mouse fine.
   * ------------------------------------------------------------------ */

  function init_liquid_glass() {
    var header = document.querySelector(".site-header");
    var displace = document.querySelector('[data-liquid-scale]');
    if (!header || !displace) return;
    if (prefers_reduced_motion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (typeof CSS === "undefined" || !CSS.supports || !CSS.supports("backdrop-filter", 'url("#liquid-glass")')) return;

    var base_scale = 16;
    var max_scale = 26;
    var is_ticking = false;
    var last_event = null;

    function update_state() {
      var rect = header.getBoundingClientRect();
      var mid_x = rect.width / 2;
      var distance = Math.abs(last_event.clientX - rect.left - mid_x) / mid_x;
      var scale = base_scale + (max_scale - base_scale) * (1 - Math.min(distance, 1));
      displace.setAttribute("scale", scale.toFixed(1));
      is_ticking = false;
    }

    header.addEventListener(
      "pointermove",
      function (event) {
        last_event = event;
        if (is_ticking) return;
        is_ticking = true;
        window.requestAnimationFrame(update_state);
      },
      { passive: true }
    );

    header.addEventListener("pointerleave", function () {
      displace.setAttribute("scale", base_scale);
    });
  }

  /* ------------------------------------------------------------------ *
   * Bottoni magnetici: si spostano un poco verso il puntatore.
   * ------------------------------------------------------------------ */

  function init_magnetic_buttons() {
    var items = document.querySelectorAll(".button--primary, [data-magnetic]");
    if (!items.length) return;
    if (prefers_reduced_motion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    var max_offset = 7;

    Array.prototype.forEach.call(items, function (item) {
      item.addEventListener("mousemove", function (event) {
        var rect = item.getBoundingClientRect();
        var offset_x = (event.clientX - rect.left - rect.width / 2) * 0.1;
        var offset_y = (event.clientY - rect.top - rect.height / 2) * 0.14;
        offset_x = Math.max(-max_offset, Math.min(max_offset, offset_x));
        offset_y = Math.max(-max_offset, Math.min(max_offset, offset_y));
        item.style.transform = "translate(" + offset_x.toFixed(1) + "px, " + offset_y.toFixed(1) + "px)";
      });

      item.addEventListener("mouseleave", function () {
        item.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Hero: confronto a trascinamento fra lo schizzo e il sito vero.
   * Uno slider nativo (tastiera e touch gratis) sposta un clip-path sullo
   * schizzo SVG sovrapposto allo screenshot. Senza JS l'input non fa
   * niente, quindi resta nascosto in CSS e si vede solo il sito vero.
   * ------------------------------------------------------------------ */

  function init_hero_reveal() {
    var stage = document.querySelector("[data-reveal-stage]");
    var input = document.querySelector("[data-reveal-input]");
    if (!stage || !input) return;

    function apply(value) {
      var sketch_pct = 100 - Number(value);
      stage.style.setProperty("--reveal-pct", sketch_pct + "%");
    }

    apply(input.value);

    input.addEventListener("input", function () {
      apply(input.value);
    });

    if (prefers_reduced_motion()) return;

    /* Piccolo invito a trascinare: due passate avanti e indietro, una sola
       volta, poco dopo il caricamento. */
    window.setTimeout(function () {
      var start = Number(input.value);
      var steps = [start - 18, start + 12, start];
      var i = 0;

      function next() {
        if (i >= steps.length) return;
        input.value = steps[i];
        apply(steps[i]);
        i += 1;
        window.setTimeout(next, 420);
      }

      next();
    }, 1200);
  }

  /* ------------------------------------------------------------------ *
   * Menu su telefono: apertura, chiusura, Esc, fuoco confinato
   * ------------------------------------------------------------------ */

  function init_mobile_menu() {
    var toggle = document.querySelector(".site-header__toggle");
    var panel = document.getElementById("menu-principale");
    var overlay = document.querySelector(".site-header__overlay");
    if (!toggle || !panel) return;

    /* X dedicata dentro il pannello: l'hamburger resta coperto dal pannello. */
    var close_button = panel.querySelector("[data-menu-close]");

    var focusable_selector =
      'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

    function get_focusable() {
      return Array.prototype.slice.call(panel.querySelectorAll(focusable_selector));
    }

    function open_menu() {
      panel.classList.add("is-open");
      if (overlay) overlay.classList.add("is-open");
      document.body.classList.add("is-menu-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Chiudi il menu");

      window.requestAnimationFrame(function () {
        var items = get_focusable();
        if (items.length) items[0].focus();
      });
    }

    function close_menu(should_restore_focus) {
      panel.classList.remove("is-open");
      if (overlay) overlay.classList.remove("is-open");
      document.body.classList.remove("is-menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Apri il menu");

      if (should_restore_focus) toggle.focus();
    }

    function is_open() {
      return toggle.getAttribute("aria-expanded") === "true";
    }

    toggle.addEventListener("click", function () {
      if (is_open()) {
        close_menu(true);
      } else {
        open_menu();
      }
    });

    if (overlay) {
      overlay.addEventListener("click", function () {
        close_menu(true);
      });
    }

    if (close_button) {
      close_button.addEventListener("click", function () {
        close_menu(true);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (!is_open()) return;

      if (event.key === "Escape") {
        close_menu(true);
        return;
      }

      if (event.key !== "Tab") return;

      var items = get_focusable();
      if (!items.length) return;

      var first_item = items[0];
      var last_item = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first_item) {
        event.preventDefault();
        last_item.focus();
      } else if (!event.shiftKey && document.activeElement === last_item) {
        event.preventDefault();
        first_item.focus();
      }
    });

    /* La barra orizzontale vive da 1280px: sotto c'è l'hamburger. */
    var wide_screen = window.matchMedia("(min-width: 80em)");
    var on_breakpoint_change = function (event) {
      if (event.matches && is_open()) close_menu(false);
    };

    if (typeof wide_screen.addEventListener === "function") {
      wide_screen.addEventListener("change", on_breakpoint_change);
    } else if (typeof wide_screen.addListener === "function") {
      wide_screen.addListener(on_breakpoint_change);
    }
  }

  /* ------------------------------------------------------------------ *
   * Accordion con apertura fluida (grid-rows 0fr -> 1fr).
   * ------------------------------------------------------------------ */

  function init_accordions() {
    var triggers = document.querySelectorAll(".accordion__trigger");
    if (!triggers.length) return;

    var reduce_motion = prefers_reduced_motion();
    var close_delay = reduce_motion ? 0 : 220;

    Array.prototype.forEach.call(triggers, function (trigger) {
      var panel_id = trigger.getAttribute("aria-controls");
      var panel = panel_id ? document.getElementById(panel_id) : null;
      var item = trigger.closest(".accordion__item");
      if (!panel || !item) return;

      /*
       * L'animazione grid-rows vuole un figlio unico: le pagine con i
       * paragrafi diretti nel pannello se lo vedono avvolgere qui, così il
       * markup resta com'è e l'apertura è fluida ovunque.
       */
      if (!panel.querySelector(".accordion__panel-inner")) {
        var wrapper = document.createElement("div");
        wrapper.className = "accordion__panel-inner";
        while (panel.firstChild) wrapper.appendChild(panel.firstChild);
        panel.appendChild(wrapper);
      }

      /* Se l'utente clicca due volte in fretta, il timeout non deve chiudere. */
      var pending_close = null;
      var open_token = 0;

      trigger.addEventListener("click", function () {
        var will_open = trigger.getAttribute("aria-expanded") !== "true";
        open_token += 1;

        if (pending_close) {
          window.clearTimeout(pending_close);
          pending_close = null;
        }

        trigger.setAttribute("aria-expanded", will_open ? "true" : "false");

        if (will_open) {
          var token = open_token;
          panel.removeAttribute("hidden");
          /* Un frame fra display e transizione, altrimenti non si anima. */
          window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
              if (token === open_token) item.classList.add("is-open");
            });
          });
        } else {
          item.classList.remove("is-open");
          pending_close = window.setTimeout(function () {
            panel.setAttribute("hidden", "");
            pending_close = null;
          }, close_delay);
        }
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Filtri del portfolio
   * ------------------------------------------------------------------ */

  function init_project_filters() {
    var group = document.querySelector("[data-filter-group]");
    var cards = document.querySelectorAll("[data-sector]");
    if (!group || !cards.length) return;

    var buttons = group.querySelectorAll(".filter-group__button");
    var counter = document.querySelector("[data-filter-count]");
    var show_more_button = document.querySelector("[data-show-more]");
    var show_more_wrap = document.querySelector("[data-show-more-wrap]");
    var reduce_motion = prefers_reduced_motion();
    var is_expanded = false;
    var current_sector = "tutti";

    function apply_filter(selected_sector) {
      current_sector = selected_sector;
      var visible_count = 0;

      Array.prototype.forEach.call(cards, function (card) {
        var sectors = (card.getAttribute("data-sector") || "").split(" ");
        var is_sector_match =
          selected_sector === "tutti" || sectors.indexOf(selected_sector) !== -1;
        var is_curated_out =
          selected_sector === "tutti" && !is_expanded && card.hasAttribute("data-more");
        var is_match = is_sector_match && !is_curated_out;

        card.classList.toggle("is-hidden", !is_match);
        if (is_match) {
          visible_count += 1;
          if (!reduce_motion) {
            card.style.animation = "none";
            void card.offsetWidth;
            card.style.animation = "";
          }
        }
      });

      if (counter) {
        counter.textContent =
          visible_count === 1 ? "1 progetto" : visible_count + " progetti";
      }

      if (show_more_wrap) {
        show_more_wrap.classList.toggle(
          "is-hidden",
          selected_sector !== "tutti" || is_expanded
        );
      }
    }

    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        Array.prototype.forEach.call(buttons, function (other) {
          other.setAttribute("aria-pressed", other === button ? "true" : "false");
        });

        apply_filter(button.getAttribute("data-filter") || "tutti");
      });
    });

    if (show_more_button) {
      show_more_button.addEventListener("click", function () {
        is_expanded = true;
        apply_filter(current_sector);
      });
    }

    apply_filter("tutti");
  }

  /* ------------------------------------------------------------------ *
   * Modulo contatti: validazione e invio
   * ------------------------------------------------------------------ */

  function init_contact_form() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;

    var status = form.querySelector(".form__status");
    var submit_button = form.querySelector("[type='submit']");

    function get_field(control) {
      return control.closest(".form__field");
    }

    function set_error(control, message) {
      var field = get_field(control);
      if (!field) return;

      var error = field.querySelector(".form__error");
      field.classList.add("is-invalid");
      control.setAttribute("aria-invalid", "true");
      if (error) error.textContent = message;
    }

    function clear_error(control) {
      var field = get_field(control);
      if (!field) return;

      field.classList.remove("is-invalid");
      control.removeAttribute("aria-invalid");
    }

    function validate_control(control) {
      var value = (control.value || "").trim();

      if (control.hasAttribute("required") && value === "") {
        set_error(control, control.getAttribute("data-error-empty") || "Questo campo serve.");
        return false;
      }

      if (control.type === "email" && value !== "") {
        var looks_like_email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
        if (!looks_like_email) {
          set_error(
            control,
            control.getAttribute("data-error-format") ||
              "Controlla l'indirizzo: manca la chiocciola o il punto."
          );
          return false;
        }
      }

      if (control.type === "tel" && value !== "") {
        var digits = value.replace(/[^0-9]/g, "");
        if (digits.length < 8 || digits.length > 15) {
          set_error(
            control,
            control.getAttribute("data-error-format") ||
              "Il numero non sembra giusto. Controlla le cifre, oppure lascia il campo vuoto."
          );
          return false;
        }
      }

      var minimum = Number(control.getAttribute("minlength") || 0);
      if (minimum > 0 && value !== "" && value.length < minimum) {
        set_error(
          control,
          control.getAttribute("data-error-short") || "Serve qualche parola in più."
        );
        return false;
      }

      if (control.type === "checkbox" && control.hasAttribute("required") && !control.checked) {
        set_error(control, control.getAttribute("data-error-empty") || "Serve la spunta per proseguire.");
        return false;
      }

      clear_error(control);
      return true;
    }

    var controls = form.querySelectorAll("[required], [type='email'], [type='tel'], [minlength]");

    Array.prototype.forEach.call(controls, function (control) {
      control.addEventListener("blur", function () {
        validate_control(control);
      });

      control.addEventListener("input", function () {
        var field = get_field(control);
        if (field && field.classList.contains("is-invalid")) validate_control(control);
      });
    });

    form.addEventListener("submit", function (event) {
      var first_invalid = null;

      Array.prototype.forEach.call(controls, function (control) {
        if (!validate_control(control) && !first_invalid) first_invalid = control;
      });

      if (first_invalid) {
        event.preventDefault();
        if (status) {
          status.className = "form__status is-error";
          status.textContent = "Controlla i campi segnati in rosso, poi riprova.";
        }
        first_invalid.focus();
        return;
      }

      var action = form.getAttribute("action") || "";
      if (action === "" || action.indexOf("TODO") !== -1) {
        event.preventDefault();
        if (status) {
          status.className = "form__status is-error";
          status.innerHTML =
            "Il modulo non è ancora collegato. Scrivici su " +
            '<a href="https://wa.me/393517578080">WhatsApp</a> ' +
            'oppure a <a href="mailto:mockly.website@gmail.com">mockly.website@gmail.com</a>: ' +
            "rispondiamo allo stesso modo.";
        }
        return;
      }

      if (submit_button) {
        submit_button.classList.add("is-loading");
        submit_button.setAttribute("aria-busy", "true");
        submit_button.textContent = "Invio in corso…";
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Torna su: freccia fissa che compare dopo 600px di scroll.
   * ------------------------------------------------------------------ */

  function init_back_to_top() {
    var button = document.querySelector(".back-to-top");
    if (!button) return;

    var is_ticking = false;

    function update_state() {
      button.classList.toggle("is-visible", window.scrollY > 600);
      is_ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (is_ticking) return;
        is_ticking = true;
        window.requestAnimationFrame(update_state);
      },
      { passive: true }
    );

    button.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: prefers_reduced_motion() ? "auto" : "smooth"
      });
    });

    update_state();
  }

  /* ------------------------------------------------------------------ *
   * Avvio
   * ------------------------------------------------------------------ */

  init_page_ready();
  init_preloader();
  init_header_scroll();
  init_back_to_top();
  init_scroll_progress();
  init_card_spotlight();
  init_reveal();
  init_mark_draw();
  init_hero_spotlight();
  init_liquid_glass();
  init_magnetic_buttons();
  init_hero_reveal();
  init_mobile_menu();
  init_accordions();
  init_project_filters();
  init_contact_form();
})();
