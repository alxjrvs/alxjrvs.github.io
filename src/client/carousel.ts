// The projects are a sideways carousel at every width. Each swipe or arrow
// press moves one card and snaps to it (the one arrow points onward), and it
// loops: past the last card comes the first again. The loop is two copies of
// the cards at each end (hidden from screen readers and the keyboard); once a
// scroll settles on a copy, it jumps to the real card it copies, which looks
// identical. It also moves on by itself every 8 seconds, but only while it's
// on screen and nobody is using it: hovering, touching or focusing it pauses
// the cycle, any swipe restarts the count, and reduced motion turns it off.
// The die's roll spins it round to a random project (see below).
(() => {
  const cards = document.querySelector<HTMLElement>(".cards");
  const box = cards?.parentElement;
  if (!cards || !box) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const PAD = 2;
  let on = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let landNow: (() => void) | null = null; // set while the die's roll is spinning

  const real = () => Array.from(cards.querySelectorAll<HTMLElement>(".card:not(.copy)"));
  function copy(el: HTMLElement): HTMLElement {
    const c = el.cloneNode(true) as HTMLElement;
    c.classList.add("copy");
    c.setAttribute("aria-hidden", "true");
    c.setAttribute("inert", "");
    for (const a of c.querySelectorAll("a")) a.tabIndex = -1;
    return c;
  }
  // one card plus the gap after it
  function step(): number {
    const [first, second] = real();
    return first && second ? second.offsetLeft - first.offsetLeft : (cards?.clientWidth ?? 0);
  }
  function jump(left: number) {
    if (!cards) return;
    cards.style.scrollSnapType = "none";
    cards.scrollTo({ left, behavior: "instant" });
    void cards.offsetWidth;
    cards.style.scrollSnapType = "";
  }

  function build() {
    if (!cards) return;
    unbuild();
    const r = real();
    if (r.length < 2) return;
    // card k (copies included) snaps at scrollLeft k * step()
    for (const el of r.slice(-PAD).reverse()) cards.insertBefore(copy(el), cards.firstChild);
    for (const el of r.slice(0, PAD)) cards.appendChild(copy(el));
    on = true;
    jump(PAD * step());
    aim();
  }
  function unbuild() {
    for (const c of cards?.querySelectorAll(".copy") ?? []) c.remove();
    on = false;
  }
  // the arrows sit level with the middle of the screenshots
  function aim() {
    const img = cards?.querySelector<HTMLElement>(".shot img");
    if (img) box?.style.setProperty("--nudge-y", `${img.offsetTop + img.offsetHeight / 2}px`);
  }

  // after a scroll comes to rest: if it's on a copy, swap to the real card
  function settle() {
    if (!on || !cards || landNow) return; // not mid-roll
    const n = real().length;
    const s = step();
    const i = Math.round(cards.scrollLeft / s) - PAD; // -PAD..n+PAD-1
    if (i < 0 || i >= n) jump(cards.scrollLeft + (i < 0 ? n : -n) * s);
  }
  cards.addEventListener(
    "scroll",
    () => {
      clearTimeout(timer);
      timer = setTimeout(settle, 140);
      cycle(); // any movement, ours or the visitor's, restarts the count
    },
    { passive: true },
  );
  if ("onscrollend" in window) {
    cards.addEventListener("scrollend", () => {
      clearTimeout(timer);
      settle();
    });
  }

  function nudge(dir: number) {
    if (!cards) return;
    settle(); // start from the real card, so a fast double tap still loops
    const s = step();
    const at = Math.round(cards.scrollLeft / s) * s;
    cards.scrollTo({ left: at + dir * s, behavior: reduce.matches ? "instant" : "smooth" });
  }
  box.querySelector(".next")?.addEventListener("click", () => nudge(1));

  // The auto-advance: every 8s of stillness, move on one card.
  const EVERY = 8000;
  let auto: ReturnType<typeof setTimeout> | undefined;
  let seen = false;
  let hovered = false;
  let touching = false;
  function cycle() {
    clearTimeout(auto);
    auto = setTimeout(() => {
      const idle = !landNow && !hovered && !touching && !box?.contains(document.activeElement);
      if (on && seen && idle && !document.hidden && !reduce.matches) nudge(1);
      cycle();
    }, EVERY);
  }
  new IntersectionObserver(
    ([e]) => {
      seen = !!e && e.intersectionRatio >= 0.5;
      cycle();
    },
    { threshold: [0, 0.5, 1] },
  ).observe(box);
  box.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") hovered = true;
  });
  box.addEventListener("pointerleave", () => {
    hovered = false;
    cycle();
  });
  box.addEventListener("touchstart", () => (touching = true), { passive: true });
  box.addEventListener("touchend", () => {
    touching = false;
    cycle();
  });
  box.addEventListener("focusout", cycle);

  // The die's roll: the carousel whips through the projects, a few times
  // round, and slows down card by card to land on a different one. It's
  // driven frame by frame with snapping off; the loop's copies make the wrap
  // from last to first invisible. The auto-advance waits for it; touching or
  // scrolling the carousel lands it at once. Off screen, or with reduced
  // motion, it just lands.
  // the screenshots it whips past should already be here
  function warm() {
    for (const img of cards?.querySelectorAll<HTMLImageElement>(".shot img") ?? [])
      img.loading = "eager";
  }
  cards.addEventListener("rollsoon", warm);

  // It keeps time with the die's other reels (die.ts): a tick per card, each
  // gap longer than the last by the same base + i² curve, stretched over as
  // many cards as it passes so it takes about as long as the tagline's object
  // reel (15 ticks, base 30ms, curve 1.9) and slows down the same way. Each
  // tick slides one card on, easing out, quick as the gaps while they're
  // short; the last eases into place.
  const TICKS = 15;
  const BASE = 30;
  const CURVE = 1.9;
  const LAND_MS = 320;
  const SLIDE_MAX = 240;
  function schedule(k: number): { at: number[]; dur: number[] } {
    const scale = TICKS / k;
    const at = [0];
    for (let j = 1; j < k; j++)
      at.push((at[j - 1] as number) + (BASE + (j * scale) ** 2 * CURVE) * scale);
    const dur = at.map((t, j) =>
      j < k - 1 ? Math.min(SLIDE_MAX, (at[j + 1] as number) - t) : LAND_MS,
    );
    return { at, dur };
  }
  cards.addEventListener("roll", (e) => {
    const done = (e as CustomEvent<() => void>).detail;
    if (!on || !cards) return;
    e.preventDefault(); // tells the die we've got it
    landNow?.();
    warm();
    settle();
    const n = real().length;
    const s = step();
    const from = (((Math.round(cards.scrollLeft / s) - PAD) % n) + n) % n;
    const to = (from + 1 + Math.floor(Math.random() * (n - 1))) % n;
    // card x (in cards, may run past n) sits at scrollLeft (PAD + x mod n) * s
    const at = (x: number) => (PAD + (((x % n) + n) % n)) * s;
    let frame = 0;
    function land() {
      landNow = null;
      cancelAnimationFrame(frame);
      jump(at(to));
      cycle();
      done();
    }
    if (reduce.matches || !seen) return land();
    landNow = land;
    // two or three times round, then on to the one it lands on
    const loops = n < 4 ? 3 : 2;
    const dist = loops * n + ((to - from + n) % n);
    cards.style.scrollSnapType = "none";
    const { at: starts, dur } = schedule(dist);
    const end = (starts[dist - 1] as number) + (dur[dist - 1] as number);
    const t0 = performance.now();
    let j = 0;
    (function tick(now: number) {
      const el = now - t0;
      while (j < dist - 1 && el >= (starts[j + 1] as number)) j++;
      const p = Math.min(1, Math.max(0, (el - (starts[j] as number)) / (dur[j] as number)));
      const eased = j === dist - 1 ? 1 - (1 - p) ** 3 : 1 - (1 - p) ** 2;
      cards.scrollLeft = at(from + j + eased);
      if (el < end) frame = requestAnimationFrame(tick);
      else land();
    })(t0);
  });
  // any hand on the carousel lands the roll
  for (const type of ["pointerdown", "wheel", "keydown"]) {
    box.addEventListener(type, () => landNow?.(), { passive: true });
  }

  // a resize changes the card width, so put the current card back in place
  let resizing: ReturnType<typeof setTimeout> | undefined;
  addEventListener("resize", () => {
    aim();
    clearTimeout(resizing);
    resizing = setTimeout(() => {
      if (!on || !cards) return;
      const s = step();
      jump(Math.round(cards.scrollLeft / s) * s);
      settle();
    }, 100);
  });
  addEventListener("load", aim);
  build();
})();
