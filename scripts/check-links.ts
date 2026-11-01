// Every internal link, image, stylesheet and script resolves, and every
// #fragment points at an id on its page. Pages render in the Worker now, so
// this crawls a running copy of the site, starting from the home page and
// the writing archive: by default it builds nothing and starts
// `astro preview` itself (run `bun run build` first). Point it at another
// copy with BASE=http://…
import { spawn, spawnSync } from "node:child_process";

const SITE = "https://alxjrvs.com";
const PORT = 4391;
const external = process.env.BASE;
const BASE = (external ?? `http://localhost:${PORT}`).replace(/\/$/, "");

const preview = external
  ? undefined
  : spawn("bunx", ["astro", "preview", "--port", String(PORT)], { stdio: "ignore" });

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(BASE);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Nothing answered at ${BASE}`);
}

const ids = (html: string) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

// path → its HTML (or "" for a non-HTML file), or null if it didn't resolve
const seen = new Map<string, Promise<string | null>>();
function get(path: string): Promise<string | null> {
  let page = seen.get(path);
  if (!page) {
    page = fetch(BASE + path).then(async (res) => {
      if (!res.ok) return null;
      return res.headers.get("content-type")?.includes("text/html") ? res.text() : "";
    });
    seen.set(path, page);
  }
  return page;
}

const problems: string[] = [];
const crawled = new Set<string>();

async function crawl(pagePath: string): Promise<void> {
  if (crawled.has(pagePath)) return;
  crawled.add(pagePath);
  const html = await get(pagePath);
  if (!html) {
    if (html === null) problems.push(`${pagePath} doesn't load`);
    return;
  }
  const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1] ?? "");
  for (const srcset of html.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const part of (srcset[1] ?? "").split(",")) refs.push(part.trim().split(/\s+/)[0] ?? "");
  }
  const next: string[] = [];
  for (const raw of refs) {
    let ref = raw.replaceAll("&amp;", "&");
    ref = ref.startsWith(SITE) ? ref.slice(SITE.length) || "/" : ref;
    if (/^(?:[a-z]+:|\/\/)/i.test(ref)) continue; // external
    if (ref.startsWith("#")) ref = pagePath + ref;
    if (!ref.startsWith("/")) ref = new URL(ref, `${SITE}${pagePath}`).pathname;
    const [path = "", hash] = ref.split("#");
    const target = await get(path);
    if (target === null) {
      problems.push(`${pagePath}: ${raw} → ${path} doesn't load`);
      continue;
    }
    if (hash && target && !ids(target).has(hash)) {
      problems.push(`${pagePath}: ${raw} → no #${hash} on ${path}`);
    }
    if (target) next.push(path.split("?")[0] ?? path);
  }
  for (const path of next) await crawl(path);
}

try {
  await waitForServer();
  await crawl("/");
  await crawl("/writing/");
} finally {
  // `astro preview` hands the server off to a background process.
  if (preview) {
    preview.kill();
    spawnSync("bunx", ["astro", "preview", "stop"], { stdio: "ignore" });
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n✗ ${problems.length} broken link(s)`);
  process.exit(1);
}
console.log(`✓ links: ${crawled.size} pages, every internal reference resolves`);
