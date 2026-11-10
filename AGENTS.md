# AGENTS.md

Instructions for coding agents working on alxjrvs.com. Claude Code reads this
through `CLAUDE.md`. Edit this file, never the shim.

## What this is

Alex Jarvis's personal site: Astro on one Cloudflare Worker, with the EmDash
CMS inside it. It is first for people who might hire or work with Alex. It
shows exactly four projects and a small Writing section (pieces, threads,
comics). `README.md` explains the structure and how to edit text; `DESIGN.md`
is the law for how it looks, moves and reads. Read the section of `DESIGN.md`
you are about to touch, and change it in the same PR when the site changes.

## Commands

```sh
bun install
bun run check        # format, lint, typecheck, tests: run before every push
bun run check:full   # the above, then build and the link check (what CI needs)
bun run dev          # http://localhost:4321
```

Bun only, never npm or yarn. Biome is the only formatter.

## Rules

- **Words are not in the repo.** Every word a visitor reads lives in EmDash's
  database. Changing copy is an edit in the admin, not a PR. `seed/seed.json`
  only fills a fresh local database.
- **Never write to the production database, DNS or zone settings without the
  owner saying so in the conversation.** That includes schema changes.
  Previews share the production database.
- **A home section must fit one screen** (`100svh`), or section snapping lets
  go of it (`src/client/snap.ts`, DESIGN.md §4). Check 320×568, 375×667,
  390×844 and 1280×720 before adding anything to the home page.
- **The public cache keys on the path alone**, not the host or the query
  string's meaning. Only the `Site` entrypoint in `src/worker.ts` is cached;
  the default entry always runs. Do not put a cache in front of the default
  entry, and set per-request headers out there, after `Site` has answered.
- **Everything under `/_` is refused on the public hosts** except the
  allow-list in `src/gateway.ts`. Add a route there with a test in
  `src/gateway.test.ts`.
- **Page scripts are inline** (`src/client/*.ts` through `InlineScript.astro`).
  There are no script files of the site's own, and the CSP assumes that.
- **Never merge an EmDash or Astro upgrade unread.** A new EmDash can carry
  database migrations, and production runs them on its first request.
- **Every commit on `main` deploys production.** Squash-merge once CI is
  green.

## Checking a visual change

`*.workers.dev` previews cannot be reached from cloud sessions. Build and run
the Worker locally (`bun run preview`), or load the live page in Playwright
and patch the new HTML or CSS in, then take screenshots at phone and desktop
widths and look at them. The Browser check workflow uploads screenshots of
each PR's preview as an artifact.

## Decided already: do not propose these again

The owner or a review has said no to each of these.

- An on-site dice roller (randsum.dev has one), playable cards, a guestbook,
  sound.
- Light mode or a theme toggle. A rare die glyph. Per-roll share images.
- Project detail pages, or any project beyond the four.
- Abrupt or hijacked scroll snapping. A global `scroll-padding-top`.
- A strict `style-src` CSP (cards set `--accent` inline).
- Publishing social profiles. Contact is one email address, written so bots
  cannot harvest it.
- Removing the carousel's auto-advance, auto-playing the "alex jarvis"
  reveal, a carousel index of project names, remembering a reader's place,
  a URL per comic page, a click-event pipeline, a print stylesheet, an email
  newsletter.

## Before more polish

In its first ten days the site took about 95 pull requests, most of them
adjusting layout and motion, and about 20 visits from outside. New visual or
motion work waits until there is a reason a visitor would notice: a new piece
of writing to carry, or a problem measured on the live site. Fixing something
broken is always fine.
