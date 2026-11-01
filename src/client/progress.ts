// Reading progress, on a piece of writing: a thin line along the bottom of the
// floating header grows from left to right as you read through the words
// (#read). It follows the scroll directly, so reduced motion changes nothing.
(() => {
  const line = document.getElementById("read-progress");
  const body = document.getElementById("read");
  if (!line || !body) return;
  let queued = false;
  function update() {
    queued = false;
    const r = body?.getBoundingClientRect();
    if (!r || !line) return;
    // 0 when the words' top reaches the header, 1 when their end is on screen
    const start = r.top + scrollY - 72;
    const end = r.bottom + scrollY - innerHeight;
    const p = end > start ? (scrollY - start) / (end - start) : 1;
    line.style.setProperty("--read", String(Math.min(1, Math.max(0, p))));
  }
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  update();
})();
