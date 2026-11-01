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
// With ONLY_MISSING=1 it skips projects that already have a screenshot.
// Re-captures never match byte for byte, and a bot commit on a PR leaves its
// head with no CI run, which blocks the merge.
import { access } from "node:fs/promises";
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

const browser = await chromium.launch();
let failed = 0;
for (const { name, link } of projects) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
  });
  try {
    await page.goto(link, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForTimeout(1500); // let fonts and entrance animations settle
    const png = await page.screenshot();
    await sharp(png).webp({ quality: 82 }).toFile(`public/assets/work/${name}.webp`);
    await sharp(png)
      .resize(640)
      .webp({ quality: 82 })
      .toFile(`public/assets/work/${name}-640.webp`);
    console.log(`✓ ${name} ← ${link}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name} ← ${link}: ${err.message}`);
  } finally {
    await page.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
