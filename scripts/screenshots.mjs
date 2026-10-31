// Captures a fresh screenshot of every project's live site.
//
// Reads `link` from each _projects/<name>.md and writes two WebPs of it:
// assets/work/<name>.webp at 1280×800 and assets/work/<name>-640.webp at
// 640×400, which the cards pick between with srcset. Run by
// .github/workflows/screenshots.yml; locally: `npm i --no-save
// playwright@1.48.2 sharp@0.33 && npx playwright install chromium && node
// scripts/screenshots.mjs`.
import { readdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const dir = "_projects";
const projects = [];
for (const file of await readdir(dir)) {
  if (!file.endsWith(".md")) continue;
  const text = await readFile(`${dir}/${file}`, "utf8");
  const link = text.match(/^link:\s*(\S+)/m)?.[1];
  if (link) projects.push({ name: file.replace(/\.md$/, ""), link });
}

const browser = await chromium.launch();
let failed = 0;
for (const { name, link } of projects) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
  try {
    await page.goto(link, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForTimeout(1500); // let fonts and entrance animations settle
    const png = await page.screenshot();
    await sharp(png).webp({ quality: 82 }).toFile(`assets/work/${name}.webp`);
    await sharp(png).resize(640).webp({ quality: 82 }).toFile(`assets/work/${name}-640.webp`);
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
