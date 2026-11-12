(() => {
  const map = document.querySelector("[data-map]");
  const log = document.querySelector("[data-log]");
  const panel = document.querySelector("[data-panel]");
  const ICONS = window.ROUTE_ICONS || {};
  if (!map || !log || !panel) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrow = window.matchMedia("(max-width: 40rem)");

  // One route snakes through every system in time order: 2012 left to right, 2015 back, and so on.
  // Each company is a milestone on the bend where the route turns into its row.
  const ROWS = [
    { year: "2012", name: "GeoSystems", stations: ["cad", "cadastre", "fieldapp"] },
    { year: "2015", name: "Infor", stations: ["tracking", "warehouse", "trace"] },
    { year: "2019", name: "Sandfield", stations: ["hardware", "supply", "mobile"] },
    { year: "2023", name: "Renti", stations: ["tenant", "rental", "sso"] },
  ];

  const STRINGS = {
    en: {
      labels: {
        cad: "AutoCAD integrations", cadastre: "Cadastre", fieldapp: "Field mobile app",
        tracking: "Vehicle tracking", warehouse: "Warehouse", trace: "Traceability",
        hardware: "Field hardware", supply: "Supply chain", mobile: "Mobile apps",
        tenant: "Tenant app", rental: "Rental platform", sso: "Third-party integrations",
      },
      now: "Now",
      play: "Play the route",
      pause: "Pause",
      station: (label, year, name) => `${label}, ${year} at ${name}`,
    },
    es: {
      labels: {
        cad: "Integraciones con AutoCAD", cadastre: "Catastro", fieldapp: "App móvil de campo",
        tracking: "Rastreo de vehículos", warehouse: "Depósito", trace: "Trazabilidad",
        hardware: "Hardware de campo", supply: "Cadena de suministro", mobile: "Apps móviles",
        tenant: "App para inquilinos", rental: "Plataforma de alquileres", sso: "Integraciones con terceros",
      },
      now: "Hoy",
      play: "Recorrer la ruta",
      pause: "Pausa",
      station: (label, year, name) => `${label}, ${year} en ${name}`,
    },
  };
  const T = STRINGS[document.documentElement.lang] || STRINGS.en;
  const LABELS = T.labels;

  const connections = [...log.querySelectorAll("li")].map((li) => ({
    from: li.dataset.from,
    to: li.dataset.to,
    year: li.dataset.year,
    where: li.dataset.where,
    line: li.textContent.trim(),
  }));

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("map-lines");
  const route = document.createElementNS(SVG_NS, "path");
  route.classList.add("route");
  svg.append(route);
  const edges = connections.map(() => {
    const line = document.createElementNS(SVG_NS, "line");
    line.classList.add("edge");
    svg.append(line);
    return line;
  });
  map.append(svg);

  const milestones = ROWS.map((row) => {
    const tag = document.createElement("p");
    tag.className = "milestone";
    tag.innerHTML = `<span class="milestone-year">${row.year}</span> <span class="milestone-name">${row.name}</span>`;
    map.append(tag);
    return tag;
  });
  const end = document.createElement("p");
  end.className = "milestone milestone-end";
  end.textContent = T.now;
  map.append(end);

  const nodes = {};
  const labels = {};
  ROWS.forEach((row) => {
    row.stations.forEach((id) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "node";
      button.setAttribute("aria-label", T.station(LABELS[id], row.year, row.name));
      button.setAttribute("aria-pressed", "false");
      const icon = document.createElementNS(SVG_NS, "svg");
      icon.setAttribute("viewBox", "0 0 256 256");
      icon.setAttribute("aria-hidden", "true");
      icon.classList.add("node-icon");
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", ICONS[id] || "");
      icon.append(path);
      button.append(icon);
      button.addEventListener("click", () => {
        stop();
        selectNode(id);
        window.setTimeout(reveal, 450);
      });
      const label = document.createElement("span");
      label.className = "node-label";
      label.setAttribute("aria-hidden", "true");
      label.textContent = LABELS[id];
      map.append(button, label);
      nodes[id] = button;
      labels[id] = label;
    });
  });

  const position = {};

  function place(el, x, y) {
    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--y", `${y}px`);
  }

  function layout() {
    const W = map.clientWidth;
    const H = map.clientHeight;
    if (!W || !H) return;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    const tags = [...milestones, end];
    const half = Math.max(...tags.map((t) => t.offsetWidth)) / 2;
    const tagHalfH = Math.max(...tags.map((t) => t.offsetHeight)) / 2;
    const pad = tagHalfH + 2;
    const gap = (H - 2 * pad) / 4;
    const r = Math.min(gap / 2, narrow.matches ? 26 : 44);
    const apexL = half + 2;
    const apexR = W - half - 2;
    const xL = apexL + r;
    const xR = apexR - r;
    const inset = (xR - xL) * (narrow.matches ? 0.1 : 0.12);
    const ys = ROWS.map((_, i) => pad + gap / 2 + i * gap);

    ROWS.forEach((row, i) => {
      const xs = [xL + inset, (xL + xR) / 2, xR - inset];
      // Keep the outer labels clear of the milestones that sit on the bends.
      const first = labels[row.stations[0]].offsetWidth / 2;
      const last = labels[row.stations[2]].offsetWidth / 2;
      xs[0] = Math.max(xs[0], apexL + half + 8 + first);
      xs[2] = Math.min(xs[2], apexR - half - 8 - last);
      xs[1] = (xs[0] + xs[2]) / 2;
      row.stations.forEach((id, c) => {
        position[id] = { x: xs[c], y: ys[i] };
        place(nodes[id], xs[c], ys[i]);
        place(labels[id], xs[c], ys[i]);
      });
      place(milestones[i], i % 2 === 0 ? apexL : apexR, ys[i] - gap / 2);
    });
    place(end, apexL, ys[3] + gap / 2);

    const top = pad;
    const d = [`M ${apexL} ${top}`, `L ${apexL} ${ys[0] - r}`, `A ${r} ${r} 0 0 0 ${xL} ${ys[0]}`];
    ys.forEach((y, i) => {
      const ltr = i % 2 === 0;
      const next = ys[i + 1];
      if (ltr) {
        d.push(`L ${xR} ${y}`);
        if (next !== undefined) d.push(`A ${r} ${r} 0 0 1 ${apexR} ${y + r}`, `L ${apexR} ${next - r}`, `A ${r} ${r} 0 0 1 ${xR} ${next}`);
      } else {
        d.push(`L ${xL} ${y}`);
        if (next !== undefined) d.push(`A ${r} ${r} 0 0 0 ${apexL} ${y + r}`, `L ${apexL} ${next - r}`, `A ${r} ${r} 0 0 0 ${xL} ${next}`);
      }
    });
    d.push(`A ${r} ${r} 0 0 0 ${apexL} ${ys[3] + r}`, `L ${apexL} ${ys[3] + gap / 2}`);
    route.setAttribute("d", d.join(" "));

    connections.forEach((c, i) => {
      const a = position[c.from];
      const b = position[c.to];
      edges[i].setAttribute("x1", a.x);
      edges[i].setAttribute("y1", a.y);
      edges[i].setAttribute("x2", b.x);
      edges[i].setAttribute("y2", b.y);
    });
    reserveReadout();
  }

  // Reserve enough room for the longest stop and the full play label. Otherwise a shorter
  // opening text (or the Pause label) changes the scroll target halfway through the tour.
  function reserveReadout() {
    const probe = panel.cloneNode(true);
    probe.removeAttribute("data-panel");
    probe.removeAttribute("aria-live");
    probe.setAttribute("aria-hidden", "true");
    Object.assign(probe.style, {
      position: "absolute", visibility: "hidden", pointerEvents: "none",
      width: `${panel.getBoundingClientRect().width}px`,
    });
    probe.style.setProperty("--panel-height", "0px");
    const playLabel = probe.querySelector("[data-play-label]");
    if (playLabel) playLabel.textContent = T.play;
    panel.after(probe);
    let height = 0;
    connections.forEach((c) => {
      probe.querySelector("[data-panel-year]").textContent = c.year;
      probe.querySelector("[data-panel-where]").textContent = c.where;
      probe.querySelector("[data-panel-line]").textContent = c.line;
      height = Math.max(height, probe.offsetHeight);
    });
    probe.remove();
    panel.style.setProperty("--panel-height", `${height}px`);
  }

  const yearEl = panel.querySelector("[data-panel-year]");
  const whereEl = panel.querySelector("[data-panel-where]");
  const lineEl = panel.querySelector("[data-panel-line]");
  const prev = panel.querySelector("[data-prev]");
  const next = panel.querySelector("[data-next]");
  // Two play buttons, one beside "Say hello" and one in the readout, always in the same state.
  const plays = [...document.querySelectorAll("[data-play]")];
  const setPlaying = (on) => {
    plays.forEach((button) => {
      button.setAttribute("aria-pressed", String(on));
      button.setAttribute("aria-label", on ? T.pause : T.play);
      const label = button.querySelector("[data-play-label]");
      if (label) label.textContent = on ? T.pause : T.play;
      const icon = button.querySelector("[data-icon] path");
      if (icon && ICONS.play) icon.setAttribute("d", on ? ICONS.pause : ICONS.play);
    });
  };

  let current = 0;
  let timer = null;
  let pendingStart = null;
  setPlaying(false);

  function send(i) {
    if (reduceMotion.matches) return;
    const c = connections[i];
    const a = position[c.from];
    const b = position[c.to];
    if (!a || !b) return;
    const packet = document.createElement("span");
    packet.className = "packet";
    packet.setAttribute("aria-hidden", "true");
    map.append(packet);
    const from = `translate(${a.x}px, ${a.y}px)`;
    const to = `translate(${b.x}px, ${b.y}px)`;
    const run = packet.animate(
      [
        { transform: `${from} scale(0.6)`, opacity: 0 },
        { transform: `${from} scale(1)`, opacity: 1, offset: 0.15 },
        { transform: `${to} scale(1)`, opacity: 1, offset: 0.85 },
        { transform: `${to} scale(0.6)`, opacity: 0 },
      ],
      { duration: 1000, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }
    );
    run.onfinish = () => packet.remove();
  }

  function paint(active, activeNodes) {
    edges.forEach((edge, i) => edge.classList.toggle("is-active", active.includes(i)));
    Object.entries(nodes).forEach(([id, node]) => {
      const on = activeNodes.has(id);
      node.classList.toggle("is-active", on);
      labels[id].classList.toggle("is-active", on);
      node.setAttribute("aria-pressed", String(on));
    });
    const year = connections[current].year;
    milestones.forEach((m, i) => m.classList.toggle("is-active", ROWS[i].year === year));
  }

  function show(i) {
    const c = connections[i];
    yearEl.textContent = c.year;
    whereEl.textContent = c.where;
    lineEl.textContent = c.line;
    prev.disabled = i === 0;
    next.disabled = i === connections.length - 1;
  }

  function select(i, { animate = true } = {}) {
    current = i;
    const c = connections[i];
    paint([i], new Set([c.from, c.to]));
    show(i);
    if (animate) send(i);
  }

  function selectNode(id, { animate = true } = {}) {
    const related = connections.map((c, i) => (c.from === id || c.to === id ? i : -1)).filter((i) => i >= 0);
    if (!related.length) return;
    current = related[0];
    const touched = new Set([id]);
    related.forEach((i) => {
      touched.add(connections[i].from);
      touched.add(connections[i].to);
    });
    paint(related, touched);
    show(current);
    if (animate) related.forEach((i, n) => window.setTimeout(() => send(i), n * 180));
  }

  function reveal() {
    if (!narrow.matches) return;
    const box = panel.getBoundingClientRect();
    if (box.bottom > window.innerHeight || box.top < 0) {
      panel.scrollIntoView({ block: "nearest", behavior: reduceMotion.matches ? "auto" : "smooth" });
    }
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    if (pendingStart !== null) window.clearTimeout(pendingStart);
    timer = null;
    pendingStart = null;
    setPlaying(false);
  }

  function start({ fromStart = false } = {}) {
    if (fromStart || current >= connections.length - 1) select(0);
    else select(current + 1);
    setPlaying(true);
    timer = window.setInterval(() => {
      if (current >= connections.length - 1) {
        stop();
        return;
      }
      select(current + 1);
    }, 2600);
  }

  prev.addEventListener("click", () => {
    stop();
    if (current > 0) select(current - 1);
  });
  next.addEventListener("click", () => {
    stop();
    if (current < connections.length - 1) select(current + 1);
  });
  plays.forEach((button) =>
    button.addEventListener("click", () => {
      if (timer || pendingStart !== null) {
        stop();
        return;
      }
      // From the hero, frame the map and its readout together so the stops and the story are both
      // in view. If they do not fit, keep the readout whole and show as much of the map as possible.
      if (button.hasAttribute("data-play-scroll")) {
        const m = map.getBoundingClientRect();
        const p = panel.getBoundingClientRect();
        const top = Math.min(m.top, p.top);
        const bottom = Math.max(m.bottom, p.bottom);
        const margin = 12;
        if (top < margin || bottom > window.innerHeight - margin) {
          const fits = bottom - top <= window.innerHeight - 2 * margin;
          const target = window.scrollY + (fits ? top - margin : bottom - window.innerHeight + margin);
          // The page route line draws as the reader scrolls; our own auto-scroll must not count
          // as reading. Tell it how far we are about to move so it re-baselines from here.
          window.dispatchEvent(new CustomEvent("route:pin", { detail: Math.max(0, target - window.scrollY) }));
          window.scrollTo({ top: Math.max(0, target), behavior: reduceMotion.matches ? "auto" : "smooth" });
          setPlaying(true);
          pendingStart = window.setTimeout(() => {
            pendingStart = null;
            start({ fromStart: true });
          }, reduceMotion.matches ? 0 : 500);
          return;
        }
      }
      start({ fromStart: button.hasAttribute("data-play-scroll") });
    })
  );

  // The route draws itself once, and each station appears as the line reaches it.
  function drawIn() {
    if (reduceMotion.matches || !route.getTotalLength) return 0;
    const length = route.getTotalLength();
    const duration = parseFloat(getComputedStyle(map).getPropertyValue("--route-draw")) || 1600;
    const easing = "cubic-bezier(0.65, 0, 0.35, 1)";
    route.animate([{ strokeDasharray: `${length}`, strokeDashoffset: length }, { strokeDasharray: `${length}`, strokeDashoffset: 0 }], { duration, easing });
    const order = [];
    ROWS.forEach((row, i) => {
      order.push(milestones[i]);
      const ids = i % 2 === 0 ? row.stations : [...row.stations].reverse();
      ids.forEach((id) => order.push([nodes[id], labels[id]]));
    });
    order.push(end);
    order.forEach((item, n) => {
      const delay = (n / order.length) * duration;
      [item].flat().forEach((el) => {
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" });
      });
    });
    return duration;
  }

  // Open on the present: Renti, the latest stop, with both of its connections lit.
  const HOME = "rental";

  map.classList.add("is-ready");
  panel.hidden = false;
  layout();
  new ResizeObserver(layout).observe(map);
  selectNode(HOME, { animate: false });

  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(() => {
    layout();
    const drawn = drawIn();
    window.setTimeout(() => selectNode(HOME), drawn + 300);
  });
})();
