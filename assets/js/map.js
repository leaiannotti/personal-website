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

  const LABELS = {
    cad: "CAD drawings", cadastre: "Cadastre", fieldapp: "Field app",
    tracking: "Vehicle tracking", warehouse: "Warehouse", trace: "Traceability",
    hardware: "Field hardware", supply: "Supply chain", mobile: "Mobile apps",
    tenant: "Tenant app", rental: "Rental platform", sso: "Single sign-on",
  };

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
  end.textContent = "Now";
  map.append(end);

  const nodes = {};
  const labels = {};
  ROWS.forEach((row) => {
    row.stations.forEach((id) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "node";
      button.setAttribute("aria-label", `${LABELS[id]}, ${row.year} at ${row.name}`);
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
  }

  const yearEl = panel.querySelector("[data-panel-year]");
  const whereEl = panel.querySelector("[data-panel-where]");
  const lineEl = panel.querySelector("[data-panel-line]");
  const prev = panel.querySelector("[data-prev]");
  const next = panel.querySelector("[data-next]");
  const play = panel.querySelector("[data-play]");

  let current = 0;
  let timer = null;

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

  map.classList.add("is-ready");
  panel.hidden = false;
  layout();
  new ResizeObserver(layout).observe(map);
  if (document.fonts) document.fonts.ready.then(layout);
  select(0, { animate: false });

  const hint = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      window.setTimeout(() => send(0), 700);
      hint.disconnect();
    }
  });
  hint.observe(map);
})();
