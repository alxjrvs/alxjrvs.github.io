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
| `_config.yml`       | Site config — title, nav                          |
| `index.html`        | Landing: hero, flagship projects, latest writing (once there is any) |
| `_data/work.yml`    | The projects — groups + one entry per site        |
| `projects/`         | Index at `/projects/` + a page per site (old `/work/` URLs redirect) |
| `about.md`          | About page at `/about/`                            |
| `writing/`          | Post archive at `/writing/`, grouped by year       |
| `_posts/`           | Blog posts (`YYYY-MM-DD-title.md`) — none yet     |
| `_includes/`        | `workcard.html` — the project card used on `/` and `/projects/` |
| `_layouts/`         | `default.html` (shell + theme toggle), `post.html`, `site.html` (project page) |
| `assets/css/signal.css` | The whole design system                       |
| `assets/favicon.svg`| The red-square mark                               |

## Adding a project

1. Add an entry under `sites:` in `_data/work.yml` (`name`, `blurb`, `url`, optional `code` and `shot`).
2. Add its slug to a group's `sites:` list (set it as the group's `flagship` to feature it on the landing page).
3. Create `projects/<slug>/index.html` — copy any sibling; it's just front matter.
4. Drop a 1280×800 screenshot in `assets/work/` if you have one.

## Writing a post

Create `_posts/` if it doesn't exist and add a file named `YYYY-MM-DD-slug.md`:

```markdown
---
layout: post
title: "Your title"
description: "Optional one-liner, shown on the archive."
date: 2026-07-16 09:00:00 -0400
---

Body in Markdown.
```

It lands at `/writing/slug/`. Writing is zero-post aware: until the first post exists,
the `writing` nav link, the landing-page writing section, and the footer feed link stay
hidden, and `/writing/` shows a short empty state. Publish one post and they all appear.

## Design notes

- **Type** — `Futura` (display) · `Iowan Old Style → Charter → Georgia` (body) · `Menlo` (meta/code). All system fonts.
- **Color** — paper `#ece8dd`, ink `#16150f`, signal red `#dd2f1c`; inverted for dark.
- **Red is rationed** — the mark, the rule, bullets, link accents, the end mark. Keep it that way and it keeps meaning "look here".
- **Theme** — the toggle remembers your choice (`localStorage`) and otherwise follows the OS. Theme is set before first paint, so no flash.
