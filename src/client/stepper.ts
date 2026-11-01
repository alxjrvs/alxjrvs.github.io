// ← → and sideways swipes, for the steppers (components/Stepper.astro): they
// press Back or Next on the one marked data-keys. On a comic that's its pages
// (and, past either end, the neighbouring part of its thread); on a piece in a
// thread it's the thread's parts. One mechanism for both, so a comic, a
// thread, and a comic in a thread all read the same way.
(() => {
  const press = (step: 1 | -1) => {
    const nav = document.querySelector<HTMLElement>("[data-stepper][data-keys]");
    if (!nav || nav.hidden) return false;
    const control = nav.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (!control || control.hasAttribute("aria-disabled")) return false;
    control.click();
    return true;
  };

  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return;
    // leave arrows to whatever else uses them: form fields, code and tables
    // that scroll sideways, and a selection being extended
    if ((e.target as Element).closest("input, textarea, select, [contenteditable], pre, table"))
      return;
    if (!document.getSelection()?.isCollapsed) return;
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step && press(step)) e.preventDefault();
  });

  // A sideways swipe on a [data-swipe] area; mostly-vertical ones just scroll.
  let x0 = 0;
  let y0 = 0;
  for (const area of document.querySelectorAll<HTMLElement>("[data-swipe]")) {
    area.addEventListener(
      "touchstart",
      (e) => {
        const t = e.changedTouches[0];
        if (t) [x0, y0] = [t.clientX, t.clientY];
      },
      { passive: true },
    );
    area.addEventListener(
      "touchend",
      (e) => {
        const t = e.changedTouches[0];
        if (!t) return;
        const dx = t.clientX - x0;
        const dy = t.clientY - y0;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) press(dx < 0 ? 1 : -1);
      },
      { passive: true },
    );
  }
})();
