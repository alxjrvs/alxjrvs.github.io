// The page chrome every page shares: the back-to-top button and header links
// that follow the scroll.

// Back-to-top button: fades in while you're scrolling (once you're past the
// first screen) and fades out again shortly after you stop.
(() => {
  const fab = document.getElementById("to-top");
  if (!fab) return;
  let idle: ReturnType<typeof setTimeout> | undefined;
  addEventListener(
    "scroll",
    () => {
      const far = scrollY > innerHeight * 0.9;
      fab.classList.toggle("show", far);
      clearTimeout(idle);
      if (far) {
        idle = setTimeout(() => {
          if (!fab.matches(":hover, :focus-visible")) fab.classList.remove("show");
        }, 1400);
      }
    },
    { passive: true },
  );
  fab.addEventListener("click", (e) => {
    e.preventDefault();
    scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    fab.blur();
  });
  fab.addEventListener("mouseleave", () => {
    idle = setTimeout(() => fab.classList.remove("show"), 800);
  });
})();

// Header links follow the scroll: the link for the section you're in is
// marked current (aria-current), which brightens and underlines it.
(() => {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav a[href*="#"]'));
  const pairs = links
    .map((a) => ({ a, s: document.getElementById(a.hash.slice(1)) }))
    .filter((p): p is { a: HTMLAnchorElement; s: HTMLElement } => p.s !== null);
  if (!pairs.length) return;
  let queued = false;
  function update() {
    queued = false;
    const line = innerHeight * 0.4;
    let cur: (typeof pairs)[number] | null = null;
    for (const p of pairs) if (p.s.getBoundingClientRect().top <= line) cur = p;
    for (const p of pairs) {
      if (p === cur) p.a.setAttribute("aria-current", "location");
      else p.a.removeAttribute("aria-current");
    }
  }
  addEventListener(
    "scroll",
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  addEventListener("resize", update);
  update();
})();

// The footer's email, written out as "alxjrvs (at) gmail (dot) com" so
// scrapers reading the HTML don't get an address; for people it's a link.
for (const span of document.querySelectorAll<HTMLElement>(".mail[data-user]")) {
  const a = document.createElement("a");
  a.className = "mail";
  a.href = `mailto:${span.dataset.user}@${span.dataset.domain}`;
  a.textContent = span.textContent;
  span.replaceWith(a);
}
