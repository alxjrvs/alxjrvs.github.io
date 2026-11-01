// The page chrome every page shares: the back-to-top button, header links
// that follow the scroll, and the theme toggle.

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

// Theme: follows the visitor's system light/dark setting, live. The toggle
// overrides it; picking the same mode as the system clears the override, so
// the site goes back to following the system.
(() => {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const root = document.documentElement;
  const os = matchMedia("(prefers-color-scheme: light)");
  type Theme = "light" | "dark";
  const system = (): Theme => (os.matches ? "light" : "dark");
  function saved(): Theme | null {
    try {
      const t = localStorage.getItem("theme");
      return t === "light" || t === "dark" ? t : null;
    } catch {
      return null;
    }
  }
  const current = (): Theme => (root.getAttribute("data-theme") === "light" ? "light" : "dark");
  function apply(t: Theme) {
    root.setAttribute("data-theme", t);
    btn?.setAttribute(
      "aria-label",
      t === "dark" ? "Switch to light theme" : "Switch to dark theme",
    );
  }
  apply(current());
  btn.addEventListener("click", () => {
    const t = current() === "dark" ? "light" : "dark";
    try {
      if (t === system()) localStorage.removeItem("theme");
      else localStorage.setItem("theme", t);
    } catch {}
    apply(t);
  });
  os.addEventListener("change", () => {
    if (!saved()) apply(system());
  });
})();
