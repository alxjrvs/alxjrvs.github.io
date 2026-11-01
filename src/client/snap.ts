// Section snapping. Scrolling itself stays native and free, so the wordmark
// animation plays under your fingers. Once a scroll has slowed right down, a
// soft, critically damped spring picks up from the scroll's own speed and
// eases the page onto a section, with no bounce: the next one if you've moved
// past a tenth of a screen (counting where your momentum was heading),
// otherwise back where you were. Any new input cancels the spring at once.
// Only for mouse and trackpad; touch gets CSS snapping.
//
// Only a scroll you made with the wheel (or trackpad) or a paging key
// (Page Up/Down, Space, Home, End) springs. Scrolls the browser makes for
// you (tabbing to a link, find in page, a screen reader moving its cursor,
// the arrow keys) are left exactly where they landed, and the spring never
// carries the focused element out of view.
(() => {
  const fine = matchMedia(
    "(hover: hover) and (pointer: fine) and (min-width: 761px) and (min-height: 600px)",
  );
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  const screens = Array.from(document.querySelectorAll<HTMLElement>(".screen"));

  const MARK = 0.1; // fraction of a screen you have to cross to move on
  const STIFF = 42; // spring stiffness: low, so it eases in over ~0.8s
  const DAMP = 1; // critically damped: no overshoot, no wobble
  const COAST = 260; // ms of current speed to count when picking a section

  let origin: number | null = null; // where the current gesture started
  let lastY = scrollY;
  let lastT = performance.now();
  let vel = 0; // px per ms
  let idle: ReturnType<typeof setTimeout> | undefined;
  let spring: { to: number; dir: number; raf: number } | null = null;
  let lastDelta = 0;
  let began = 0;
  let intentAt = -Infinity; // when the wheel or a paging key last moved the page
  const INTENT_MS = 1200;
  const PAGING = new Set(["PageDown", "PageUp", " ", "Home", "End"]);

  const on = () => fine.matches && !reduce.matches;
  const sync = () => root.classList.toggle("glide", on());
  fine.addEventListener("change", sync);
  reduce.addEventListener("change", sync);
  sync();

  const maxY = () => root.scrollHeight - innerHeight;

  // Resting places: every section's top, plus the bottom edge of any section
  // taller than the screen.
  function stops(): number[] {
    const vh = innerHeight;
    const out: number[] = [];
    for (const el of screens) {
      const t = el.offsetTop;
      const h = el.offsetHeight;
      out.push(Math.min(t, maxY()));
      if (h > vh + 2) out.push(Math.min(t + h - vh, maxY()));
    }
    return out.sort((a, b) => a - b);
  }
  function nearest(list: number[], y: number): number {
    return list.reduce(
      (best, s) => (Math.abs(s - y) < Math.abs(best - y) ? s : best),
      list[0] as number,
    );
  }

  function pick(y: number): number | null {
    const list = stops();
    const vh = innerHeight;
    const from = origin === null ? nearest(list, y) : origin;
    const moved = y - from;
    if (Math.abs(moved) < vh * MARK) return from;
    const dir = moved > 0 ? 1 : -1;
    // the first stop past the start in the direction of travel, but never
    // pull back past where the scroll already got to
    const ahead = list.filter((s) => (dir > 0 ? s > from + 1 : s < from - 1));
    if (!ahead.length) return nearest(list, y);
    let next = (dir > 0 ? ahead[0] : ahead[ahead.length - 1]) as number;
    const beyond = list.filter((s) => (dir > 0 ? s >= y - 1 : s <= y + 1));
    if (dir > 0 && y > next) next = beyond.length ? (beyond[0] as number) : next;
    if (dir < 0 && y < next) next = beyond.length ? (beyond[beyond.length - 1] as number) : next;
    // in the middle of a long section, leave it where it is
    if (Math.abs(next - y) > vh * 1.2) return null;
    return next;
  }

  // Would moving the page by `by` pixels push the focused element (or the
  // current text selection) off screen?
  function keepsFocus(by: number): boolean {
    const vh = innerHeight;
    const rects: DOMRect[] = [];
    const el = document.activeElement;
    if (el && el !== document.body && el !== root) rects.push(el.getBoundingClientRect());
    const sel = getSelection();
    if (sel?.rangeCount && !sel.isCollapsed) rects.push(sel.getRangeAt(0).getBoundingClientRect());
    return rects.every((r) => {
      const visibleNow = r.bottom > 0 && r.top < vh;
      if (!visibleNow) return true;
      const top = r.top - by;
      return top >= 0 && top + Math.min(r.height, vh) <= vh;
    });
  }

  function stop() {
    if (!spring) return;
    cancelAnimationFrame(spring.raf);
    spring = null;
    root.classList.remove("moving");
    root.style.scrollBehavior = "";
  }

  function settle() {
    clearTimeout(idle);
    if (!on() || spring) return;
    if (performance.now() - intentAt > INTENT_MS) {
      // not a scroll the reader made by hand: leave it where it landed
      origin = null;
      return;
    }
    if (performance.now() - lastT > 100) vel = 0; // the scroll has already stopped
    const y = scrollY;
    const to = pick(Math.max(0, Math.min(maxY(), y + vel * COAST)));
    origin = null;
    if (to === null || Math.abs(to - y) < 1) return;
    if (!keepsFocus(to - y)) return;
    let x = y;
    let v = vel * 1000;
    const k = STIFF;
    const c = 2 * DAMP * Math.sqrt(k);
    let prev: number | null = null;
    root.style.scrollBehavior = "auto";
    root.classList.add("moving");
    const current = { to, dir: Math.sign(to - y), raf: 0 };
    spring = current;
    current.raf = requestAnimationFrame(function step(ts) {
      if (spring !== current) return;
      const dt = prev === null ? 1 / 60 : Math.min((ts - prev) / 1000, 1 / 30);
      prev = ts;
      for (let n = 0; n < 4; n++) {
        // a few substeps keep it stable
        const a = -k * (x - to) - c * v;
        v += (a * dt) / 4;
        x += (v * dt) / 4;
      }
      if (Math.abs(x - to) < 0.4 && Math.abs(v) < 8) x = to;
      lastY = Math.round(x);
      scrollTo(0, x);
      window.__recede?.(); // keep the wordmark in step this frame
      if (x === to) {
        stop();
        return;
      }
      current.raf = requestAnimationFrame(step);
    });
  }

  addEventListener(
    "scroll",
    () => {
      if (spring || !on()) return;
      const now = performance.now();
      const y = scrollY;
      let dt = now - lastT;
      if (origin === null || dt > 200) {
        // a new gesture
        if (origin === null) origin = nearest(stops(), lastY);
        began = now;
        vel = 0;
        dt = 0;
      }
      if (dt > 0) vel = vel * 0.6 + ((y - lastY) / dt) * 0.4;
      lastY = y;
      lastT = now;
      clearTimeout(idle);
      // hand over as soon as the scroll has slowed to a crawl, rather than
      // waiting out a long trackpad momentum tail
      if (now - began > 220 && Math.abs(vel) < 0.08 && Math.abs(y - origin) > 4) {
        settle();
        return;
      }
      idle = setTimeout(settle, 160);
    },
    { passive: true },
  );

  // While the spring runs, swallow the tail of a trackpad's momentum; a fresh
  // swipe (a jump in force, or the other direction) takes over.
  addEventListener(
    "wheel",
    (e: WheelEvent) => {
      const d = e.deltaY;
      intentAt = performance.now();
      if (!spring) {
        lastDelta = Math.abs(d);
        return;
      }
      const fresh = Math.sign(d) === -spring.dir || Math.abs(d) > lastDelta * 1.5 + 6;
      lastDelta = Math.abs(d);
      if (fresh) {
        stop();
        origin = null;
        vel = 0;
        lastY = scrollY;
        lastT = performance.now();
        return;
      }
      e.preventDefault();
    },
    { passive: false },
  );

  addEventListener("keydown", (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    const typing = t?.closest("input, textarea, select, [contenteditable]");
    if (PAGING.has(e.key) && !typing && !e.altKey && !e.ctrlKey && !e.metaKey) {
      intentAt = performance.now();
    } else {
      intentAt = -Infinity;
    }
  });
  // Tabbing or a screen reader moving focus is never a hand scroll.
  addEventListener("focusin", () => {
    intentAt = -Infinity;
  });

  for (const type of ["mousedown", "touchstart", "keydown"]) {
    addEventListener(
      type,
      () => {
        if (spring) {
          stop();
          origin = null;
        }
      },
      { passive: true },
    );
  }
  addEventListener("resize", () => {
    stop();
    origin = null;
  });
})();
