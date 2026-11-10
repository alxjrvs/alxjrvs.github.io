// Captures a fresh screenshot of every project's live site.
//
// Reads every project from the live site's /projects.json (they live in
// EmDash now; PROJECTS_URL overrides it) and writes two WebPs of each one's
// site: public/assets/work/<slug>.webp at 1280×800 and <slug>-640.webp at
// 640×400, which the cards pick between with srcset (set the project's
// "Screenshot name" in the CMS to its slug once the file has landed). Run by
// .github/workflows/screenshots.yml; locally: `bun add --no-save
// playwright@1.48.2 sharp@0.33 && bunx playwright install chromium && bun run
// screenshots`.
//
// A capture replaces the committed one only when the picture really changed:
// a site that answers with an error is refused, and a re-capture that differs
// in under 2% of its pixels (re-encoding noise, a die that landed elsewhere,
// a clock) is thrown away. Every commit here is a production deploy, so a
// night when nothing changed should not make one.
//
// With ONLY_MISSING=1 it skips projects that already have a screenshot.
// Re-captures never match byte for byte, and a bot commit on a PR leaves its
// head with no CI run, which blocks the merge.
import { access, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const source = process.env.PROJECTS_URL || "https://alxjrvs.com/projects.json";
const res = await fetch(source);
if (!res.ok) throw new Error(`${source}: ${res.status}`);
const projects = [];
for (const { slug, link } of await res.json()) {
  if (
    process.env.ONLY_MISSING &&
    (await access(`public/assets/work/${slug}.webp`).then(
      () => true,
      () => false,
    ))
  )
    continue;
  if (link) projects.push({ name: slug, link });
}

/** The share of pixels (0 to 1) that visibly differ between two same-sized images. */
async function changed(a, b) {
  const raw = (img) => sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const [x, y] = await Promise.all([raw(a), raw(b)]);
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return 1;
  let n = 0;
  for (let i = 0; i < x.data.length; i += 3) {
    const d =
      Math.abs(x.data[i] - y.data[i]) +
      Math.abs(x.data[i + 1] - y.data[i + 1]) +
      Math.abs(x.data[i + 2] - y.data[i + 2]);
    if (d > 48) n++;
  }
  return n / (x.data.length / 3);
}
const THRESHOLD = 0.02;

const browser = await chromium.launch();
let failed = 0;
for (const { name, link } of projects) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
  });
  try {
    const response = await page.goto(link, { waitUntil: "networkidle", timeout: 45_000 });
    // Never file a picture of an error page as the project.
    if (!response?.ok()) throw new Error(`answered ${response?.status() ?? "nothing"}`);
    await page.waitForTimeout(1500); // let fonts and entrance animations settle
    const png = await page.screenshot();
    const full = `public/assets/work/${name}.webp`;
    const webp = await sharp(png).webp({ quality: 82 }).toBuffer();
    const before = await readFile(full).catch(() => undefined);
    const diff = before ? await changed(before, webp) : 1;
    if (diff < THRESHOLD) {
      console.log(
        `= ${name}: ${(diff * 100).toFixed(2)}% of pixels changed, keeping the old capture`,
      );
      continue;
    }
    await writeFile(full, webp);
    await sharp(png)
      .resize(640)
      .webp({ quality: 82 })
      .toFile(`public/assets/work/${name}-640.webp`);
    console.log(`✓ ${name} ← ${link} (${(diff * 100).toFixed(1)}% of pixels changed)`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name} ← ${link}: ${err.message}`);
  } finally {
    await page.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
