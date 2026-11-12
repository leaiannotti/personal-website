# leandroiannotti.com

Personal website of Leandro Iannotti, software engineer and tech lead in Auckland.

A single static page: plain HTML and CSS, no build step, served by GitHub Pages from `master` with the custom domain in `CNAME`.

## Structure

- `index.html`: the page.
- `assets/css/tokens.css`: colours, type, spacing and sizes. Every colour and font goes through a token.
- `assets/css/base.css`: base rules from the Hallmark scaffold.
- `assets/css/site.css`: the page styles. Its first lines record the design decisions.
- `assets/img/`: portrait (`leandro.webp`, `leandro.jpg`) and the social preview (`og.jpg`, 1200 x 630).

## Local preview

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Design

Built with the [Hallmark](https://github.com/Nutlope/hallmark) design rules (custom direction). Check it with:

```sh
node <hallmark>/skills/hallmark/scripts/sloplint.mjs index.html --render
```
