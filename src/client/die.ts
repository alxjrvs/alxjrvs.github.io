// The die. Either copy of it (the splash corner or the header) re-rolls the
// page: the tagline spins slot-machine style, the project cards shuffle, and
// About picks three new things I like. Every one of them rolls through
// options, slowing down until it settles.
//
// The word lists come from EmDash's Randomizers, rendered into #roll-data by the page.
(() => {
  const dataEl = document.getElementById("roll-data");
  if (!dataEl?.textContent) return;
  const data = JSON.parse(dataEl.textContent) as {
    subjects: string[];
    objects: string[];
    rare: string;
    rareOdds: number;
    likes: string[][];
  };
  const SUBJECTS = data.subjects;
  const OBJECTS = data.objects;
  const RARE = data.rare;
  const RARE_ODDS = data.rareOdds || 50;
  const LIKES = data.likes;
  const dice = Array.from(document.querySelectorAll<HTMLElement>(".die-btn"));
  const subjs = Array.from(document.querySelectorAll<HTMLElement>(".roll-subject"));
  const objs = Array.from(document.querySelectorAll<HTMLElement>(".roll-object"));
  const cards = document.querySelector<HTMLElement>(".cards");
  const likes = Array.from(document.querySelectorAll<HTMLElement>("#likes .like"));
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

  // A reel's label, plus any punctuation that rides along with it (the
  // tagline's full stops are part of their word). A word that already ends
  // in its punctuation, like the rare roll, keeps it.
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

  // Reorder the project cards, sliding each from where it is now to its new
  // spot.
  function place(container: HTMLElement, order: Element[], duration?: number) {
    const items = Array.from(container.children);
    const before = items.map((el) => el.getBoundingClientRect());
    for (const el of items) for (const an of el.getAnimations()) an.cancel();
    for (const el of order) container.appendChild(el);
    if (reduce.matches) return;
    items.forEach((el, i) => {
      const now = el.getBoundingClientRect();
      const was = before[i] as DOMRect;
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (!dx && !dy) return;
      el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], {
        duration: duration ?? 0,
        easing: "cubic-bezier(.2,.8,.2,1)",
      });
    });
  }
  // The cards' reel: a few quick shuffles, each slower than the last, then a
  // final one that eases into place.
  // (on phones the carousel steps aside while they shuffle; see carousel.ts)
  function rollCards(finish: () => void) {
    if (!cards) return finish();
    const container = cards;
    container.dispatchEvent(new Event("shufflestart"));
    const done = () => {
      container.dispatchEvent(new Event("shuffleend"));
      finish();
    };
    const final = shuffle(Array.from(container.children));
    if (reduce.matches) {
      place(container, final);
      return done();
    }
    const ticks = 7;
    let i = 0;
    (function step() {
      i++;
      if (i < ticks) {
        const wait = 140 + i * i * 9;
        place(container, shuffle(Array.from(container.children)), wait + 60);
        setTimeout(step, wait);
      } else {
        place(container, final, 700);
        setTimeout(done, 700);
      }
    })();
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
        setTimeout(step, 35 + i * i * 2.2);
      } else {
        showPips(J);
        done();
      }
    })();
  }

  function roll() {
    if (rolling) return;
    // now and then the subject lands on the rare roll instead
    const finalS = RARE && Math.random() * RARE_ODDS < 1 ? RARE : pick(SUBJECTS);
    const finalO = pick(OBJECTS);
    const finalL = likes.map((_, i) => nextLike(i));
    // the dice grid behind the splash rerolls too, in a pulse from the tagline
    document.dispatchEvent(new CustomEvent("diceroll"));

    if (reduce.matches) {
      for (const el of subjs) setText(el, finalS);
      for (const el of objs) setText(el, finalO);
      likes.forEach((el, i) => {
        setText(el, finalL[i] as string);
      });
      rollCards(() => {});
      return;
    }

    rolling = true;
    for (const d of dice) d.classList.add("rolling");
    let pending = 4 + likes.length;
    function settled() {
      if (--pending) return;
      for (const d of dice) d.classList.remove("rolling");
      rolling = false;
    }
    // Every reel slows to a stop at its own pace, so they land one by one.
    spin(subjs, SUBJECTS, finalS, 14, 30, 1.8, settled);
    spin(objs, OBJECTS, finalO, 15, 30, 1.9, settled);
    rollCards(settled);
    rollPips(settled);
    likes.forEach((el, i) => {
      spin([el], LIKES[i] ?? [], finalL[i] as string, 12 + i * 2, 35, 1.7 + i * 0.2, settled);
    });
  }
  for (const d of dice) d.addEventListener("click", roll);
})();
