(() => {
  const root = document.documentElement;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ICONS = window.ROUTE_ICONS || {};
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Light and dark mode: a switch whose knob carries the sun or the moon
  const toggle = document.querySelector("[data-mode-toggle]");
  if (toggle) {
    const knob = toggle.querySelector(".mode-knob");
    const icon = document.createElementNS(SVG_NS, "svg");
    icon.setAttribute("viewBox", "0 0 256 256");
    icon.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG_NS, "path");
    icon.append(path);
    knob.append(icon);

    const current = () => root.dataset.mode || (prefersDark.matches ? "dark" : "light");
    const paint = () => {
      const dark = current() === "dark";
      path.setAttribute("d", dark ? ICONS.moon : ICONS.sun);
      toggle.setAttribute("aria-checked", String(dark));
    };
    toggle.addEventListener("click", () => {
      const next = current() === "dark" ? "light" : "dark";
      root.dataset.mode = next;
      try {
        localStorage.setItem("mode", next);
      } catch (e) {}
      paint();
    });
    prefersDark.addEventListener("change", paint);
    paint();
  }

  // Icons named in the markup
  document.querySelectorAll("[data-icon]").forEach((slot) => {
    const d = ICONS[slot.dataset.icon];
    if (!d) return;
    const icon = document.createElementNS(SVG_NS, "svg");
    icon.setAttribute("viewBox", "0 0 256 256");
    icon.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    icon.append(path);
    slot.append(icon);
  });

  // Copy the email: the label says Copied only when the clipboard took it
  document.querySelectorAll("[data-copy]").forEach((button) => {
    const label = button.querySelector("[data-copy-label]");
    label.setAttribute("aria-live", "polite");
    const original = label.textContent;
    const iconPath = button.querySelector("[data-icon] path");
    const reset = () => {
      label.textContent = original;
      if (iconPath) iconPath.setAttribute("d", ICONS.copy);
      button.classList.remove("is-done");
    };
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        label.textContent = button.dataset.copied;
        if (iconPath) iconPath.setAttribute("d", ICONS.check);
        button.classList.add("is-done");
      } catch (e) {
        label.textContent = button.dataset.copyFailed;
      }
      window.setTimeout(reset, 2200);
    });
  });

  // Language: the ring slides to the other flag, then the page changes
  const langSwitch = document.querySelector("[data-lang-switch]");
  if (langSwitch) {
    langSwitch.querySelectorAll("a:not([aria-current])").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || reduceMotion.matches) return;
        event.preventDefault();
        langSwitch.classList.add("is-switching");
        window.setTimeout(() => (window.location.href = link.href), 260);
      });
    });
  }

  // Both the approach statement and its principle stations follow the reading line that also draws
  // the page route (72% down the screen): they switch on as the reader passes them going down and
  // switch back off going up.
  const READING_LINE = 0.72;
  const onScroll = (fn) => {
    let ticking = false;
    const run = () => {
      ticking = false;
      fn();
    };
    const queue = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(run);
    };
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    queue();
  };

  // Principle stations light up yellow once the reading line reaches them
  const stations = [...document.querySelectorAll(".principle-icon")];
  if (stations.length) {
    onScroll(() => {
      const line = window.innerHeight * READING_LINE;
      stations.forEach((icon) => {
        const r = icon.getBoundingClientRect();
        icon.classList.toggle("is-lit", r.top + r.height / 2 <= line);
      });
    });
  }

  // "First the code, then the business" corrects itself: the two words trade places in an arc.
  // Scrolling back up un-corrects it, so the next pass down plays it again.
  const swap = document.querySelector("[data-swap]");
  if (swap && !reduceMotion.matches) {
    const first = swap.querySelector('[data-swap-word="first"]');
    const second = swap.querySelector('[data-swap-word="second"]');
    const words = [first, second];
    const trade = () => {
      const a = document.createComment("");
      const b = document.createComment("");
      first.replaceWith(a);
      second.replaceWith(b);
      a.replaceWith(second);
      b.replaceWith(first);
    };
    const arc = (el, from, to, lift) => {
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: `translate(${dx / 2}px, ${dy / 2 + lift}px)`, offset: 0.5 },
          { transform: "none" },
        ],
        { duration: 1100, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }
      );
    };
    let corrected = false;
    let pending = null;
    const set = (next) => {
      if (next === corrected) return;
      corrected = next;
      // Measure where the words are on screen right now, mid-flight included, so a reversal
      // halfway through the arc starts from there instead of jumping.
      const before = words.map((w) => w.getBoundingClientRect());
      words.forEach((w) => w.getAnimations().forEach((a) => a.cancel()));
      trade();
      swap.classList.toggle("is-wrong", !corrected);
      const after = words.map((w) => w.getBoundingClientRect());
      const lift = parseFloat(getComputedStyle(swap).fontSize) * 0.55;
      arc(first, before[0], after[0], corrected ? -lift : lift);
      arc(second, before[1], after[1], corrected ? lift : -lift);
    };
    trade();
    swap.classList.add("is-wrong");
    const ready = document.fonts ? document.fonts.ready : Promise.resolve();
    ready.then(() =>
      onScroll(() => {
        const r = swap.getBoundingClientRect();
        const middle = r.top + r.height / 2;
        // Two thresholds, so stopping right on the edge does not make it flicker.
        const past = middle <= window.innerHeight * 0.5;
        const back = middle >= window.innerHeight * 0.62;
        if (past && !corrected) {
          // Leave a beat to read the wrong version first.
          if (pending === null) {
            pending = window.setTimeout(() => {
              pending = null;
              const now = swap.getBoundingClientRect();
              if (now.top + now.height / 2 <= window.innerHeight * 0.5) set(true);
            }, 700);
          }
        } else if (!past && pending !== null) {
          window.clearTimeout(pending);
          pending = null;
        }
        if (back && corrected) set(false);
      })
    );
  }

  // Sections rise in as they enter the screen; tinted bands open from a card to full width.
  const sections = document.querySelectorAll("[data-reveal]");
  sections.forEach((section) => {
    section.querySelectorAll(".reveal-item").forEach((item, i) => item.style.setProperty("--i", i));
  });
  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    sections.forEach((s) => s.classList.add("is-in"));
    return;
  }
  const seen = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        seen.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  sections.forEach((s) => seen.observe(s));
})();
