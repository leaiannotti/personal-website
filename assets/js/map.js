(() => {
  const map = document.querySelector("[data-map]");
  const log = document.querySelector("[data-log]");
  const panel = document.querySelector("[data-panel]");
  if (!map || !log || !panel) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrow = window.matchMedia("(max-width: 40rem)");

  // Each row is one stop on the career route; stations sit left, middle and right on the row.
  const ROWS = [
    { year: "2012", name: "GeoSystems", city: "Buenos Aires", stations: ["cad", "cadastre", "fieldapp"] },
    { year: "2015", name: "Infor", city: "Buenos Aires", stations: ["tracking", "warehouse", "trace"] },
    { year: "2019", name: "Sandfield", city: "Auckland", stations: ["hardware", "supply", "mobile"] },
    { year: "2023", name: "Renti", city: "Auckland", stations: ["tenant", "rental", "sso"] },
  ];

  const LABELS = {
    cad: "CAD drawings", cadastre: "Cadastre", fieldapp: "Field app",
    tracking: "Vehicle tracking", warehouse: "Warehouse", trace: "Traceability",
    hardware: "Field hardware", supply: "Supply chain", mobile: "Mobile apps",
    tenant: "Tenant app", rental: "Rental platform", sso: "SSO sign-in",
  };

  // Coordinates are percentages of the map box. Auckland rows step right: the route crosses the Pacific.
  const LAYOUTS = {
    wide: { rows: [17, 39, 67, 89], spine: [3, 3, 10, 10], columns: [[30, 58, 86], [30, 58, 86], [35, 62, 88], [35, 62, 88]] },
    narrow: { rows: [14, 37, 66, 89], spine: [2, 2, 6, 6], columns: [[25, 54, 83], [25, 54, 83], [29, 56, 83], [29, 56, 83]] },
  };

  const connections = [...log.querySelectorAll("li")].map((li) => ({
    from: li.dataset.from,
    to: li.dataset.to,
    year: li.dataset.year,
    where: li.dataset.where,
    photo: li.dataset.photo,
    alt: li.dataset.alt,
    line: li.textContent.trim(),
  }));

  [...new Set(connections.map((c) => c.photo))].forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("map-lines");

  const spine = document.createElementNS(SVG_NS, "polyline");
  spine.classList.add("spine");
  svg.append(spine);

  const feeders = ROWS.map(() => {
    const line = document.createElementNS(SVG_NS, "line");
    line.classList.add("feeder");
    svg.append(line);
    return line;
  });

  const edges = connections.map(() => {
    const line = document.createElementNS(SVG_NS, "line");
    line.classList.add("edge");
    svg.append(line);
    return line;
  });

  map.append(svg);

  const rowLabels = ROWS.map((row) => {
    const label = document.createElement("p");
    label.className = "row-label";
    label.innerHTML = `<span class="row-year">${row.year}</span> ${row.name}`;
    map.append(label);
    return label;
  });

  const stopDots = ROWS.map(() => {
    const dot = document.createElement("span");
    dot.className = "stop-dot";
    dot.setAttribute("aria-hidden", "true");
    map.append(dot);
    return dot;
  });

  const nodes = {};
  ROWS.forEach((row) => {
    row.stations.forEach((id) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "node";
      button.textContent = LABELS[id];
      button.setAttribute("aria-label", `${LABELS[id]}, ${row.year} at ${row.name}`);
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        stop();
        selectNode(id);
        window.setTimeout(reveal, 450);
      });
      map.append(button);
      nodes[id] = button;
    });
  });

  const position = {};

  function layout() {
    const set = narrow.matches ? LAYOUTS.narrow : LAYOUTS.wide;
    const points = [];
    ROWS.forEach((row, r) => {
      const y = set.rows[r];
      const sx = set.spine[r];
      points.push(`${sx},${y}`);
      row.stations.forEach((id, c) => {
        const x = set.columns[r][c];
        position[id] = { x, y };
        nodes[id].style.setProperty("--x", x);
        nodes[id].style.setProperty("--y", y);
      });
      rowLabels[r].style.setProperty("--x", sx);
      rowLabels[r].style.setProperty("--y", y);
      stopDots[r].style.setProperty("--x", sx);
      stopDots[r].style.setProperty("--y", y);
      const first = position[row.stations[0]];
      feeders[r].setAttribute("x1", sx);
      feeders[r].setAttribute("y1", y);
      feeders[r].setAttribute("x2", first.x);
      feeders[r].setAttribute("y2", first.y);
    });
    spine.setAttribute("points", points.join(" "));
    connections.forEach((c, i) => {
      const a = position[c.from];
      const b = position[c.to];
      edges[i].setAttribute("x1", a.x);
      edges[i].setAttribute("y1", a.y);
      edges[i].setAttribute("x2", b.x);
      edges[i].setAttribute("y2", b.y);
    });
  }

  const yearEl = panel.querySelector("[data-panel-year]");
  const whereEl = panel.querySelector("[data-panel-where]");
  const lineEl = panel.querySelector("[data-panel-line]");
  const prev = panel.querySelector("[data-prev]");
  const next = panel.querySelector("[data-next]");
  const play = panel.querySelector("[data-play]");
  const photoEl = panel.querySelector("[data-panel-photo]");

  let current = 0;
  let timer = null;

  function send(i) {
    if (reduceMotion.matches) return;
    const c = connections[i];
    const box = map.getBoundingClientRect();
    const a = position[c.from];
    const b = position[c.to];
    const packet = document.createElement("span");
    packet.className = "packet";
    packet.setAttribute("aria-hidden", "true");
    map.append(packet);
    const from = `translate(${(a.x / 100) * box.width}px, ${(a.y / 100) * box.height}px)`;
    const to = `translate(${(b.x / 100) * box.width}px, ${(b.y / 100) * box.height}px)`;
    const run = packet.animate(
      [
        { transform: `${from} scale(0.6)`, opacity: 0 },
        { transform: `${from} scale(1)`, opacity: 1, offset: 0.12 },
        { transform: `${to} scale(1)`, opacity: 1, offset: 0.88 },
        { transform: `${to} scale(0.6)`, opacity: 0 },
      ],
      { duration: 1100, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }
    );
    run.onfinish = () => packet.remove();
  }

  function paint(active, activeNodes) {
    edges.forEach((edge, i) => edge.classList.toggle("is-active", active.includes(i)));
    Object.entries(nodes).forEach(([id, node]) => {
      const on = activeNodes.has(id);
      node.classList.toggle("is-active", on);
      node.setAttribute("aria-pressed", String(on));
    });
  }

  function show(i) {
    const c = connections[i];
    yearEl.textContent = c.year;
    whereEl.textContent = c.where;
    lineEl.textContent = c.line;
    if (photoEl && !photoEl.src.endsWith(c.photo)) {
      photoEl.src = c.photo;
      photoEl.alt = c.alt;
      if (!reduceMotion.matches) {
        photoEl.animate(
          [{ opacity: 0, transform: "scale(1.04)" }, { opacity: 1, transform: "scale(1)" }],
          { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
        );
      }
    }
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

  function selectNode(id) {
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
    related.forEach((i, n) => window.setTimeout(() => send(i), n * 180));
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
    timer = null;
    play.setAttribute("aria-pressed", "false");
    play.textContent = "Play the route";
  }

  function start() {
    if (current >= connections.length - 1) select(0);
    else select(current + 1);
    play.setAttribute("aria-pressed", "true");
    play.textContent = "Pause";
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
  play.addEventListener("click", () => (timer ? stop() : start()));

  narrow.addEventListener("change", layout);
  layout();
  map.classList.add("is-ready");
  panel.hidden = false;
  select(0, { animate: false });

  const hint = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      window.setTimeout(() => send(0), 700);
      hint.disconnect();
    }
  });
  hint.observe(map);
})();
