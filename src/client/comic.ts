// The comic reader, on a comic piece. The pages arrive stacked (that's the
// no-JS reading); this shows one at a time and drives the comic's stepper
// (components/Stepper.astro): Back and Next turn the page, and past either end
// they go to the neighbouring part of the comic's thread, if it's in one. On
// the last page of a comic with nowhere further to go, Next scrolls down to
// what's under the reader (the note, the credits, the way onward), so the
// comic has an ending and not a dead button.
// Clicking or tapping a page goes on, or back on its left third.
// client/stepper.ts adds ← → and swipes, the same as for a thread. The page
// is kept in the URL as #page-N without adding history, and the header's
// progress line shows how far in you are. Turning is instant, so reduced
// motion changes nothing. On a wide screen the title and the controls float
// at the bottom right and tuck away while the mouse rests.
(() => {
  const comic = document.getElementById("comic");
  const nav = comic?.querySelector<HTMLElement>("[data-stepper]");
  const pages = comic ? [...comic.querySelectorAll<HTMLElement>(".comic-page")] : [];
  if (!comic || !nav) return;
  const now = nav.querySelector<HTMLElement>("[data-now]");
  const desc = nav.querySelector<HTMLElement>("[data-desc]");
  const full = comic.querySelector<HTMLAnchorElement>("[data-full-size]");
  const back = nav.querySelector<HTMLElement>('[data-step="-1"]');
  const next = nav.querySelector<HTMLElement>('[data-step="1"]');
  const beyond = { "-1": nav.dataset.prevHref, "1": nav.dataset.nextHref };
  const line = document.getElementById("read-progress");
  const last = pages.length - 1;
  // What's under the reader, where Next goes from the last page. Looked up
  // when it's needed: this script runs before the rest of the page is parsed.
  const after = () =>
    document.querySelector<HTMLElement>(".post-body .comic-note, .post-body .fin");
  let at = 0;

  // A neighbour's images load ahead of time, so turning to it never waits.
  const warm = (i: number) => {
    for (const img of pages[i]?.querySelectorAll("img") ?? []) img.loading = "eager";
  };

  function show(i: number, turned: boolean) {
    at = Math.min(last, Math.max(0, i));
    pages.forEach((p, j) => {
      p.hidden = j !== at;
    });
    if (now) now.textContent = String(at + 1);
    // the page's description is read out with the count when it turns
    if (desc) {
      const alt = pages[at]?.dataset.alt;
      desc.textContent = turned && alt ? `: ${alt}` : "";
    }
    const href = pages[at]?.dataset.full;
    if (full && href) full.href = href;
    // aria-disabled, not disabled, so a focused button keeps focus at the end.
    // It needs the value "true": an empty attribute isn't announced.
    const dead = (el: HTMLElement | null, on: boolean) => {
      if (on) el?.setAttribute("aria-disabled", "true");
      else el?.removeAttribute("aria-disabled");
    };
    dead(back, at === 0 && !beyond["-1"]);
    // Next is never a dead end: past the last page it goes on to the thread's
    // next part, or down to what's under the reader.
    dead(next, false);
    line?.style.setProperty("--read", String((at + 1) / pages.length));
    warm(at + 1);
    warm(at - 1);
    if (!turned) return;
    // (not on load: a hash set before the load event makes the browser jump to it)
    history.replaceState(history.state, "", `#page-${at + 1}`);
    // The comic fills the first screen; turning a page from further down
    // brings it back up.
    if (comic && comic.getBoundingClientRect().top < 0) scrollTo({ top: 0, behavior: "instant" });
  }
  const step = (d: -1 | 1) => {
    if (pages[at + d]) show(at + d, true);
    else if (beyond[d]) location.href = beyond[d];
    else if (d === 1) {
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      after()?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    }
  };

  const fromHash = () => {
    const m = /^#page-(\d+)$/.exec(location.hash);
    return m ? Number(m[1]) - 1 : undefined;
  };
  comic.classList.add("paged");
  nav.hidden = false;
  show(fromHash() ?? 0, false);
  // a #page-N link followed on the page itself
  addEventListener("hashchange", () => {
    const i = fromHash();
    if (i !== undefined && i !== at) show(i, true);
  });

  nav.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("[data-step]");
    if (b) step(b.dataset.step === "-1" ? -1 : 1);
  });

  // The page itself: left third goes back, the rest goes on.
  const side = (e: MouseEvent) => {
    const r = pages[at]?.getBoundingClientRect();
    return r && e.clientX < r.left + r.width / 3 ? -1 : 1;
  };
  const list = comic.querySelector<HTMLElement>(".comic-pages");
  list?.addEventListener("click", (e) => {
    if ((e.target as Element).closest("a")) return;
    step(side(e));
  });
  list?.addEventListener("mousemove", (e) => {
    list.dataset.side = side(e) < 0 ? "back" : "next";
  });

  // On a wide screen the title and the controls float at the bottom right
  // (.comic-dock). They tuck away once the mouse has rested a moment, so the
  // page is all there is, and come back at any move, key or focus, and stay
  // while the pointer is on them. Once the page is scrolled out of view they
  // leave altogether. (On a phone the dock isn't fixed, so none of this shows.)
  const dock = comic.querySelector<HTMLElement>(".comic-dock");
  if (dock) {
    let timer = 0;
    const rest = () => {
      if (dock.matches(":hover, :focus-within")) return;
      dock.classList.add("tucked");
      list?.classList.add("idle");
    };
    const wake = () => {
      dock.classList.remove("tucked");
      list?.classList.remove("idle");
      clearTimeout(timer);
      timer = window.setTimeout(rest, 2400);
    };
    for (const type of ["pointermove", "pointerdown", "keydown", "wheel"])
      addEventListener(type, wake, { passive: true });
    dock.addEventListener("focusin", wake);
    dock.addEventListener("pointerleave", wake);
    if (list && "IntersectionObserver" in window)
      new IntersectionObserver(
        ([e]) => dock.classList.toggle("away", (e?.intersectionRatio ?? 0) < 0.6),
        { threshold: [0, 0.6, 1] },
      ).observe(list);
    wake();
  }
})();
