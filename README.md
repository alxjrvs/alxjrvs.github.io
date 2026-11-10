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
them when something they show is published, and any copy is at most a few minutes old anyway. Fonts, CSS, screenshots and the favicon are static
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
bun run check:browser  # a real browser on BASE_URL: screenshots, console errors, overflow, axe (CI runs it on each PR preview)
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

## When something goes wrong

**The Canary workflow** (`.github/workflows/canary.yml`) checks once an hour that the home
page, the feed and an uncached, database-backed page answer, that the certificate and the
Cloudflare deploy token are not about to expire, and that the weekly backup ran. A failure opens
an issue titled "Canary: alxjrvs.com needs a look", which GitHub emails; the next green run
closes it.

**Rolling back a bad deploy.** Code: `bunx wrangler rollback` puts the previous version of the
Worker back at once (or pick one with `bunx wrangler versions list` and
`bunx wrangler versions deploy`), then revert the commit on `main` so the next deploy doesn't
bring it back. A rollback does not undo a database migration: if the bad deploy was an EmDash
upgrade that migrated, restore the database too.

### Restoring

There are two copies of the database to go back to.

- **The last 30 days, to the minute:** D1 Time Travel.
  `bunx wrangler d1 time-travel restore alxjrvs-emdash --timestamp <ISO time>` rewinds the live
  database in place. Use this for a bad edit or a bad migration.
- **The weekly backup** (`backup.yml`, kept 90 days as an encrypted workflow artifact): for
  losing the database or the account. A dump cannot be loaded over a database that already has
  tables, so it goes into a new one:

  ```sh
  gh run download <run id> -n alxjrvs-emdash-<run number>     # or from the run's page
  gpg --decrypt alxjrvs-emdash.sql.gz.gpg | gunzip > dump.sql  # passphrase: 1Password, "alxjrvs-d1-backup"
  bun scripts/order-dump.ts dump.sql > ordered.sql             # an export does not load as written
  bunx wrangler d1 create alxjrvs-emdash-restored
  bunx wrangler d1 execute alxjrvs-emdash-restored --remote --file ordered.sql
  bunx wrangler d1 execute alxjrvs-emdash-restored --remote --command "select count(*) from ec_posts"
  ```

  Then put the new database's id in `wrangler.jsonc` (`d1_databases`) and deploy. Uploaded
  images live in the R2 bucket `alxjrvs-emdash-media`, which the backup does not cover.

  Rehearsed on 2026-11-10 with a fresh export, into a scratch database that was deleted after:
  the export as written stopped at "no such table: main.media_folders", and the reordered one
  loaded with the same row, table and index counts as production. The decrypt step was not part
  of that rehearsal.

## Structure

| Path                         | What it is |
|------------------------------|------------|
| `astro.config.ts`            | Astro + the Cloudflare adapter, EmDash (D1, R2, Access), route caching |
| `seed/seed.json`             | EmDash's content model and the site's starting text |
| `src/lib/content.ts`         | Every read from EmDash: posts, projects, sections, randomizers, site settings |
| `src/site.ts`                | Settings that aren't copy: URL, time zone, social card, the Web Analytics token |
| `src/pages/index.astro`      | The whole home page |
| `src/pages/writing/`         | The archive at `/writing/`, grouped by year, one page per post, one per tag (`tags/`), and the threads (`threads/`: an index and one page per thread) |
| `src/pages/[...redirect].astro` | `/about/`, `/projects/` and old `/work/...` URLs, 301'd to the matching section |
| `src/pages/feed.xml.ts`, `sitemap.xml.ts` | The Atom feed and the sitemap |
| `src/pages/projects.json.ts` | The project list, for the Screenshots workflow |
| `src/layouts/`               | `Base.astro` (floating header, back-to-top, footer) |
| `src/components/`            | The die, the wordmark, SEO tags, the post list, rich text (`Prose.astro`), inline scripts |
| `src/client/`                | The page scripts, in TypeScript: header, die roll, wordmark recede, section snapping. Compiled at build time and rendered inline (see `InlineScript.astro`) |
| `src/worker.ts`              | The Worker entry: Astro, plus EmDash's cron for scheduled publishing |
| `public/assets/css/site.css` | The whole design |
| `public/assets/work/`        | Project screenshots (WebP, 1280×800 + 640×400), refreshed by the Screenshots workflow |
| `public/_headers`, `_redirects` | Cloudflare response headers and path redirects |
| `public/favicon.ico`, `apple-touch-icon.png` | The icons asked for by name, made from `assets/favicon.svg` by `bun run icons` |
| `AGENTS.md`                  | Rules for coding agents, and the list of ideas already turned down |
| `wrangler.jsonc`             | The Worker: route, assets, D1/R2/KV bindings, cron |

## Editing the site

Everything below happens in the admin at [admin.alxjrvs.com](https://admin.alxjrvs.com). Edits are drafts until you
press **Publish**; publishing shows up on the site within seconds.

- **Writing** (the `posts` collection): title, dek, optional tags (the editor's Tags box; each
  gets a page at `/writing/tags/<slug>/`, and only tags on published pieces show), optional project slug (links the post and its project card both ways),
  and the body in the rich-text editor. Add images under **Comic pages** (in reading order, each
  with a line on what's on it) and the piece becomes a comic: readers click, tap, swipe or
  arrow-key through the pages one at a time, and the body shows as a note under them.
  **Bylines** (the editor's Bylines panel; people are kept under **Bylines** in the admin) credits
  whoever made it, each with a role label (several roles for one person go in one label, "Artist, Letterer", and each
  shows as its own line) and their site if the byline
  has one; they show in the piece's margin. Leave it empty for a piece that's all Alex's. Only **published** pieces appear on the site; drafts and
  unpublished ones never do. A piece lands at `/writing/<slug>/`, dated when it was
  first published; scheduling works too. Until the first piece is published, the Writing nav link
  and the home-page writing section stay hidden and `/writing/` shows the empty state.
- **Projects**: one entry per card, in `order`. Unpublish one to hide its card. The **Kicker**
  is the card's built-with line and its Source link, separated by a bar:
  `TypeScript · Bun | https://github.com/RANDSUM/randsum` (either half can be left out). Screenshots
  are files: the Screenshots workflow captures `public/assets/work/<slug>.webp` for every
  published project each night, and the card shows it once **Screenshot name** is set.
- **Sections**: `about` (the bio; its first paragraph is the one plain sentence about who
  this is, and its **Dek** is the note beside the contact line, "Résumé on request."), `projects` and `writing` (home-page headings; a nav label
  puts them in the header), `writing-archive` (the `/writing/` page and its empty state), `threads-archive` (the `/writing/threads/` heading and blurb) and
  `not-found` (the 404 page).
- **Randomizers**: the die's lists, one item per line, the first line being what shows before
  any roll: `tagline-subjects`, `tagline-objects` (its lead-in
  is the "I make"), and `likes-1` to `likes-3` (the first one's lead-in is "I like").
- **Settings**: the site title, and the tagline field, which is the meta description.
- **Preview**: the editor's Preview button opens the piece as it will look, drafts included, at
  `admin.alxjrvs.com/writing/<slug>?_preview=…`. It works only there, behind the sign-in; the
  public site ignores the token.

## Design notes

- **Type**: Familjen Grotesk (700 for display, tight tracking), IBM Plex Mono for labels and dates.
- **Colour**: see [DESIGN.md](DESIGN.md) for the palette, roles and the rest of the design language.
- **Header**: hidden on the first screen; it slides in as you scroll while the wordmark shrinks
  into its brand slot. Without JS it's simply always there.
- **Theme**: dark only (`color-scheme: dark`). No light mode, no toggle.
