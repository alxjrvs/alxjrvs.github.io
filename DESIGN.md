# alxjrvs design language

This is the source of truth for how the site looks, moves and reads. The CSS
(`public/assets/css/site.css`) implements it. When the two disagree, fix one of them.

**In one line:** professional, with something a little wrong. The page is
mostly calm navy and canary yellow, like a legal pad. One bruise-purple pop is
saved for the die: the thing you roll.

---

## 1. Principles

1. **Projects first.** Everything else frames the four projects.
2. **One loud thing at a time.** `brand` carries the identity. `brand-2` is the
   pop, and it appears in exactly one place: the die. Never use it for text.
3. **Roles, not colours.** Components use role tokens (`--tag-subject`,
   `--die`…), never raw palette tokens or hex. Changing the palette means
   editing the palette block and nothing else.
4. **Follow the visitor.** Light or dark comes from their system, live. The
   toggle is only an override.
5. **Playful motion, never in the way.** Things roll and settle, and scrolling
   springs gently. Any input cancels motion at once. Reduced motion turns all of
   it into instant changes.

---

## 2. Colour

### 2.1 Palette: "Legal Pad"

The palette is the only layer that changes between themes, or when the site
is re-skinned.

| Token          | Dark      | Light     | What it is                                   |
| -------------- | --------- | --------- | -------------------------------------------- |
| `surface`      | `#14161f` | `#fbf3c4` | page background (navy ink / canary pad)      |
| `surface-bar`  | `#161822` at 74% | `#fdf8d6` at 80% | the floating header's glass   |
| `line`         | `#262a38` | `#ece1a3` | dividers, borders, code backgrounds          |
| `line-strong`  | `#353948` | `#d9cd8a` | screenshot frames                            |
| `pattern`      | `#1c1f2c` | `#f5ebb5` | the dice grid behind the splash              |
| `fg`           | `#f3f0dc` | `#14193a` | loudest text                                 |
| `fg-body`      | `#e6e3ce` | `#212647` | running text                                 |
| `fg-muted`     | `#c7c4ad` | `#3f4466` | secondary text                               |
| `fg-subtle`    | `#aea57a` | `#75693a` | quietest text ("khaki pad", from the paper)  |
| `brand`        | `#ffe45c` | `#1f3cb8` | signature colour (canary / ballpoint blue)   |
| `brand-2`      | `#a986d6` | `#6b3fa0` | the pop (bruise purple)                      |

Projects bring their own `accent` (light) and `accent_dark` from
their entry in the CMS (EmDash → Projects). They're used only inside that project's card or post.

### 2.2 Text hierarchy

| Level       | Use for                                                        |
| ----------- | -------------------------------------------------------------- |
| `fg`        | headings, links, "alx", the tagline's object ("stuff")          |
| `fg-body`   | paragraphs: bio, posts                                          |
| `fg-muted`  | nav links, card summaries, deks, empty states, header buttons   |
| `fg-subtle` | mono labels, dates, footer, "I make", hover borders            |

### 2.3 Roles

| Role           | Points to   | Where                                         |
| -------------- | ----------- | --------------------------------------------- |
| `mark-first`   | `fg`        | "alx" in every wordmark (splash, header, footer) |
| `mark-last`    | `brand`     | "jrvs" in every wordmark                      |
| `mark-ghost`   | `fg-subtle` | the letters that spell out "alex jarvis" on hover |
| `tag-subject`  | `brand`     | the tagline's subject ("Enthusiast")          |
| `tag-verb`     | `fg-subtle` | "I make"                                     |
| `tag-object`   | `fg`        | the tagline's object ("stuff")                |
| `die`          | `brand-2`   | both dice (splash corner, header)             |
| `focus`        | `brand`     | keyboard focus rings                          |
| `nav-active`   | `brand`     | underline under the current section's header link |
| `accent`       | project     | "Visit" underline, post links                 |

### 2.4 Contrast (WCAG, against `surface`)

| Token       | Dark   | Light  |
| ----------- | ------ | ------ |
| `fg`        | 15.7:1 | 15.2:1 |
| `fg-body`   | 14.0:1 | 13.1:1 |
| `fg-muted`  | 10.2:1 | 8.4:1  |
| `fg-subtle` | 7.3:1  | 4.9:1  |
| `brand`     | 14.2:1 | 7.8:1  |
| `brand-2`   | 6.1:1  | 6.6:1  |

Every text token clears AA (4.5:1). Keep it that way when re-skinning.

---

## 3. Typography

- **Familjen Grotesk** (400–700) for everything. Display sizes use weight
  700 with tight negative tracking.
- **IBM Plex Mono** (400/500) for labels, dates and code. Labels are
  uppercase with `.08em` tracking.
- Both are self-hosted from `public/assets/fonts/` (latin subset), and the grotesk is
  preloaded, so the splash never waits on a third-party stylesheet.

| Style           | Size                                    | Weight | Tracking |
| --------------- | --------------------------------------- | ------ | -------- |
| Wordmark        | `clamp(64px, min(23vw, 36vh), 300px)`   | 700    | very tight |
| Tagline         | `clamp(30px, 4.7vw, 60px)`              | 500    | `-.02em` |
| Section heading | `clamp(2.5rem, 6vw, 3.5rem)` (phones 2.25rem) | 700 | `-.04em` |
| Card title      | `clamp(2rem, 3.4vw, 3rem)` (phones `clamp(1.75rem, 3.6vw, 2.25rem)`) | 700 | tight |
| Body            | `1.125rem / 1.55`                       | 400    | 0        |
| Bio / prose     | `1.1875rem / 1.6` (phones 1rem / 1.45)  | 400    | 0        |
| Header wordmark | 28px (phones 24px)                      | 700    | tight    |
| Header tagline  | 15px                                    | 500    | `-.02em` |
| Label (mono)    | `.75rem / 1.4`, uppercase               | 500    | `.08em`  |

**Copy rules**

- The tagline is always "*Subject*. I make *object*." with real full stops.
  Each full stop belongs to the word before it: same colour, and it rolls with it.
  In the splash it breaks after the subject, so "I make *object*." sits on
  its own line beneath it; the header's copy stays on one line.
  About 1 roll in 50 lands the subject on the rare "Undiagnosed, but, come on."
  (EmDash → Randomizers → `tagline-subjects`), which brings its own full stop.
- Wordmark: lowercase `alxjrvs`, split as alx/jrvs, and never restyled. The
  splash wordmark spells out "alex jarvis" on hover, with the extra letters in grey.
- Vellum is a "TTRPG" tool. Never name a specific game system for it.
- In "I like …", items read mid-sentence. They're lowercase unless they're a
  proper noun, and they're listed as "a, b, and c".

---

## 4. Layout and space

- **Gutter:** `clamp(16px, 5vw, 64px)`. The header is 60px tall and floats
  12px from the top (8px on phones).
- **Sections:** every home-page section is one screen tall (`100svh`). Its
  padding clears the header (`bar-h + 40px`, or `+ 20px` on phones).
- **Projects:** a sideways carousel at every width, one project at a time.
  Each swipe, trackpad flick or arrow press moves exactly one project and
  snaps to it, and it loops (past the last comes the first). It moves on by
  itself after 4 seconds of stillness, but only while it's at least half on
  screen and the tab is visible; hovering, touching or focusing it pauses
  that, any swipe restarts the count, and reduced motion turns it off. Wider than 760px a slide is the screenshot on the left (3fr) and
  the title, summary and link on the right (2fr). On phones the card stacks at
  84% width with the next one peeking in. One subtle round arrow (`line`
  border, `fg-subtle` chevron, 70% opacity) sits in the right-hand margin,
  level with the screenshots; there's no back arrow, since it loops and you
  can swipe back.
- **Reading width:** `40rem` for prose, `45rem` for the bio.

---

## 5. Shape and elevation

- **Radii:** header 16px, header buttons 10px, screenshots 8px, inline code
  4px, focus ring 2px, die 3/16 of its size, round FAB.
- **Borders:** 1px `line` everywhere. Screenshots use `line-strong`.
- **Shadow:** a single soft drop under screenshots (`--shadow`). Nothing else
  is elevated, except the header's blurred glass (`surface-bar`).

---

## 6. Motion

| Motion            | Behaviour                                                     |
| ----------------- | ------------------------------------------------------------- |
| Splash recede     | The wordmark, tagline and die shrink and travel into the header over the first 60% of the splash, with smoothstep easing. The tagline's two lines split and travel separately, landing side by side exactly on the header's one-line copy, so the hand-over is invisible (no cross-fade). Where the header has no tagline (narrow screens) the lines fade out instead. The die stays pinned on screen while it travels. |
| Section snap      | Desktop: scrolling is free. Once it has slowed right down, a soft, critically damped spring (stiffness 42, damping 1, so no bounce) picks up from the scroll's own speed and eases to the next section if you moved past 10% of a screen, otherwise back. Touch: the browser's proximity snapping, so a swipe can pass sections and only eases on when it ends near one. About is not a snap point (the page bottom is its resting place), which keeps the phone browser bar from bouncing the page near the footer. The splash recede updates in the same frame as the scroll, so it never lags a frame behind. |
| Die roll          | Every die effect is a reel that slows to a stop. The tagline's subject and object, each "I like" slot, and the project order all land one after another. A reel never shows the same word twice in one roll: it runs through a shuffle of the other options (fewer, longer ticks for short lists) before landing. The die doesn't spin: its pips flick through random die faces (the die itself stays still), slow down, and land last, back on the favicon's "j". |
| Grid pulse        | A roll sends a pulse out from the tagline across the splash's dice grid (about 0.8s to the farthest die, whatever the screen). As it passes each die, the die rerolls to a different face; nothing moves or changes size. The dice stay in `pattern`. Only the splash grid; off screen the faces just change. |
| Card shuffle      | About 7 shuffles, each slower than the last. Each move is a FLIP slide with `cubic-bezier(.2,.8,.2,1)`. The last one takes 700ms. |
| Theme change      | 0.25s background/colour fade.                                 |
| Back-to-top FAB   | Fades in while scrolling past the first screen. It hides 1.4s after scrolling stops. |

`prefers-reduced-motion` turns off smooth scrolling, the spring, the roll
animations, the pip flicker and the grid pulse (the grid's faces all change at once). The content still changes, but instantly.

---

## 7. Components

- **Wordmark:** "alx" uses `mark-first`, "jrvs" uses `mark-last`, everywhere
  it appears. Hovering the splash wordmark spells out the full name, "alex
  jarvis". The extra letters (e, the space, a, i) open up in `mark-ghost`:
  first the width (0.35s), then the fade. They close again when you move away,
  and there's no reveal once the splash has started receding.
- **Tagline:** "subject." (`tag-subject`), verb (`tag-verb`), "object."
  (`tag-object`), with each full stop part of its rolling word. A copy of it lives in the
  header (hidden on narrow screens).
- **Die:** a rounded square in the `die` colour, with a 3×3 grid of pips cut
  out of `surface`. At rest, the lit pips spell the favicon's "j". There's one
  in the splash corner and one as the header's rightmost button. Either one
  re-rolls the page, and its pips roll too. On hover it grows slightly
  (12%, 0.2s).
- **Dice grid:** the splash background is rows of faint die faces in
  `pattern`, with random faces and the pips cut out. Each cell is the size of the
  splash die (`--die-s`), with half a die between cells. The grid is lined up
  so the splash die sits exactly on one cell, so on load it reads as one of
  the dice, lit up in `die`. It's at full strength down to about the
  middle of the splash, still clearly there at three quarters, and fades out
  just before the bottom. It's a CSS mask on `.intro::before`,
  so its colour follows the theme. With JS, the script swaps in the same grid
  as real dice (an SVG, `fill: pattern`, same fade) so a roll can pulse
  through it; the CSS copy is the fallback.
- **Scroll cue:** a thin chevron in `fg-subtle` (and `fg` on hover), centred at
  the foot of the splash, that hints there's more below. It bobs gently (2.4s,
  still under reduced motion), links to Projects, and fades out (0.35s) as
  soon as the page scrolls, coming back only at the very top.
- **Header nav:** links are `fg-muted`, and `fg` on hover. The link for the
  section you're scrolled into is marked `aria-current`. It turns `fg` and a
  2px `nav-active` underline draws in from the left (0.3s). The current section
  is the last one whose top has passed 40% of the screen. On the splash, no
  link is current.
- **Header:** floating glass bar with the wordmark, the tagline copy, nav, the
  theme toggle and the die. On the home page it's hidden until the splash
  recedes into it.
- **Project card:** screenshot (16:10, or 4:3 on phones; a WebP at 1280 and
  640 wide, picked with `srcset`, lazy-loaded), title, summary in
  `fg-muted`, and a "Visit … ↗" link with an accent underline. No category
  label above the title.
- **Back-to-top FAB:** round, 1px `line` border, `fg-muted` arrow.
- **Favicon:** the die at rest, matching the on-page button: a `die`
  (`brand-2`) face with the four pips of the curved "j" in `surface`. It
  follows the browser's light or dark setting, like the page. The stylesheet
  and favicon links carry a `?v=` build stamp so a deploy is never hidden
  behind a cached copy.
- **Social card:** `public/assets/social.png` (1200×630), used for every page's
  Open Graph and Twitter preview. It's the dark splash in miniature: the dice
  grid fading down, the purple die on its "j", the wordmark, the default
  tagline and `alxjrvs.com` as a mono label. Edit `scripts/social-card.html`
  and re-render with `node scripts/social-card.mjs`.

---

## 8. Changing the palette

1. Edit only the two palette blocks at the top of `site.css`: `:root` for
   dark, `[data-theme="light"]` for light.
2. Keep every text token at 4.5:1 or better against `surface`.
3. `brand-2` must stay distinct from `brand`, because it is the pop.
4. Update the favicon's colours in `public/assets/favicon.svg`, the social card's in
   `scripts/social-card.html` (then re-render it), and the tables above.
