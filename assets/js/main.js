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
   * Hero: lo schizzo e il sito vero si alternano da soli, ogni 4,5 secondi.
   * Nessun clic, nessun trascinamento, nessuno scroll: basta guardare.
   * `--reveal-pct` è la quota di schizzo visibile (100% = tutto schizzo,
   * 0% = tutto sito vero); il CSS la anima con un passaggio da sinistra.
   * Con "riduci movimento" non c'è alternanza: si vede il sito vero.
   * ------------------------------------------------------------------ */

  function init_hero_reveal() {
    var stage = document.querySelector("[data-reveal-stage]");
    if (!stage) return;

    var states = document.querySelectorAll("[data-reveal-state]");
    var showing_sketch = true;
    var timer = null;

    function show(sketch) {
      showing_sketch = sketch;
      stage.style.setProperty("--reveal-pct", sketch ? "100%" : "0%");
      Array.prototype.forEach.call(states, function (el) {
        el.classList.toggle("is-active", (el.getAttribute("data-reveal-state") === "sketch") === sketch);
      });
    }

    if (prefers_reduced_motion()) {
      show(false);
      return;
    }

    function start() {
      if (timer === null) {
        timer = window.setInterval(function () {
          show(!showing_sketch);
        }, 4500);
      }
    }

    function stop() {
      window.clearInterval(timer);
      timer = null;
    }

    show(true);
    start();

    /* Scheda in secondo piano: si ferma, così non riparte "a scatti". */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });
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
   * Curatela del portfolio: alcune demo restano dietro "Scopri di più"
   * finché non lo clicchi. I filtri per settore sono stati tolti: questa
   * funzione fa solo la parte di curatela rimasta.
   * ------------------------------------------------------------------ */

  function init_project_filters() {
    var cards = document.querySelectorAll("[data-more]");
    var show_more_button = document.querySelector("[data-show-more]");
    var show_more_wrap = document.querySelector("[data-show-more-wrap]");
    if (!cards.length || !show_more_button) return;

    var reduce_motion = prefers_reduced_motion();

    Array.prototype.forEach.call(cards, function (card) {
      card.classList.add("is-hidden");
    });

    show_more_button.addEventListener("click", function () {
      Array.prototype.forEach.call(cards, function (card) {
        card.classList.remove("is-hidden");
        if (!reduce_motion) {
          card.style.animation = "none";
          void card.offsetWidth;
          card.style.animation = "";
        }
      });

      if (show_more_wrap) {
        show_more_wrap.classList.add("is-hidden");
      }

      /* Porta lo sguardo sulla prima card appena comparsa, subito dopo quelle
         già viste, invece di lasciare la pagina dove capita. */
      cards[0].scrollIntoView({ behavior: reduce_motion ? "auto" : "smooth", block: "start" });
    });
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
   * Comparsa allo scroll: le sezioni entrano con una piccola salita.
   * La classe .reveal la aggiunge questo script: senza JavaScript (o con
   * "riduci movimento") nessun contenuto resta nascosto.
   * ------------------------------------------------------------------ */

  function init_reveal() {
    if (prefers_reduced_motion() || typeof window.IntersectionObserver !== "function") return;

    var targets = document.querySelectorAll(
      "main .section__header, main .bento__card, main .step-list__item, main .project-card, " +
      "main .product-card, main .price-card, main .person-card, main .accordion, " +
      "main .call-to-action__panel, main .note, main .feature-grid__item, main .balance__column, " +
      "main .contact-card, main .faq-item, main .form"
    );
    if (!targets.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    Array.prototype.forEach.call(targets, function (el) {
      var siblings = el.parentElement ? el.parentElement.children : [];
      var index = Array.prototype.indexOf.call(siblings, el);
      el.style.setProperty("--reveal-delay", Math.min(index, 3) * 90 + "ms");
      el.classList.add("reveal");
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------ *
   * Avvio
   * ------------------------------------------------------------------ */

  init_back_to_top();
  init_reveal();
  init_hero_reveal();
  init_mobile_menu();
  init_accordions();
  init_project_filters();
  init_contact_form();
})();
