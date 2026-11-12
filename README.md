# leandroiannotti.com

Personal website of Leandro Iannotti, software engineer and tech lead in Auckland.

A single static page: plain HTML and CSS, no build step, served by GitHub Pages from `master` with the custom domain in `CNAME`.

## Structure

- `index.html`: the page in English; `es/index.html`: the same page in Spanish. Keep both in sync.
- `assets/js/map.js`: the interactive route map (labels for both languages live here).
- `assets/js/site.js`: light and dark mode toggle, and the section reveal on scroll.
- `assets/js/icons.js`: Phosphor icons (MIT) used by the map and the mode toggle.
- `assets/css/tokens.css`: colours, type, spacing and sizes. Every colour and font goes through a token.
- `assets/css/base.css`: base rules from the Hallmark scaffold.
- `assets/css/site.css`: the page styles. Its first lines record the design decisions.
- `assets/img/illustrations/`: ink illustrations (portrait, Buenos Aires, Auckland, coffee and mate) and their `-dark` twins, made with `tools/dark-illustrations.py`.
- `assets/img/`: Poplar Labs mark (`poplar-mark.svg`), flags and the social preview (`og.jpg`, 1200 x 630).
- `assets/leandro-iannotti.vcf`: the contact card behind "Save my contact".
- `assets/js/route.js`: the route line that draws itself down the page on scroll.

## Local preview

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Mobile route regression check

With the preview server running, install `puppeteer-core` in a separate test directory:

```sh
npm install --prefix /tmp/opencode/personal-site-tests puppeteer-core
PUPPETEER_MODULE=/tmp/opencode/personal-site-tests/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js node tools/test-route-framing.mjs
```

Set `CHROME_PATH` if Chrome is not at `/usr/bin/google-chrome`, or `SITE_URL` for another preview address.
The check verifies that the map, its labels and the readout stay visible through all eight stops in both languages at three phone sizes. It also checks cancellation while scrolling to the map.

## Design

Built with the [Hallmark](https://github.com/Nutlope/hallmark) design rules (custom direction). Check it with:

```sh
node <hallmark>/skills/hallmark/scripts/sloplint.mjs index.html --render
```
