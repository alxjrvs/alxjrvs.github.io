// The dice grid behind the splash. The CSS draws a static copy of it (the
// fallback without JS); this swaps in real dice, one per cell and lined up the
// same way, so a roll can reach them. Each roll sends a pulse out from the
// tagline: as it passes a die, the die rerolls to a new face and swells a
// little, then settles. Under reduced motion every face changes at once.
(() => {
  const intro = document.querySelector<HTMLElement>(".intro");
  const corner = intro?.querySelector<HTMLElement>(".die-corner");
  const tag = document.getElementById("tagline");
  if (!intro || !corner || !tag) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";
  const FACES = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  const AT = [4.5, 8, 11.5];
  const R = 1.35;
  // each face is one path: the rounded square with its pips punched out
  function facePath(f: number[]): string {
    return (
      "M3 0h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3z" +
      f
        .map((p) => {
          const x = (AT[p % 3] as number) - R;
          const y = AT[Math.floor(p / 3)] as number;
          return `M${x} ${y}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0z`;
        })
        .join("")
    );
  }
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "dice-grid");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<defs>${FACES.map(
    (f, n) =>
      `<symbol id="grid-face-${n}" viewBox="0 0 16 16"><path fill-rule="evenodd" d="${facePath(f)}"/></symbol>`,
  ).join("")}</defs>`;
  intro.insertBefore(svg, intro.firstChild);

  type Cell = { el: SVGUseElement; key: string; x: number; y: number };
  const faces: Record<string, number> = {}; // "col,row" -> face, so a resize keeps every die as it was
  let cells: Cell[] = []; // x, y: the die's centre
  function rand(not: number | undefined): number {
    let f: number;
    do {
      f = Math.floor(Math.random() * FACES.length);
    } while (f === not);
    return f;
  }
  function setFace(c: Cell, f: number) {
    faces[c.key] = f;
    c.el.setAttribute("href", `#grid-face-${f}`);
  }

  // Same layout as the CSS: die-sized cells with half a die between them,
  // counted out from the splash die (which covers its own cell) across the
  // whole width, and down from its top to where the grid has faded out.
  function build() {
    if (!intro || !corner) return;
    const W = intro.clientWidth;
    const H = intro.clientHeight;
    const s = corner.offsetWidth;
    const cell = s * 1.5;
    const cs = getComputedStyle(corner);
    const x0 = W - Number.parseFloat(cs.right) - s;
    const y0 = Number.parseFloat(cs.top);
    for (const c of cells) c.el.remove();
    cells = [];
    for (let row = 0; y0 + row * cell < H * 0.92; row++) {
      for (let col = -Math.floor((W - x0) / cell); x0 - col * cell + s > 0; col++) {
        if (!row && !col) continue;
        const key = `${col},${row}`;
        const x = x0 - col * cell;
        const y = y0 + row * cell;
        const el = document.createElementNS(NS, "use");
        el.setAttribute("x", String(x));
        el.setAttribute("y", String(y));
        el.setAttribute("width", String(s));
        el.setAttribute("height", String(s));
        const c = { el, key, x: x + s / 2, y: y + s / 2 };
        setFace(c, faces[key] ?? rand(-1));
        svg.appendChild(el);
        cells.push(c);
      }
    }
    intro.classList.add("has-grid");
  }
  build();
  let resizing: ReturnType<typeof setTimeout> | undefined;
  new ResizeObserver(() => {
    clearTimeout(resizing);
    resizing = setTimeout(build, 120);
  }).observe(intro);

  let running: number | null = null;
  document.addEventListener("diceroll", () => {
    if (!intro) return;
    if (running) cancelAnimationFrame(running);
    const box = intro.getBoundingClientRect();
    const t = tag.getBoundingClientRect();
    // off screen there's nothing to see: just reroll
    if (reduce.matches || box.bottom <= 0) {
      for (const c of cells) setFace(c, rand(faces[c.key]));
      return;
    }
    const ox = t.left + t.width / 2 - box.left;
    const oy = t.top + t.height / 2 - box.top;
    const queue = cells
      .map((c) => ({ c, d: Math.hypot(c.x - ox, c.y - oy) }))
      .sort((a, b) => a.d - b.d);
    // the pulse takes about 0.8s to reach the farthest die, whatever the screen
    const last = queue[queue.length - 1];
    const speed = Math.max(last ? last.d / 800 : 1, 0.6);
    const start = performance.now();
    let i = 0;
    (function frame(now: number) {
      const reach = (now - start) * speed;
      for (; i < queue.length && (queue[i]?.d ?? 0) <= reach; i++) {
        const c = (queue[i] as { c: Cell }).c;
        setFace(c, rand(faces[c.key]));
        c.el.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.3)", offset: 0.3 },
            { transform: "scale(1)" },
          ],
          { duration: 600, easing: "cubic-bezier(.2,.8,.2,1)" },
        );
      }
      running = i < queue.length ? requestAnimationFrame(frame) : null;
    })(start);
  });
})();
