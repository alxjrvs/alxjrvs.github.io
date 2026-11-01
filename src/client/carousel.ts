// The projects are a sideways carousel at every width. Each swipe or arrow
// press moves one card and snaps to it (the one arrow points onward), and it
// loops: past the last card comes the first again. The loop is two copies of
// the cards at each end (hidden from screen readers and the keyboard); once a
// scroll settles on a copy, it jumps to the real card it copies, which looks
// identical. Nothing moves on its own.
(() => {
  const cards = document.querySelector<HTMLElement>(".cards");
  const box = cards?.parentElement;
  if (!cards || !box) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const PAD = 2;
  let on = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

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
    if (!on || !cards) return;
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

  // the die shuffles the real cards; the copies wait it out
  cards.addEventListener("shufflestart", () => {
    if (on && cards) {
      unbuild();
      cards.scrollLeft = 0;
    }
  });
  cards.addEventListener("shuffleend", build);

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
