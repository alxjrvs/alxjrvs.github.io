// The die. Either copy of it (the splash corner or the header) re-rolls the
// page: the tagline spins slot-machine style, the projects carousel spins
// round to a random one, Writing deals a new hand of pieces from the archive,
// and About picks three new things I like. Every one of them rolls through
// options, slowing down until it settles.
//
// The word lists come from EmDash's Randomizers, rendered into #roll-data by the page.
(() => {
  const dataEl = document.getElementById("roll-data");
  if (!dataEl?.textContent) return;
  const data = JSON.parse(dataEl.textContent) as {
    subjects: string[];
    objects: string[];
    likes: string[][];
  };
  const SUBJECTS = data.subjects;
  const OBJECTS = data.objects;
  const LIKES = data.likes;
  const dice = Array.from(document.querySelectorAll<HTMLElement>(".die-btn"));
  const subjs = Array.from(document.querySelectorAll<HTMLElement>(".roll-subject"));
  const objs = Array.from(document.querySelectorAll<HTMLElement>(".roll-object"));
  const cards = document.querySelector<HTMLElement>(".cards");
  const likes = Array.from(document.querySelectorAll<HTMLElement>("#likes .like"));
  const slots = Array.from(document.querySelectorAll<HTMLElement>("#writing .archive > li"));
  const pool = Array.from(
    (
      document.getElementById("writing-pool") as HTMLTemplateElement | null
    )?.content.querySelectorAll<HTMLElement>(".archive > li") ?? [],
  );
  if (!dice.length) return;

  const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T;
  function shuffle<T>(input: T[]): T[] {
    const a = input.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j] as T, a[i] as T];
    }
    return a;
  }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let rolling = false;

  // On a phone, the die taps back: one short pulse on every face it flicks
  // through, slowing down with it. Android vibrates; an iPhone has no
  // vibrate, so it gets the tick Safari plays when a switch is flipped,
  // from a hidden one. Nothing on a desktop.
  const coarse = matchMedia("(pointer: coarse)");
  let tapper: HTMLLabelElement | undefined;
  function buzz() {
    if (!coarse.matches) return;
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
      return;
    }
    if (!tapper) {
      tapper = document.createElement("label");
      tapper.setAttribute("aria-hidden", "true");
      tapper.style.display = "none";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      input.tabIndex = -1;
      tapper.append(input);
      document.body.append(tapper);
    }
    tapper.click();
  }

  // A reel's label, plus any punctuation that rides along with it (the
  // tagline's full stops are part of their word). A word that already ends
  // in its punctuation, like "Undiagnosed, but, come on.", keeps it.
  function setText(el: HTMLElement, v: string) {
    const sfx = el.getAttribute("data-suffix") || "";
    el.textContent = sfx && v.slice(-sfx.length) === sfx ? v : v + sfx;
  }

  // One reel: cycles a label through random options, decelerating to a stop.
  // `ticks` and `curve` differ per reel so the two never land together.
  // The words a reel flicks through never repeat within one roll: a shuffled
  // run of the options, leaving out the word it lands on and the one showing
  // now. A short list means fewer ticks, each held longer, so the reel still
  // takes about as long and slows down the same way.
  function spin(
    els: HTMLElement[],
    opts: string[],
    finalVal: string,
    ticks: number,
    base: number,
    curve: number,
    done: () => void,
  ) {
    if (opts.length < 2) {
      for (const el of els) setText(el, finalVal);
      return done();
    }
    const showing = (els[0]?.textContent ?? "").replace(/\.$/, "");
    let pool = opts.filter((o) => o !== finalVal && o !== showing);
    if (!pool.length) pool = opts.filter((o) => o !== finalVal);
    const run = shuffle(pool)
      .slice(0, ticks - 1)
      .concat([finalVal]);
    const n = run.length;
    const scale = ticks / n;
    let i = 0;
    (function step() {
      const v = run[i++] as string;
      for (const el of els) {
        setText(el, v);
        if (!reduce.matches) {
          el.animate(
            [
              { transform: "translateY(-0.55em)", opacity: 0.25 },
              { transform: "none", opacity: 1 },
            ],
            { duration: 95, easing: "ease-out" },
          );
        }
      }
      if (i < n) setTimeout(step, (base + (i * scale) ** 2 * curve) * scale);
      else done();
    })();
  }

  // The projects' reel lives with the carousel (carousel.ts): it spins round
  // fast and lands on a random project, then calls back.
  function rollCards(finish: () => void) {
    if (!cards) return finish();
    let called = false;
    const done = () => {
      if (!called) {
        called = true;
        finish();
      }
    };
    // the carousel claims the roll; with nothing to roll (one project) it doesn't
    if (cards.dispatchEvent(new CustomEvent("roll", { detail: done, cancelable: true }))) done();
  }

  // Writing's reels. Each line of the list is a slot that flicks through
  // pieces from the archive (the #writing-pool template holds every one) and
  // slows down onto its pick. No piece ever shows in two lines at once: a
  // line only flicks to pieces no other line is showing or will land on.
  // The lines past what fits on screen are hidden by CSS, so the hand is
  // dealt top down, fresh pieces first.
  const showing = slots.map((el) => pool.findIndex((p) => p.dataset.post === el.dataset.post));
  function show(i: number, p: number) {
    const el = slots[i];
    const src = pool[p];
    if (!el || !src) return;
    showing[i] = p;
    el.innerHTML = src.innerHTML;
    el.dataset.post = src.dataset.post;
    const style = src.getAttribute("style");
    if (style) el.setAttribute("style", style);
    else el.removeAttribute("style");
  }
  function dealWriting(): number[] {
    const all = shuffle(pool.map((_, p) => p));
    const fresh = all.filter((p) => showing.indexOf(p) < 0);
    return fresh.concat(all.filter((p) => showing.indexOf(p) > -1)).slice(0, slots.length);
  }
  function spinWriting(finals: number[], done: () => void) {
    const landed = slots.map(() => false);
    let left = slots.length;
    slots.forEach((el, i) => {
      const final = finals[i] as number;
      // like the other reels, each line stops at its own pace, top first
      const ticks = 11 + i;
      const base = 35;
      const curve = 1.7 + i * 0.1;
      let t = 0;
      (function step() {
        t++;
        if (t < ticks) {
          const taken = new Set<number>();
          slots.forEach((_, j) => {
            if (j === i) return;
            taken.add(showing[j] as number);
            if (!landed[j]) taken.add(finals[j] as number);
          });
          const free = pool.map((_, p) => p).filter((p) => p !== showing[i] && !taken.has(p));
          if (free.length) {
            show(i, pick(free));
            el.animate(
              [
                { transform: "translateY(-0.5em)", opacity: 0.25 },
                { transform: "none", opacity: 1 },
              ],
              { duration: 95, easing: "ease-out" },
            );
          }
          setTimeout(step, base + t * t * curve);
          return;
        }
        // landing: a line still flicking that shows this pick takes what we had
        const j = showing.indexOf(final);
        if (j > -1 && j !== i) show(j, showing[i] as number);
        if (showing[i] !== final) show(i, final);
        landed[i] = true;
        if (!--left) done();
      })();
    });
  }

  // One pick per slot, never the one already showing.
  const picked = LIKES.map(() => 0);
  function nextLike(i: number): string {
    const slot = LIKES[i] ?? [];
    if (slot.length > 1) {
      const j = Math.floor(Math.random() * (slot.length - 1));
      picked[i] = j >= (picked[i] ?? 0) ? j + 1 : j;
    }
    return slot[picked[i] ?? 0] ?? "";
  }

  // The die's own reel: its 3x3 pips flick through random die faces, slowing
  // down, and land back on the favicon's "j".
  const FACES = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  const J = [2, 3, 5, 7];
  const pipSets = dice.map((d) => Array.from(d.querySelectorAll(".die-pips circle")));
  function showPips(on: number[]) {
    for (const pips of pipSets) {
      pips.forEach((c, i) => {
        c.classList.toggle("on", on.indexOf(i) > -1);
      });
    }
  }
  function rollPips(done: () => void) {
    const ticks = 16;
    let i = 0;
    let last = -1;
    (function step() {
      i++;
      if (i < ticks) {
        let f: number;
        do {
          f = Math.floor(Math.random() * FACES.length);
        } while (f === last);
        last = f;
        showPips(FACES[f] as number[]);
        buzz();
        setTimeout(step, 35 + i * i * 2.2);
      } else {
        showPips(J);
        buzz();
        done();
      }
    })();
  }

  // once everything has landed, say what it landed on
  const status = document.getElementById("die-status");
  function announce() {
    const tag = document.querySelector(".bar-tag")?.textContent?.replace(/\s+/g, " ").trim();
    if (status && tag) status.textContent = `Rolled: ${tag}`;
  }

  function roll() {
    if (rolling) return;
    const finalS = pick(SUBJECTS);
    const finalO = pick(OBJECTS);
    const finalL = likes.map((_, i) => nextLike(i));
    const finalW = pool.length > 1 ? dealWriting() : [];
    // the dice grid behind the splash rerolls too, in a pulse from the tagline
    document.dispatchEvent(new CustomEvent("diceroll"));

    if (reduce.matches) {
      buzz(); // no ticks to feel, so one
      for (const el of subjs) setText(el, finalS);
      for (const el of objs) setText(el, finalO);
      likes.forEach((el, i) => {
        setText(el, finalL[i] as string);
      });
      finalW.forEach((p, i) => {
        show(i, p);
      });
      rollCards(() => {});
      announce();
      return;
    }

    rolling = true;
    for (const d of dice) d.classList.add("rolling");
    let pending = 5 + likes.length;
    function settled() {
      if (--pending) return;
      for (const d of dice) d.classList.remove("rolling");
      rolling = false;
      announce();
    }
    // Every reel slows to a stop at its own pace, so they land one by one.
    spin(subjs, SUBJECTS, finalS, 14, 30, 1.8, settled);
    spin(objs, OBJECTS, finalO, 15, 30, 1.9, settled);
    rollCards(settled);
    rollPips(settled);
    if (finalW.length) spinWriting(finalW, settled);
    else settled();
    likes.forEach((el, i) => {
      spin([el], LIKES[i] ?? [], finalL[i] as string, 12 + i * 2, 35, 1.7 + i * 0.2, settled);
    });
  }
  // For whoever opens the console: a hello, and the die as a function.
  window.roll = () => {
    roll();
    return "🎲 rolling…";
  };
  console.log(
    "%calxjrvs%c  I CAN SEE YOU poking around. Hi! Type roll() to roll the die.\nThe source: https://github.com/alxjrvs/alxjrvs.github.io",
    "font: 700 16px system-ui; color: #f5d547; background: #14161f; padding: 2px 6px; border-radius: 4px",
    "font: 13px system-ui",
  );

  for (const d of dice) {
    d.addEventListener("click", roll);
    // a roll is likely coming: let the carousel fetch the screenshots it'll flick through
    const warm = () => cards?.dispatchEvent(new Event("rollsoon"));
    d.addEventListener("pointerenter", warm);
    d.addEventListener("focus", warm);
  }
})();
