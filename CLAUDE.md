# dawsonfields.com

Static site for GitHub Pages. Plain HTML, one stylesheet, one small JS file. No framework, no bundler.
Absolute paths (`/assets/...`) assume the custom domain, so preview with a local server rather than opening files.

    python3 -m http.server 8000

## Layout
- `index.html`, `projects/`, `404.html`: pages. Header and footer markup is identical on every page.
- `assets/css/style.css`: all styling, using CSS variables (light and dark). The look follows trekhleb.dev: Inter font (self-hosted in `assets/fonts/`), 1280px container, card grid, stats column.
- `assets/js/main.js`: theme toggle, nav highlight, footer year.
- `assets/img/`: `headshot.jpg`, icons (`icon-192/512.png`, plus `/favicon.ico`, `/apple-touch-icon.png`, `/site.webmanifest` at the root), `og-image.png` (social preview) and `projects/<slug>-N.webp`. Resize before adding: about 1200px wide WebP (`convert in.png -resize '1200x>' -strip -quality 78 out.webp`).
- `_originals/`: full-size source images. Git-ignored, so keep your own backup.
- `scripts/build.mjs`: regenerates `sitemap.xml` from `projects/*/`. Run `node scripts/build.mjs` after adding a project.

## Blog
There isn't one. It was removed on purpose (add things as projects instead). The old blog setup (post template, `data/posts.json`, RSS feed, generated post lists) is in git history if it's ever wanted back.

## Add a project
Each project is a card in `projects/index.html` (and optionally the featured grid in `index.html`) that links to its own page at `projects/<slug>/index.html`.
1. Copy an existing `<li id="slug">` card. The `.thumb` block is a gradient placeholder (`g1` to `g4`); replace it with `<img src="/assets/img/...">` once there's a screenshot.
2. Copy an existing project folder (for example `projects/corose/`) to `projects/<slug>/` and edit its title, meta description, canonical URL and body. Project pages use the two-column `.project-layout`: title and tech chips on the left, text below them, and on the right (`.project-aside`, pinned while you scroll, stacked under the title on phones) an image carousel. Each image is a `<figure class="slide">` inside `.carousel-track`; with more than one image keep the prev/next buttons, dots and counter, with a single image delete them. Videos can go in the text column (a lazy `youtube-nocookie.com` iframe with class `embed`) or be extra carousel slides after the photos, as on Eagle Scout (`<figure class="slide slide-video">` holding the iframe; remember to update the dots and the "k of n" labels). Bible Reference Explorer is the exception: its right column holds the live embed instead (`.pin-embed`).
3. Run `node scripts/build.mjs` to add it to the sitemap.

## Tech chips (project pages and the home page's "Languages and Technologies")
Tech is shown as a row of wireframe icons that expand on hover, focus or tap to show the tech's name and a short description. The icons are custom and live in one sprite, `assets/img/tech-wireframes.svg` (32x32 grid, line only; width and caps come from `.tech-icon` in the CSS, so all stay uniform). To use one, copy an existing `<li><button class="tech">...</button></li>` and change the `#id`, name and description. To add a new tech, add a `<symbol id="...">` to the sprite in the same style. Non-tech projects (Eagle Scout) don't get a row.

How opening works (keep this when editing): hover is driven by real pointer MOVEMENT (a `pointermove` listener plus `elementFromPoint`), never by `mouseenter`/`mouseleave`, and the CSS `:hover` expansion only applies when JavaScript is off (`html:not(.js-tech)`). Browsers fire fresh enter/leave events when layout changes under a stationary mouse, and reacting to those made chips open and close each other in a loop (seen in a screen recording). Also, every chip keeps a fixed 2.75rem slot, so the chip under the cursor never moves. If it did, a chip near the end of a row would wrap onto the next line, slide out from under the cursor, close, and flicker forever. `.tech-list` is an auto-fill grid that fills the block's full width. `assets/js/main.js` opens a chip in one of two ways:
- If there is room to its right in the row, the chips after it slide over (a `translateX`, so the layout itself never changes).
- Otherwise (a full row, which is the usual case on the home page) the pill takes over neighbouring cells, leftward when it can and rightward otherwise. Every chip in that row that is NOT under the pill is pinned to its own cell, so only the chips it covers move: they flow, in order, into the next row (animated with a small FLIP slide). Closing restores the original layout.
Without JavaScript the pill still opens, rightward over its neighbours.

The home page lists the languages and tools from the old resume page. Operating systems (Linux, Windows, macOS) were removed on purpose, as were TinkerPop and SQL (no icon was made).

The Bible Reference Explorer page is the one special page (the carousel is plain scroll-snap plus a little JS in `main.js`): `body.theme-midnight.bre-bg` gives it the project's image as a fixed background, a wider container, and a two-column layout with a pinned embed (`.project-layout`).

## Changing the header, nav or footer
Edit every page. Search for `site-header` to find them all.

## Interactive widgets
Prefer vanilla JS. If a page needs a real app (React etc.), keep it isolated under its own folder and commit the built output.
