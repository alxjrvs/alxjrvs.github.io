// A piece's title docking into the header, the reading pages' version of the
// splash receding at home (client/recede.ts). As the title nears the header,
// each of its words shrinks and travels to its twin in the header's copy, so
// the big wrapped title splits apart and lands in the header, with Back and
// Next either side of it. The nav links bow out to make room. Scrolling back
// up reverses all of it. Words the header has no room for slide to its edge
// and fade into the ellipsis. With reduced motion the title simply appears in
// the header once the big one has scrolled under it.
//
// On phones (760px and under) the docked title takes the whole header, on up
// to two lines: the wordmark, the nav and the die bow out instead, and the
// controls wait in the floating menu (client/fab.ts).
//
// Each word runs on its own clock: it sets off a fixed distance before the
// scroll would carry it up to its spot in the header on its own, and lands
// exactly when it would have got there. So a word only ever rises and never
// overshoots its spot and drops back into it, and it arrives with no speed
// left, so the hand-over to the header's copy can't be seen. Later lines set
// off later, so they slot in one after another instead of crossing over.
(() => {
  const bar = document.getElementById("bar");
  const h1 = document.querySelector<HTMLElement>(".post-head h1");
  const copy = bar?.querySelector<HTMLElement>(".bar-title");
  if (!bar || !h1 || !copy) return;
  const body = document.body;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const words = Array.from(h1.querySelectorAll<HTMLElement>(".w"));
  const twins = Array.from(copy.querySelectorAll<HTMLElement>(".w"));
  type Word = {
    el: HTMLElement;
    // where it sits in the page, untouched
    x: number;
    y: number;
    to: { x: number; y: number; s: number };
    fade: boolean;
    // the scroll it sets off at, how far it takes to land, and how far to
    // shrink and slide into place (its line's, shared)
    start: number;
    span: number;
    slide: number;
  };
  let list: Word[] = [];
  let first = 0;
  let last = 1;

  const size = (el: Element) => Number.parseFloat(getComputedStyle(el).fontSize);
  const ease = (t: number) => {
    const c = Math.min(Math.max(t, 0), 1);
    return c * c * (3 - 2 * c); // smoothstep, as at home
  };

  function measure() {
    if (!bar || !h1 || !copy) return;
    for (const w of words) {
      w.style.transform = "";
      w.style.opacity = "";
    }
    // .reading lifts the big title over the header's glass for the trip
    body.classList.add("reading");
    // the header's copy only has a place once docked, so measure it docked
    body.classList.add("titled");
    const clip = copy.getBoundingClientRect();
    const s = size(copy) / size(h1);
    const lineH = Number.parseFloat(getComputedStyle(copy).lineHeight) || size(copy) * 1.2;
    const r = h1.getBoundingClientRect();
    const line = bar.getBoundingClientRect().bottom;
    // the first word sets off as the title comes within ~a header's height of
    // the header; every word travels the same distance
    const top = r.top + scrollY - line;
    const lead = top + line - (clip.top + clip.height / 2) - Math.max(0, top - 80);
    const travel = Math.max(lead, 80) * 1.2;
    const placed = words.map((el, i) => {
      const a = el.getBoundingClientRect();
      const b = twins[i]?.getBoundingClientRect() ?? clip;
      // words past the header's edge (or under its last line) slide on to its
      // end and fade into the ellipsis
      const fade = b.right > clip.right + 1 || b.top > clip.bottom - 1;
      // the boxes have different line heights, so line up their middles
      const mid = fade
        ? Math.min(b.top + b.height / 2, clip.bottom - lineH / 2)
        : b.top + b.height / 2;
      const to = {
        x: fade ? Math.min(b.left, clip.right) : b.left,
        y: mid - (a.height * s) / 2,
        s,
      };
      const y = a.top + scrollY;
      // the scroll at which the page alone would carry it to its spot
      return { el, x: a.left, y, to, fade, end: y - to.y, top: Math.round(a.top) };
    });
    // a line's words set off together and shrink and slide together; each
    // still rises on its own clock, since they land on different lines
    list = placed.map((w) => {
      const line = placed.filter((o) => Math.abs(o.top - w.top) < 4);
      const soonest = Math.min(...line.map((o) => o.end));
      const start = Math.max(0, soonest - travel);
      return {
        ...w,
        start,
        span: Math.max(w.end - start, 1),
        slide: Math.max(soonest - start, 1),
      };
    });
    first = Math.min(...list.map((w) => w.start));
    last = Math.max(...list.map((w) => w.start + w.span));
    update();
  }

  function update() {
    if (!bar) return;
    const p = Math.min(Math.max((scrollY - first) / Math.max(last - first, 1), 0), 1);
    const docked = scrollY >= last;
    if (still.matches) {
      for (const w of list) w.el.style.transform = "";
      bar.style.setProperty("--t", docked ? "1" : "0");
      body.classList.toggle("titled", docked);
      return;
    }
    for (const w of list) {
      // sideways (and shrinking) runs a little ahead of rising, so a word is
      // already in its spot in the line by the time it reaches the line
      const ex = ease(((scrollY - w.start) / w.slide) * 1.5);
      const ey = ease((scrollY - w.start) / w.span);
      const nowY = w.y - scrollY; // where it sits in the flow right now
      const dx = (w.to.x - w.x) * ex;
      const dy = (w.to.y - nowY) * ey;
      const s = 1 + (w.to.s - 1) * ex;
      w.el.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
      w.el.style.opacity = w.fade ? String(1 - ex) : "";
    }
    bar.style.setProperty("--t", String(ease(p)));
    body.classList.toggle("titled", docked);
  }

  // Tapping the docked title takes you back to the top, like a phone's status bar.
  copy.addEventListener("click", () => {
    scrollTo({ top: 0, behavior: still.matches ? "auto" : "smooth" });
  });

  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", measure);
  still.addEventListener("change", measure);
  measure();
  if (document.fonts?.ready) document.fonts.ready.then(measure);
})();
