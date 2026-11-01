// The splash receding into the header. Over the first part of the scroll the
// header slides in while the big wordmark, the tagline and the die each
// shrink and travel into their own spot in it, then hand over to the
// header's copies. Where the header has no room for the tagline (narrow
// screens) it fades out instead.
(() => {
  const bar = document.getElementById("bar");
  const intro = document.querySelector<HTMLElement>(".intro");
  if (!bar || !intro) return;
  type Pair = {
    el: HTMLElement;
    to: Element;
    pin: boolean;
    // cross-fades into its header copy at the end (the tagline)
    fade?: boolean;
    from?: { x: number; y: number };
    // null: hidden, so fade
    dest?: { x: number; y: number; s: number } | null;
  };
  const candidates: [HTMLElement | null, Element | null, boolean][] = [
    [document.getElementById("mark"), bar.querySelector(".brand"), false],
    [document.getElementById("tagline"), bar.querySelector(".bar-tag"), false],
    [intro.querySelector<HTMLElement>(".die-corner"), bar.querySelector(".die-bar .die"), true],
  ];
  const pairs: Pair[] = [];
  for (const [el, to, pin] of candidates) if (el && to) pairs.push({ el, to, pin });
  let span = 1;

  // the full name's extra letters ("alex jarvis"), shown on hover; each one's
  // natural width is measured so the CSS can open it to exactly that
  const mark = document.getElementById("mark");
  const ghosts = mark ? Array.from(mark.querySelectorAll<HTMLElement>(".ghost")) : [];

  function measure() {
    for (const p of pairs) {
      p.el.style.transform = "none";
      p.el.style.opacity = "";
      if (p.to instanceof HTMLElement || p.to instanceof SVGElement) p.to.style.opacity = "";
      p.fade = false;
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
    for (const p of pairs) {
      const a = p.el.getBoundingClientRect();
      const b = p.to.getBoundingClientRect();
      p.from = { x: a.left, y: a.top + scrollY };
      p.dest = b.width ? { x: b.left, y: b.top, s: b.height / a.height } : null;
      // the splash tagline is two lines and the header's is one, so it
      // shrinks to the header's type size and cross-fades into it
      if (p.dest && p.el.id === "tagline") {
        p.dest.s =
          Number.parseFloat(getComputedStyle(p.to).fontSize) /
          Number.parseFloat(getComputedStyle(p.el).fontSize);
        p.fade = true;
      }
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
      const dx = (q.dest.x - q.from.x) * e;
      // the die is already up by the header, so it stays put on screen and
      // glides straight into its slot instead of scrolling away first
      const dy = q.pin ? scrollY + (q.dest.y - q.from.y) * e : (q.dest.y - nowY) * e;
      const s = 1 + (q.dest.s - 1) * e;
      q.el.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
      if (q.fade && (q.to instanceof HTMLElement || q.to instanceof SVGElement)) {
        const f = Math.min(Math.max((e - 0.6) / 0.4, 0), 1);
        q.el.style.opacity = String(1 - f);
        q.to.style.opacity = String(f);
      }
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
