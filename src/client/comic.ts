// The comic reader, on a comic piece. The pages arrive stacked (that's the
// no-JS reading); this shows one at a time. Click or tap the right of a page
// (or Next, or →) to go on, the left third (or Back, or ←) to go back, or
// swipe on a touch screen. The page is kept in the URL as #page-N without
// adding history, and the header's progress line shows how far in you are.
// Turning a page is instant, so reduced motion changes nothing.
(() => {
  const comic = document.getElementById("comic");
  const nav = comic?.querySelector<HTMLElement>(".comic-nav");
  const pages = comic ? [...comic.querySelectorAll<HTMLElement>(".comic-page")] : [];
  if (!comic || !nav || pages.length < 2) return;
  const now = nav.querySelector<HTMLElement>("[data-now]");
  const [back, next] = [...nav.querySelectorAll<HTMLButtonElement>("[data-step]")];
  const line = document.getElementById("read-progress");
  let at = 0;

  // A neighbour's images load ahead of time, so turning to it never waits.
  const warm = (i: number) => {
    for (const img of pages[i]?.querySelectorAll("img") ?? []) img.loading = "eager";
  };

  function show(i: number, turned: boolean) {
    at = Math.min(pages.length - 1, Math.max(0, i));
    pages.forEach((p, j) => {
      p.hidden = j !== at;
    });
    if (now) now.textContent = String(at + 1);
    if (back) back.disabled = at === 0;
    if (next) next.disabled = at === pages.length - 1;
    line?.style.setProperty("--read", String((at + 1) / pages.length));
    warm(at + 1);
    warm(at - 1);
    if (!turned) return;
    // (not on load: a hash set before the load event makes the browser jump to it)
    history.replaceState(history.state, "", `#page-${at + 1}`);
    // A tall page starts at its top, under the header.
    if (comic && comic.getBoundingClientRect().top < 0) {
      comic.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }
  const step = (d: number) => {
    if (pages[at + d]) show(at + d, true);
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
    const b = (e.target as Element).closest<HTMLButtonElement>("[data-step]");
    if (b) step(Number(b.dataset.step));
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

  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return;
    if ((e.target as Element).closest("input, textarea, select, [contenteditable]")) return;
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else return;
    e.preventDefault();
  });

  // A sideways swipe turns the page; mostly-vertical ones just scroll.
  let x0 = 0;
  let y0 = 0;
  list?.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      if (t) [x0, y0] = [t.clientX, t.clientY];
    },
    { passive: true },
  );
  list?.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    },
    { passive: true },
  );
})();
