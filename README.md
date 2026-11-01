# alxjrvs.com

Personal site: a static [Astro](https://astro.build) site served by
[Cloudflare](https://developers.cloudflare.com/workers/static-assets/) at
[alxjrvs.com](https://alxjrvs.com). Projects first, plus the occasional piece of writing.

Bun, TypeScript (strictest), Biome for formatting and linting. The build is plain HTML,
CSS and a few inline scripts in `dist/`, uploaded as the assets of a Worker with no script:
nothing runs on Cloudflare at request time. Visits are counted by
[Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/) (cookieless).

Design: **E · Oversized**. One scrolling page, each section at least a screen tall: a huge
two-tone `alxjrvs` wordmark with the rollable tagline, then project cards, latest writing (once
there is any) and About. As you scroll, a floating header slides in and the wordmark shrinks
into it. The look, motion and copy rules live in [DESIGN.md](DESIGN.md).

## Working on it

```sh
bun install
bun run dev          # → http://localhost:4321
bun run check        # format, lint, typecheck (what CI's `check` job runs)
bun run build        # → dist/
bun run check:links  # every internal link in dist/ resolves (CI's `build` job)
bun run preview      # build, then serve dist/ the way Cloudflare does (wrangler dev)
bun run format       # let Biome fix formatting
```

## Deploying

`.github/workflows/deploy.yml` builds and runs `wrangler deploy` on every push to `main`, and
uploads a preview version for every PR (its URL is in the run summary). It needs the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets; without them it builds
and skips the deploy. The Worker, its route on `alxjrvs.com/*` and its asset handling are in `wrangler.jsonc`;
the `alxjrvs.com` zone (DNS, the www → apex redirect) is on the same Cloudflare account.

## Structure

| Path                         | What it is |
|------------------------------|------------|
| `src/site.ts`                | Site settings: title, tagline, nav, social card, the Web Analytics token |
| `src/pages/index.astro`      | The whole home page |
| `src/pages/writing/`         | The archive at `/writing/`, grouped by year, and one page per post |
| `src/pages/[...redirect].astro` | `/about/`, `/projects/` and old `/work/...` URLs, sent to the matching section |
| `src/pages/feed.xml.ts`, `sitemap.xml.ts` | The Atom feed and the sitemap |
| `src/layouts/`               | `Base.astro` (floating header, theme toggle, back-to-top, footer) |
| `src/components/`            | The die, the wordmark, SEO tags, the post list, inline scripts |
| `src/client/`                | The page scripts, in TypeScript: theme, header, die roll, wordmark recede, section snapping. Rendered inline (see `InlineScript.astro`) |
| `src/content/projects/`      | One front-matter-only file per project; each becomes a card (no project pages) |
| `src/content/posts/`         | Blog posts (`YYYY-MM-DD-slug.md`), none yet |
| `src/data/`                  | The tagline word lists, the "I like …" slots, and the bio (`about.md`) |
| `public/assets/css/site.css` | The whole design |
| `public/assets/work/`        | Project screenshots (WebP, 1280×800 + 640×400), refreshed by the Screenshots workflow |
| `public/_headers`, `_redirects` | Cloudflare response headers and path redirects |
| `wrangler.jsonc`             | The Cloudflare Worker that serves `dist/` |

## Adding a project

Add `src/content/projects/<name>.md`:

```markdown
---
order: 5                      # position on the page
title: Name
summary: Two sentences for the card.
link: https://example.com     # the live site
link_label: example.com
shot: example                 # public/assets/work/example.webp (+ -640), captured by the Screenshots workflow
accent: "#1f5fbf"             # accent on the light theme
accent_dark: "#7fb0ff"        # accent on the dark theme
---
```

## Writing a post

Add `src/content/posts/YYYY-MM-DD-slug.md`:

```markdown
---
title: "Your title"
description: "Optional one-liner, shown on the archive and under the title."
project: optfall              # optional, links the post and its project both ways
date: 2026-07-16 09:00:00 -0400   # optional; otherwise the filename's date
---

Body in Markdown.
```

It lands at `/writing/slug/`. Writing works with zero posts: until the first one exists, the
Writing nav link and the home-page writing section stay hidden, and `/writing/` shows a short
empty state. Publish one post and they appear.

## Design notes

- **Type**: Familjen Grotesk (700 for display, tight tracking), IBM Plex Mono for labels and dates.
- **Colour**: see [DESIGN.md](DESIGN.md) for the palette, roles and the rest of the design language.
- **Header**: hidden on the first screen; it slides in as you scroll while the wordmark shrinks
  into its brand slot. Without JS it's simply always there.
- **Theme**: follows the OS light/dark setting, live, set before first paint so there's no
  flash. The toggle overrides it only while it disagrees with the OS.
