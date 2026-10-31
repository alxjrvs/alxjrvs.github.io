# alxjrvs.github.io

Personal site: a static [Jekyll](https://jekyllrb.com) site served by GitHub Pages at
[alxjrvs.com](https://alxjrvs.com). It deploys on every push to `main` (Pages builds from the
branch); the custom domain lives in `CNAME` and `url` in `_config.yml`.
Projects first, plus the occasional piece of writing.

Design: **E · Oversized**. One scrolling page, each section at least a screen tall: a huge
two-tone `alxjrvs` wordmark with the rollable tagline, then project cards, latest writing (once
there is any) and About. As you scroll, a floating header slides in and the wordmark shrinks
into it. Warm dark by default with a light theme, Familjen Grotesk + IBM Plex Mono.

## Local preview

```sh
bundle install
bundle exec jekyll serve --livereload
# → http://localhost:4000
```

## Structure

| Path                  | What it is |
|-----------------------|------------|
| `CNAME`               | The custom domain (`alxjrvs.com`) GitHub Pages serves the site on |
| `_config.yml`         | Site config, nav (anchors into the home page), the `projects` collection |
| `index.html`          | The whole home page, plus the tagline roller and the wordmark-into-header script |
| `_projects/`          | One front-matter-only file per project; each becomes a card (no project pages) |
| `_includes/about.md`  | The bio, shown in the About section |
| `_includes/post-list.html` | A list of posts |
| `writing/`            | The post archive at `/writing/`, grouped by year |
| `_posts/`             | Blog posts (`YYYY-MM-DD-slug.md`), none yet |
| `_layouts/`           | `default.html` (floating header, theme toggle, back-to-top), `post.html` |
| `redirects/`          | `/about/`, `/projects/` and old `/work/...` URLs, sent to the matching section |
| `_data/tagline.yml`   | Word lists for the rollable tagline |
| `_data/likes.yml`     | The things in About's "I like …" sentence; three slots, each roll picks one from each |
| `assets/css/site.css` | The whole design |
| `assets/work/`        | Project screenshots (1280×800), refreshed by the Screenshots workflow |

## Adding a project

Add `_projects/<name>.md`:

```markdown
---
order: 5                      # position on the page
title: Name
summary: Two sentences for the card.
link: https://example.com     # the live site
link_label: example.com
shot: example.png             # in assets/work/, captured by the Screenshots workflow
accent: "#1f5fbf"             # accent on the light theme
accent_dark: "#7fb0ff"        # accent on the dark theme
---
```

## Writing a post

Create `_posts/` if it doesn't exist and add `YYYY-MM-DD-slug.md`:

```markdown
---
title: "Your title"
description: "Optional one-liner, shown on the archive and under the title."
project: optfall              # optional, links the post and its project both ways
date: 2026-07-16 09:00:00 -0400
---

Body in Markdown.
```

It lands at `/writing/slug/`. Writing works with zero posts: until the first one exists, the
Writing nav link and the home-page writing section stay hidden, and `/writing/` shows a short
empty state. Publish one post and they appear. A post with `project:` links to that project.

## Design notes

- **Type**: Familjen Grotesk (700 for display, tight tracking), IBM Plex Mono for labels and dates.
- **Colour**: see [DESIGN.md](DESIGN.md) for the palette, roles and the rest of the design language.
- **Header**: hidden on the first screen; it slides in as you scroll while the wordmark shrinks
  into its brand slot. Without JS it's simply always there.
- **Theme**: follows the OS light/dark setting, live, set before first paint so there's no
  flash. The toggle overrides it only while it disagrees with the OS.
