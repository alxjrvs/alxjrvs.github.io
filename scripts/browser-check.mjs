// Opens the site in a real browser and looks at what the unit tests cannot
// see. For each page below, at a phone and a laptop size, it:
//
//   - takes a screenshot into browser-check/ (CI uploads them);
//   - fails on an answer that is not 200, an error in the console, a page
//     wider than its window, or an accessibility violation axe rates serious
//     or critical;
//   - on the home page, reports (without failing) any section taller than
//     the window, since section snapping lets go of those (DESIGN.md §4).
//
// BASE_URL picks the site: a PR's preview in CI, http://localhost:4321 with
// `bun run dev`, or the live site by default.
//
//   bun add --no-save playwright@1.48.2 axe-core@4.10.2
//   bunx playwright install chromium
//   BASE_URL=http://localhost:4321 bun run check:browser
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const base = (process.env.BASE_URL ?? "https://alxjrvs.com").replace(/\/$/, "");
const out = "browser-check";
const sizes = [
  { name: "phone", width: 390, height: 844 },
  { name: "laptop", width: 1280, height: 720 },
];
// The sizes AGENTS.md asks for before anything is added to the home page.
const fitSizes = [
  [320, 568],
  [375, 667],
  [390, 844],
  [1280, 720],
];

const axe = await readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const problems = [];
const notes = [];

async function open(path, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // Someone else's script failing to load (the analytics beacon) is not
    // this site's problem.
    const from = m.location().url;
    if (from && !from.startsWith(base)) return;
    errors.push(from ? `${m.text()} (${from})` : m.text());
  });
  const response = await page.goto(base + path, { waitUntil: "networkidle" });
  return { context, page, errors, status: response?.status() ?? 0 };
}

// The pages: home, the Writing index, and the first piece it links to.
const paths = ["/", "/writing/"];
{
  const { context, page } = await open("/writing/", sizes[1]);
  const first = await page
    .locator('main a[href^="/writing/"]:not([href="/writing/"])')
    .first()
    .getAttribute("href")
    .catch(() => null);
  if (first) paths.push(first);
  await context.close();
}

for (const path of paths) {
  for (const size of sizes) {
    const where = `${path} (${size.name})`;
    const { context, page, errors, status } = await open(path, size);
    if (status !== 200) problems.push(`${where} answered ${status}.`);
    for (const e of errors) problems.push(`${where} logged an error: ${e}`);

    const wide = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (wide > 0) problems.push(`${where} is ${wide}px wider than its window.`);

    // Evaluated, not added as a script tag, so the page's CSP has no say.
    await page.evaluate(axe);
    const violations = await page.evaluate(async () => {
      const r = await globalThis.axe.run(document, {
        resultTypes: ["violations"],
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      });
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      }));
    });
    for (const v of violations) {
      const line = `${where}: ${v.id} (${v.impact}). ${v.help}: ${v.nodes.join(", ")}`;
      if (v.impact === "serious" || v.impact === "critical") problems.push(line);
      else notes.push(line);
    }

    const file = `${path.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "home"}-${size.name}.png`;
    await page.screenshot({ path: `${out}/${file}`, fullPage: true });
    await context.close();
  }
}

for (const [width, height] of fitSizes) {
  const { context, page } = await open("/", { width, height });
  const over = await page.evaluate(() =>
    [...document.querySelectorAll("section.screen")]
      .map((s) => ({
        name: s.id || s.getAttribute("aria-label") || "section",
        by: Math.round(s.scrollHeight - window.innerHeight),
      }))
      .filter((s) => s.by > 1),
  );
  for (const s of over)
    notes.push(`Home, ${width}×${height}: "${s.name}" is ${s.by}px taller than the window.`);
  await context.close();
}

await browser.close();

const list = (items) => items.map((i) => `- ${i}`).join("\n");
const report = [
  `## Browser check: ${base}`,
  problems.length ? `### Problems\n\n${list(problems)}` : "No problems.",
  notes.length ? `### Worth knowing\n\n${list(notes)}` : "",
]
  .filter(Boolean)
  .join("\n\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY)
  await writeFile(process.env.GITHUB_STEP_SUMMARY, `${report}\n`, { flag: "a" });
process.exit(problems.length ? 1 : 0);
