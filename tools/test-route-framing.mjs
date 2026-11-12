import assert from "node:assert/strict";

const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE || "puppeteer-core");
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: "new",
});
const base = process.env.SITE_URL || "http://127.0.0.1:8000";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errors = [];

async function bounds(page) {
  return page.evaluate(() => {
    const map = document.querySelector("[data-map]").getBoundingClientRect();
    const panel = document.querySelector("[data-panel]").getBoundingClientRect();
    const labels = [...document.querySelectorAll(".node-label")].map((el) => el.getBoundingClientRect());
    const viewport = window.visualViewport;
    const viewTop = viewport?.offsetTop || 0;
    return {
      top: Math.min(map.top, ...labels.map((r) => r.top)),
      bottom: Math.max(panel.bottom, ...labels.map((r) => r.bottom)),
      viewTop, viewBottom: viewTop + (viewport?.height || innerHeight),
      panelHeight: panel.height,
    };
  });
}

try {
  for (const [width, height] of [[375, 667], [390, 844], [360, 740]]) {
    for (const path of ["/", "/es/"]) {
      const page = await browser.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewport({ width, height, isMobile: true, hasTouch: true });
      await page.goto(new URL(path, base).href, { waitUntil: "networkidle0" });
      await page.waitForFunction(() => document.querySelectorAll(".node").length === 12);
      await wait(2200);
      await page.tap(".hero-copy [data-play]");
      await wait(1600);
      await page.tap(".panel [data-play]");
      const reserved = await bounds(page);
      for (let step = 0; step < 8; step++) {
        const box = await bounds(page);
        const context = `${width}×${height}${path}, stop ${step}`;
        assert.ok(box.top >= box.viewTop - 1, `${context}: map top clipped`);
        assert.ok(box.bottom <= box.viewBottom + 1, `${context}: map or readout bottom clipped`);
        assert.ok(Math.abs(box.panelHeight - reserved.panelHeight) < 1, `${context}: readout height changed`);
        if (step < 7) await page.tap("[data-next]");
      }
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.$eval(".hero-copy [data-play]", (button) => { button.click(); button.click(); });
      await wait(750);
      assert.equal(await page.$eval("[data-play]", (button) => button.getAttribute("aria-pressed")), "false");
      console.log(`PASS ${width}×${height} ${path}: all eight stops and cancel during scroll`);
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
