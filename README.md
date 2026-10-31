# alxjrvs.github.io

Personal site: a static [Jekyll](https://jekyllrb.com) site served by GitHub Pages.
Projects first, plus the occasional piece of writing.

Design: **Index**. The site is set like a reference book. A left rail works as the table of
contents, the content is one column with hairline rules instead of boxes, and colour is spent
on one thing only: each project's own accent. System fonts, no framework, light and dark.

## Local preview

```sh
bundle install
bundle exec jekyll serve --livereload
# → http://localhost:4000
```

## Structure

| Path                 | What it is |
|----------------------|------------|
| `_config.yml`        | Site config, nav, the `projects` collection |
| `index.html`         | Home: rollable tagline, the project catalogue, latest writing (once there is any) |
| `_projects/`         | One Markdown file per project, which becomes `/projects/<name>/` |
| `projects/index.html`| The projects index at `/projects/` |
| `writing/`           | The post archive at `/writing/`, grouped by year |
| `_posts/`            | Blog posts (`YYYY-MM-DD-slug.md`), none yet |
| `about.md`           | About page |
| `_layouts/`          | `default.html` (rail + theme toggle), `project.html`, `post.html` |
| `_includes/`         | `facts.html`, `project-links.html`, `post-list.html` |
| `_data/tagline.yml`  | Word lists for the rollable home-page tagline |
| `assets/css/site.css`| The whole design system |
| `assets/work/`       | Project screenshots (1280×800) |

Old `/work/...` URLs redirect to their project (or to `/projects/`) via `jekyll-redirect-from`.

## Adding a project

Add `_projects/<name>.md`:

```markdown
---
order: 5                      # position in the list
title: Name
pitch: The one-line hook.
summary: Two sentences for the home page and the top of its page.
link: https://example.com     # the live site
link_label: example.com
code: https://github.com/...  # optional
shot: example.png             # optional, in assets/work/
accent: "#1f5fbf"             # accent on the light theme
accent_dark: "#7fb0ff"        # accent on the dark theme
facts:
  - [For, "Who it's for"]
  - [Built with, "TypeScript · Bun"]
---

The long write-up, in Markdown. It's shown on the project's page.
```

Quote fact values: a comma inside an unquoted value splits it.

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
Writing nav link, the home-page writing section and the feed link stay hidden, and `/writing/`
shows a short empty state. Publish one post and they all appear. A post with `project:` also
shows up under "Writing about …" on that project's page.

## Design notes

- **Type**: system sans for everything structural (800 weight, tight tracking at display
  sizes), `Iowan Old Style → Charter → Georgia` for long-form prose, system mono for labels.
- **Colour**: paper `#f5f4f0` / ink `#141413`, inverted to `#111110` / `#ecebe6` for dark.
  The only colour is a project's accent, used on its number, pitch and link underlines.
- **Theme**: the toggle remembers your choice (`localStorage`) and otherwise follows the OS.
  The theme is set before first paint, so there's no flash.
