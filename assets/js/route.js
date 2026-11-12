(() => {
  // The route keeps going after the map: from the "Now" tag down the page edge,
  // through a station at each section, to the portrait in the contact band.
  // It draws itself as the reader scrolls; stations light up as the line reaches them.
  const start = () => document.querySelector(".milestone-end");
  const end = document.querySelector("[data-route-end]");
  const stations = [...document.querySelectorAll("[data-station]")];
  const container = document.querySelector("main .container");
  if (!end || !stations.length || !container) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.classList.add("page-route");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  svg.append(path);
  document.body.append(svg);

  const dots = stations.map(() => {
    const dot = document.createElement("span");
    dot.className = "route-stop";
    dot.setAttribute("aria-hidden", "true");
    document.body.append(dot);
    return dot;
  });

  let samples = [];
  let length = 0;
  let stopYs = [];
  let lead = 0;
  let pin = 0;
  let ticking = false;

  const page = (rect) => ({ x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height });

  // Layout position without transforms: the reveal animation shifts sections down until they
  // arrive, and the route must aim at where they land, not where they start.
  const settled = (el) => {
    let x = 0;
    let y = 0;
    for (let node = el; node; node = node.offsetParent) {
      x += node.offsetLeft;
      y += node.offsetTop;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };

  function layout() {
    const tag = start();
    if (!tag) return;
    const footer = document.querySelector("footer");
    const H = footer ? settled(footer).y + footer.offsetHeight : document.body.offsetHeight;
    const W = document.documentElement.clientWidth;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.height = `${H}px`;

    const box = settled(container);
    const gutter = parseFloat(getComputedStyle(container).paddingLeft) || 32;
    const x = box.x + gutter / 2;
    const r = Math.min(40, gutter);
    const t = page(tag.getBoundingClientRect());
    const sx = t.x + t.w / 2;
    const sy = t.y + t.h;
    // At the top of the page nothing is drawn yet: the line starts growing from "Now" with the first scroll.
    lead = Math.max(0, window.innerHeight * 0.72 - sy);
    const first = settled(stations[0]);
    const readout = document.querySelector("[data-panel]");
    // On a phone the readout sits under the map, so the route leaves for the edge right after "Now".
    const mapBox = page(tag.parentElement.getBoundingClientRect());
    const stacked = readout && settled(readout).x + 1 >= mapBox.x;
    // Otherwise it turns in the free band between the hero's lowest content and the next section.
    const heroBottom = Math.max(
      settled(readout).y + readout.offsetHeight,
      page(tag.parentElement.getBoundingClientRect()).y + tag.parentElement.offsetHeight
    );
    const turnY = stacked ? sy + Math.max(24, r * 2) : heroBottom + (first.y - heroBottom) * 0.4;
    const photo = settled(end);
    const ey = photo.y + photo.h / 2;
    const ex = photo.x;

    stopYs = stations.map((s) => {
      const b = settled(s);
      return b.y + Math.min(b.h / 2, 28);
    });
    stopYs.forEach((y, i) => {
      dots[i].style.setProperty("--x", `${x}px`);
      dots[i].style.setProperty("--y", `${y}px`);
    });

    const r1 = Math.max(2, Math.min(r, (sx - x) / 2));
    const r2 = Math.max(2, Math.min(r, (ex - x) / 2));
    const d = [
      `M ${sx} ${sy}`,
      `L ${sx} ${turnY - r1}`,
      `A ${r1} ${r1} 0 0 1 ${sx - r1} ${turnY}`,
      `L ${x + r1} ${turnY}`,
      `A ${r1} ${r1} 0 0 0 ${x} ${turnY + r1}`,
      `L ${x} ${ey - r2}`,
      `A ${r2} ${r2} 0 0 0 ${x + r2} ${ey}`,
      `L ${ex} ${ey}`,
    ];
    path.setAttribute("d", d.join(" "));

    length = path.getTotalLength();
    samples = [];
    for (let l = 0; l <= length; l += 6) samples.push({ l, y: path.getPointAtLength(l).y });
    path.style.strokeDasharray = `${length}`;
    update();
  }

  function update() {
    ticking = false;
    // Scroll that the site performs itself (the play button framing the map) is not reading:
    // the line only advances from what the reader scrolls after that.
    const tip = reduceMotion.matches
      ? Infinity
      : Math.max(0, window.scrollY - pin) + window.innerHeight * 0.72 - lead;
    let drawn = length;
    if (tip !== Infinity) {
      const hit = samples.find((s) => s.y >= tip);
      drawn = hit ? hit.l : length;
    }
    path.style.strokeDashoffset = `${length - drawn}`;
    path.style.visibility = drawn < 1 ? "hidden" : "visible";
    stopYs.forEach((y, i) => dots[i].classList.toggle("is-reached", y <= tip));
  }

  window.addEventListener("route:pin", (e) => {
    pin += Math.max(0, e.detail || 0);
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true }
  );

  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(() => window.setTimeout(layout, 50));
  new ResizeObserver(() => window.requestAnimationFrame(layout)).observe(document.body);
})();
