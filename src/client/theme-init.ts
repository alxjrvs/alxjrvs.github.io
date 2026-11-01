// Set the theme before first paint, so there's no flash of the wrong mode:
// a saved override if there is one, otherwise the visitor's system setting
// (dark unless the OS asks for light). Runs inline in <head>.
(() => {
  const root = document.documentElement;
  root.classList.add("js");
  try {
    let t = localStorage.getItem("theme");
    if (t !== "light" && t !== "dark") {
      t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    root.setAttribute("data-theme", t);
  } catch {}
})();
