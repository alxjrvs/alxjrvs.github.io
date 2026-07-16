# alxjrvs.github.io

Personal site — a static [Jekyll](https://jekyllrb.com) site served by GitHub Pages.
Design: **Signal** — Futura display, a smooth serif body, one rationed signal-red, light + dark.
No framework, no build pipeline, no webfonts. Native over special.

## Local preview

```sh
bundle install
bundle exec jekyll serve --livereload
# → http://localhost:4000
```

## Structure

| Path                | What it is                                        |
|---------------------|---------------------------------------------------|
| `_config.yml`       | Site config — title, nav, the `projects` list     |
| `index.html`        | Landing (hero + latest writing + things i made)   |
| `writing/`          | Post archive at `/writing/`                        |
| `work/`             | Projects at `/work/`                               |
| `colophon.md`       | How the site is made                              |
| `_posts/`           | Blog posts (`YYYY-MM-DD-title.md`)                 |
| `_layouts/`         | `default.html` (shell + theme toggle), `post.html`|
| `assets/css/signal.css` | The whole design system                       |
| `assets/favicon.svg`| The red-square mark                               |

## Writing a post

Add a file to `_posts/` named `YYYY-MM-DD-slug.md`:

```markdown
---
layout: post
title: "Your title"
date: 2026-07-16 09:00:00 -0400
---

Body in Markdown.
```

It lands at `/writing/slug/` and shows up on the archive and the landing automatically.

## Design notes

- **Type** — `Futura` (display) · `Iowan Old Style → Charter → Georgia` (body) · `Menlo` (meta/code). All system fonts.
- **Color** — paper `#ece8dd`, ink `#16150f`, signal red `#dd2f1c`; inverted for dark.
- **Red is rationed** — the mark, the rule, bullets, link accents, the end mark. Keep it that way and it keeps meaning "look here".
- **Theme** — the toggle remembers your choice (`localStorage`) and otherwise follows the OS. Theme is set before first paint, so no flash.

The three posts shipped here are starter drafts — replace them with your own.
