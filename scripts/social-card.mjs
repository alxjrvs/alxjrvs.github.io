// Renders the social preview card (scripts/social-card.html) to
// assets/social.png at 1200×630, the size Open Graph and Twitter expect.
// Re-run it after changing the palette, wordmark or tagline:
// `node scripts/social-card.mjs` (needs Playwright's Chromium).
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const src = new URL("./social-card.html", import.meta.url);
const out = fileURLToPath(new URL("../assets/social.png", import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(src.href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
console.log(`✓ ${out}`);
