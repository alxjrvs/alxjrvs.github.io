// The splash receding into the header. Over the first part of the scroll the
// header slides in while the big wordmark, the tagline and the die each
// shrink and travel into their own spot in it, then hand over to the
// header's copies. The tagline's two lines move separately: the subject and
// "I make …" split apart and land side by side, exactly on the header's
// one-line copy, so the hand-over can't be seen. Where the header has no
// room for the tagline (narrow screens) it fades out instead.
(() => {
  const bar = document.getElementById("bar");
  const intro = document.querySelector<HTMLElement>(".intro");
  if (!bar || !intro) return;
  type Pair = {
    el: HTMLElement;
    to: HTMLElement | SVGElement;
    pin: boolean;
    // a line of text: sized by font size and centred on its target line
    text: boolean;
    // lands just after another header piece (the tagline's second line after
    // its subject), so it follows that word's width when the die rerolls it
    after?: { pair: Pair; gap: number };
    from?: { x: number; y: number };
    // null: hidden, so fade
    dest?: { x: number; y: number; s: number } | null;
  };
  const tagline = document.getElementById("tagline");
  const barTag = bar.querySelector(".bar-tag");
  const candidates: [
    HTMLElement | null | undefined,
    Element | null | undefined,
    boolean,
    boolean,
  ][] = [
    [document.getElementById("mark"), bar.querySelector(".brand"), false, false],
    [tagline?.querySelector<HTMLElement>(".tag-a"), barTag?.querySelector(".tag-a"), false, true],
    [tagline?.querySelector<HTMLElement>(".tag-b"), barTag?.querySelector(".tag-b"), false, true],
    [
      intro.querySelector<HTMLElement>(".die-corner"),
      bar.querySelector(".die-bar .die"),
      true,
      false,
    ],
  ];
  const pairs: Pair[] = [];
  for (const [el, to, pin, text] of candidates)
    if (el && (to instanceof HTMLElement || to instanceof SVGElement))
      pairs.push({ el, to, pin, text });
  let span = 1;

  // the full name's extra letters ("alex jarvis"), shown on hover; each one's
  // natural width is measured so the CSS can open it to exactly that
  const mark = document.getElementById("mark");
  const ghosts = mark ? Array.from(mark.querySelectorAll<HTMLElement>(".ghost")) : [];

  const size = (el: Element) => Number.parseFloat(getComputedStyle(el).fontSize);

  function measure() {
    for (const p of pairs) {
      p.el.style.transform = "none";
      p.el.style.opacity = "";
    }
    for (const g of ghosts) {
      g.style.transition = "none";
      g.style.width = "auto";
    }
    for (const g of ghosts) g.style.setProperty("--w", `${g.getBoundingClientRect().width}px`);
    for (const g of ghosts) {
      g.style.width = "";
      void g.offsetWidth;
      g.style.transition = "";
    }
    bar?.style.setProperty("--p", "1");
    let prev: Pair | undefined;
    for (const p of pairs) {
      const a = p.el.getBoundingClientRect();
      const b = p.to.getBoundingClientRect();
      p.from = { x: a.left, y: a.top + scrollY };
      delete p.after;
      if (!b.width) p.dest = null;
      else if (!p.text) p.dest = { x: b.left, y: b.top, s: b.height / a.height };
      else {
        // the splash lines are much bigger type; shrink to the header's size
        // and line the middles up (the boxes have different line heights)
        const s = size(p.to) / size(p.el);
        p.dest = { x: b.left, y: b.top + b.height / 2 - (a.height * s) / 2, s };
        if (prev?.text && prev.dest && prev.to instanceof HTMLElement)
          p.after = { pair: prev, gap: b.left - (prev.dest.x + prev.to.offsetWidth) };
      }
      prev = p;
    }
    span = (intro?.offsetHeight ?? 0) * 0.6;
    update();
  }

  function update() {
    if (!bar || !intro) return;
    const p = Math.min(Math.max(scrollY / span, 0), 1);
    const e = p * p * (3 - 2 * p); // smoothstep
    for (const q of pairs) {
      if (!q.dest || !q.from) {
        q.el.style.opacity = String(1 - Math.min(e * 1.6, 1));
        continue;
      }
      const nowY = q.from.y - scrollY; // where it sits in the flow right now
      // after a reroll the subject in the header is a different width, so
      // the line that follows it lands somewhere else
      const destX =
        q.after?.pair.dest && q.after.pair.to instanceof HTMLElement
          ? q.after.pair.dest.x + q.after.pair.to.offsetWidth + q.after.gap
          : q.dest.x;
      const dx = (destX - q.from.x) * e;
      // the die is already up by the header, so it stays put on screen and
      // glides straight into its slot instead of scrolling away first
      const dy = q.pin ? scrollY + (q.dest.y - q.from.y) * e : (q.dest.y - nowY) * e;
      const s = 1 + (q.dest.s - 1) * e;
      q.el.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
    }
    bar.style.setProperty("--p", String(e));
    if (mark) mark.classList.toggle("receding", e > 0.02); // no hover reveal once it's moving
    bar.classList.toggle("off", e < 0.02);
    intro.classList.toggle("scrolled", scrollY > 4); // the scroll cue bows out
    document.body.classList.toggle("docked", p >= 1);
  }

  // Update straight from the scroll event, in the same frame the page moved.
  // (Deferring to the next animation frame left the wordmark one frame behind
  // the scroll, so it jittered on the way into the header.)
  addEventListener("scroll", update, { passive: true });
  window.__recede = update; // the snapping spring calls this as it scrolls
  addEventListener("resize", measure);
  measure();
  if (document.fonts?.ready) document.fonts.ready.then(measure);
})();
