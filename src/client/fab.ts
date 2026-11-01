// The floating menu on a piece, on phones. Once the title has docked and
// taken the whole header (client/title.ts), the header's controls wait here,
// in a round button at the bottom right: the nav, Back and Next, the die and
// back to top. It tucks away while you read on down the page and comes back
// as soon as you scroll up, stop near the end, or open it. Escape, a tap
// outside it, or scrolling back up to the title closes it.
(() => {
  const fab = document.getElementById("fab");
  const btn = fab?.querySelector<HTMLButtonElement>(".fab-btn");
  const panel = document.getElementById("fab-panel");
  if (!fab || !btn || !panel) return;
  const body = document.body;

  function open(on: boolean, refocus = false) {
    if (!fab || !btn || !panel) return;
    if (on === !panel.hidden) return;
    panel.hidden = !on;
    btn.setAttribute("aria-expanded", String(on));
    btn.setAttribute("aria-label", on ? "Close menu" : "Menu");
    fab.classList.toggle("open", on);
    if (on) {
      fab.classList.remove("tucked");
      panel.querySelector<HTMLElement>("a[href], button")?.focus({ preventScroll: true });
    } else if (refocus) btn.focus({ preventScroll: true });
  }

  btn.addEventListener("click", () => open(panel.hidden !== false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) open(false, true);
  });
  // a tap anywhere else closes it (pointerdown, so the die's haptic click, which
  // is a synthetic click on a hidden switch, never counts as one)
  document.addEventListener("pointerdown", (e) => {
    if (!panel.hidden && !fab.contains(e.target as Node)) open(false);
  });
  // focus leaving the menu (tabbing on past it) closes it too
  fab.addEventListener("focusout", (e) => {
    if (!panel.hidden && e.relatedTarget instanceof Node && !fab.contains(e.relatedTarget))
      open(false);
  });
  panel.querySelector(".fab-top")?.addEventListener("click", (e) => {
    e.preventDefault();
    open(false);
    scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  });

  let lastY = scrollY;
  addEventListener(
    "scroll",
    () => {
      const y = scrollY;
      if (!body.classList.contains("titled")) open(false);
      else if (panel.hidden) {
        const nearEnd = y + innerHeight > document.documentElement.scrollHeight - 160;
        if (y > lastY + 6 && !nearEnd) fab.classList.add("tucked");
        else if (y < lastY - 6 || nearEnd) fab.classList.remove("tucked");
      }
      if (Math.abs(y - lastY) > 6) lastY = y;
    },
    { passive: true },
  );
})();
