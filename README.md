# alxjrvs.com

Personal site: an [Astro](https://astro.build) site on a
[Cloudflare Worker](https://developers.cloudflare.com/workers/) at
[alxjrvs.com](https://alxjrvs.com). Projects first, plus the occasional piece of writing.

Bun, TypeScript (strictest), Biome for formatting and linting. **Every word on the site lives in
[EmDash](https://github.com/emdash-cms/emdash)**, Cloudflare's open-source Astro CMS, which runs
inside the same Worker: posts, project cards, the About bio and section headings, the die's
word lists and the site title all live in its D1 database, and its admin is
[admin.alxjrvs.com](https://admin.alxjrvs.com). Changing text is an edit and a
Publish there, with no PR. Pages render in the Worker and sit in the Workers cache; EmDash purges
them when something they show is published. Fonts, CSS, screenshots and the favicon are static
assets in `public/`. Visits are counted by
[Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/) (cookieless).

Design: **E · Oversized**. One scrolling page, each section at least a screen tall: a huge
two-tone `alxjrvs` wordmark with the rollable tagline, then project cards, latest writing (once
there is any) and About. As you scroll, a floating header slides in and the wordmark shrinks
into it. The look, motion and copy rules live in [DESIGN.md](DESIGN.md).

## Working on it

```sh
bun install
bun run dev          # → http://localhost:4321, admin at /_emdash/admin (local passkey)
bun run check        # format, lint, typecheck (what CI's `check` job runs)
bun run build        # → dist/ (dist/client: static assets, dist/server: the Worker)
bun run check:links  # crawl a local `astro preview` and check every internal link (CI's `build` job)
bun run preview      # build, then run the Worker locally (wrangler dev)
bun run format       # let Biome fix formatting
```

Locally EmDash uses a throwaway D1 database under `.wrangler/`. To fill it with the site's
starting text, run it once so EmDash creates its tables, then
`bunx emdash seed seed/seed.json -d .wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite`.

## Deploying

`.github/workflows/deploy.yml` builds and runs `wrangler deploy` on every push to `main`, and
uploads a preview version for every PR (its URL is in the run summary). It needs the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets; without them it builds
and skips the deploy. The Worker, its route on `alxjrvs.com/*`, its asset handling and its
EmDash bindings (D1 `alxjrvs-emdash`, R2 `alxjrvs-emdash-media`, KV `alxjrvs-sessions`) are in
`wrangler.jsonc`; the `alxjrvs.com` zone (DNS, the www → apex redirect) is on the same Cloudflare
account. PR previews share the production database, so they show the live text.

The admin is `admin.alxjrvs.com`, a second hostname on the same Worker, and the whole hostname
is behind [Cloudflare Access](https://one.dash.cloudflare.com/) (team
`alxjrvs.cloudflareaccess.com`): Google sign-in, alxjrvs@gmail.com only. EmDash checks the
Access token itself (`access()` in `astro.config.ts`; the app's audience tag is
`CF_ACCESS_AUDIENCE` in `wrangler.jsonc`) and has no other way in. On every other hostname
`src/worker.ts` sends `/_emdash/*` to the admin host, except uploaded media
(`/_emdash/api/media/file/*`), which posts link to.

Code changes deploy as before. Schema changes (a new field, say) go through `seed/seed.json`
for fresh databases and the admin's Content Types screen for the live one.

## Structure

| Path                         | What it is |
|------------------------------|------------|
| `astro.config.ts`            | Astro + the Cloudflare adapter, EmDash (D1, R2, Access), route caching |
| `seed/seed.json`             | EmDash's content model and the site's starting text |
| `src/lib/content.ts`         | Every read from EmDash: posts, projects, sections, randomizers, site settings |
| `src/site.ts`                | Settings that aren't copy: URL, time zone, social card, the Web Analytics token |
| `src/pages/index.astro`      | The whole home page |
| `src/pages/writing/`         | The archive at `/writing/`, grouped by year, one page per post, and one per tag (`tags/`) |
| `src/pages/[...redirect].astro` | `/about/`, `/projects/` and old `/work/...` URLs, 301'd to the matching section |
| `src/pages/feed.xml.ts`, `sitemap.xml.ts` | The Atom feed and the sitemap |
| `src/pages/projects.json.ts` | The project list, for the Screenshots workflow |
| `src/layouts/`               | `Base.astro` (floating header, theme toggle, back-to-top, footer) |
| `src/components/`            | The die, the wordmark, SEO tags, the post list, rich text (`Prose.astro`), inline scripts |
| `src/client/`                | The page scripts, in TypeScript: theme, header, die roll, wordmark recede, section snapping. Compiled at build time and rendered inline (see `InlineScript.astro`) |
| `src/worker.ts`              | The Worker entry: Astro, plus EmDash's cron for scheduled publishing |
| `public/assets/css/site.css` | The whole design |
| `public/assets/work/`        | Project screenshots (WebP, 1280×800 + 640×400), refreshed by the Screenshots workflow |
| `public/_headers`, `_redirects` | Cloudflare response headers and path redirects |
| `wrangler.jsonc`             | The Worker: route, assets, D1/R2/KV bindings, cron |

## Editing the site

Everything below happens in the admin at [admin.alxjrvs.com](https://admin.alxjrvs.com). Edits are drafts until you
press **Publish**; publishing shows up on the site within seconds.

- **Writing** (the `posts` collection): title, dek, optional tags (the editor's Tags box; each
  gets a page at `/writing/tags/<slug>/`, and only tags on published pieces show), optional project slug (links the post and its project card both ways),
  and the body in the rich-text editor. Add images under **Comic pages** (in reading order, each
  with a line on what's on it) and the piece becomes a comic: readers click, tap, swipe or
  arrow-key through the pages one at a time, and the body shows as a note under them. Only **published** pieces appear on the site; drafts and
  unpublished ones never do. A piece lands at `/writing/<slug>/`, dated when it was
  first published; scheduling works too. Until the first piece is published, the Writing nav link
  and the home-page writing section stay hidden and `/writing/` shows the empty state.
- **Projects**: one entry per card, in `order`. Unpublish one to hide its card. Screenshots
  are files: the Screenshots workflow captures `public/assets/work/<slug>.webp` for every
  published project each night, and the card shows it once **Screenshot name** is set.
- **Sections**: `about` (the bio), `projects` and `writing` (home-page headings; a nav label
  puts them in the header), `writing-archive` (the `/writing/` page and its empty state) and
  `not-found` (the 404 page).
- **Randomizers**: the die's lists, one item per line, the first line being what shows before
  any roll: `tagline-subjects` (plus the rare roll and its odds), `tagline-objects` (its lead-in
  is the "I make"), and `likes-1` to `likes-3` (the first one's lead-in is "I like").
- **Settings**: the site title, and the tagline field, which is the meta description.

## Design notes

- **Type**: Familjen Grotesk (700 for display, tight tracking), IBM Plex Mono for labels and dates.
- **Colour**: see [DESIGN.md](DESIGN.md) for the palette, roles and the rest of the design language.
- **Header**: hidden on the first screen; it slides in as you scroll while the wordmark shrinks
  into its brand slot. Without JS it's simply always there.
- **Theme**: follows the OS light/dark setting, live, set before first paint so there's no
  flash. The toggle overrides it only while it disagrees with the OS.
