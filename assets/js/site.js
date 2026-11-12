(() => {
  const root = document.documentElement;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ICONS = window.ROUTE_ICONS || {};
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Light and dark mode
  const toggle = document.querySelector("[data-mode-toggle]");
  if (toggle) {
    const icon = document.createElementNS(SVG_NS, "svg");
    icon.setAttribute("viewBox", "0 0 256 256");
    icon.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG_NS, "path");
    icon.append(path);
    toggle.append(icon);

    const current = () => root.dataset.mode || (prefersDark.matches ? "dark" : "light");
    const paint = () => {
      const dark = current() === "dark";
      path.setAttribute("d", dark ? ICONS.sun : ICONS.moon);
      toggle.setAttribute("aria-label", dark ? toggle.dataset.toLight : toggle.dataset.toDark);
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
