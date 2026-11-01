// Mark the page as running JS before first paint, so JS-only styles (the
// hidden header on the home page) apply without a flash. Runs inline in <head>.
document.documentElement.classList.add("js");
