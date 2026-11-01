// Captures a fresh screenshot of every project's live site.
//
// Reads `link` from each src/content/projects/<name>.md and writes two WebPs of it:
// public/assets/work/<name>.webp at 1280×800 and <name>-640.webp at
// 640×400, which the cards pick between with srcset. Run by
// .github/workflows/screenshots.yml; locally: `bun add --no-save
// playwright@1.48.2 sharp@0.33 && bunx playwright install chromium && bun run
// screenshots`.
//
// With ONLY_MISSING=1 (how PR runs call it) it skips projects that already
// have a screenshot, so a PR only gains shots for new projects. Re-captures
// never match byte for byte, and a bot commit on a PR leaves its head with no
// CI run, which blocks the merge.
import { access, readdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const dir = "src/content/projects";
const projects = [];
for (const file of await readdir(dir)) {
  if (!file.endsWith(".md")) continue;
  const text = await readFile(`${dir}/${file}`, "utf8");
  const link = text.match(/^link:\s*(\S+)/m)?.[1];
  const name = file.replace(/\.md$/, "");
  if (
    process.env.ONLY_MISSING &&
    (await access(`public/assets/work/${name}.webp`).then(
      () => true,
      () => false,
    ))
  )
    continue;
  if (link) projects.push({ name, link });
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
