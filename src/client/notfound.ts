// The 404's encounter table: the button rolls a die with as many sides as the
// table has rows. The highlight runs down the rows, slowing like the die's
// other reels, and stops on one; the result is announced and its link
// focused, ready to follow. With reduced motion it just lands.
(() => {
  const box = document.getElementById("encounters");
  const button = box?.querySelector<HTMLButtonElement>(".encounter-roll");
  const rows = Array.from(box?.querySelectorAll<HTMLLIElement>(".encounter-table li") ?? []);
  const result = box?.querySelector<HTMLElement>(".encounter-result");
  if (!box || !button || !rows.length) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  button.hidden = false;
  let rolling = false;

  const light = (i: number) => {
    rows.forEach((r, j) => {
      r.classList.toggle("lit", j === i);
    });
  };
  function land(i: number) {
    light(i);
    rolling = false;
    button?.removeAttribute("aria-disabled");
    const link = rows[i]?.querySelector("a");
    if (result && link) result.textContent = `You rolled a ${i + 1}: ${link.textContent}.`;
    link?.focus({ preventScroll: true });
  }

  button.addEventListener("click", () => {
    if (rolling) return;
    const to = Math.floor(Math.random() * rows.length);
    if (reduce.matches) return land(to);
    rolling = true;
    button.setAttribute("aria-disabled", "true");
    if (result) result.textContent = "";
    // twice round, then on to the one it lands on; each tick a little slower
    const ticks = rows.length * 2 + to + 1;
    let k = 0;
    (function tick() {
      light(k % rows.length);
      k++;
      if (k >= ticks) return land(to);
      setTimeout(tick, 40 + (k / ticks) ** 3 * 260);
    })();
  });
})();
