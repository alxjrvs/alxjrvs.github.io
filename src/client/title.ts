// A piece's title docking into the header, the reading pages' version of the
// splash receding at home (client/recede.ts). As the title nears the header,
// each of its words shrinks and travels to its twin in the header's one-line
// copy, so the big wrapped title splits apart and lands as one line between
// the tagline and the die, with Back and Next either side of it. The nav
// links bow out to make room. Scrolling back up reverses all of it. Words the
// header has no room for slide to its edge and fade into the ellipsis. With
// reduced motion the title simply appears in the header once the big one has
// scrolled under it.
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
    y: number;
    x: number;
    to: { x: number; y: number; s: number };
    fade: boolean;
    // its line's head start: later lines set off a little later
    at: number;
  };
  let list: Word[] = [];
  let start = 0;
  let span = 1;
  let lead = 1;

  const size = (el: Element) => Number.parseFloat(getComputedStyle(el).fontSize);

  function measure() {
    if (!bar || !h1 || !copy) return;
    for (const w of words) {
      w.style.transform = "";
      w.style.opacity = "";
    }
    // the header's copy only has a place once docked, so measure it docked
    body.classList.add("titled");
    const clip = copy.getBoundingClientRect();
    const s = size(copy) / size(h1);
    const tops: number[] = [];
    list = words.map((el, i) => {
      const a = el.getBoundingClientRect();
      const b = twins[i]?.getBoundingClientRect() ?? clip;
      // words past the header's edge keep their place in the line, slide on
      // under the ellipsis and fade
      const fade = b.right > clip.right + 1;
      // the boxes have different line heights, so line up their middles
      const mid = b.top + b.height / 2;
      if (!tops.some((t) => Math.abs(t - a.top) < 4)) tops.push(a.top);
      const line = tops.findIndex((t) => Math.abs(t - a.top) < 4);
      return {
        el,
        x: a.left,
        y: a.top + scrollY,
        to: { x: b.left, y: mid - (a.height * s) / 2, s },
        fade,
        at: line,
      };
    });
    // the lines set off one after another, so they slot in side by side
    // instead of crossing over each other on the way
    const lag = Math.min(0.12, 0.36 / Math.max(tops.length - 1, 1));
    for (const w of list) w.at *= lag;
    lead = 1 - lag * (tops.length - 1);
    const r = h1.getBoundingClientRect();
    const line = bar.getBoundingClientRect().bottom;
    // starts as the title comes within ~a header's height of the header and
    // lands as its last line would have slid under it
    const top = r.top + scrollY - line;
    start = Math.max(0, top - 80);
    span = Math.max(top + r.height - start, 80);
    update();
  }

  function update() {
    if (!bar) return;
    const p = Math.min(Math.max((scrollY - start) / span, 0), 1);
    if (still.matches) {
      for (const w of list) w.el.style.transform = "";
      bar.style.setProperty("--t", p >= 1 ? "1" : "0");
      body.classList.toggle("titled", p >= 1);
      return;
    }
    const ease = (t: number) => {
      const c = Math.min(Math.max(t, 0), 1);
      return c * c * (3 - 2 * c); // smoothstep, as at home
    };
    const e = ease(p);
    for (const w of list) {
      const q = (p - w.at) / lead;
      // sideways (and shrinking) runs a little ahead of rising, so a word is
      // already in its spot in the line by the time it reaches the line
      const ex = ease(q * 1.5);
      const ey = ease(q);
      const nowY = w.y - scrollY; // where it sits in the flow right now
      const dx = (w.to.x - w.x) * ex;
      const dy = (w.to.y - nowY) * ey;
      const s = 1 + (w.to.s - 1) * ex;
      w.el.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
      w.el.style.opacity = w.fade ? String(1 - ex) : "";
    }
    bar.style.setProperty("--t", String(e));
    body.classList.toggle("titled", p >= 1);
  }

  body.classList.add("reading");
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", measure);
  still.addEventListener("change", measure);
  measure();
  if (document.fonts?.ready) document.fonts.ready.then(measure);
})();
