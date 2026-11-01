// Every internal link, image, stylesheet and script in the build resolves to
// a file in ./dist, and every #fragment to an id on its page. Replaces the
// html-proofer run from the Jekyll days. Run after `bun run build`.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = "dist";
const SITE = "https://alxjrvs.com";

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

// The file a URL path is served from, if any (as Cloudflare's
// auto-trailing-slash handling resolves it).
function resolve(path: string): string | null {
  const clean = decodeURIComponent(path);
  const candidates = clean.endsWith("/")
    ? [join(DIST, clean, "index.html")]
    : [join(DIST, clean), join(DIST, `${clean}.html`), join(DIST, clean, "index.html")];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

const ids = (html: string) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const pages = htmlFiles(DIST);
const problems: string[] = [];

for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const pagePath = `/${relative(DIST, page).replace(/index\.html$/, "")}`;
  const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1] ?? "");
  for (const srcset of html.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const part of (srcset[1] ?? "").split(",")) refs.push(part.trim().split(/\s+/)[0] ?? "");
  }
  for (const raw of refs) {
    let ref = raw.startsWith(SITE) ? raw.slice(SITE.length) || "/" : raw;
    if (/^(?:[a-z]+:|\/\/)/i.test(ref)) continue; // external
    if (ref.startsWith("#")) ref = pagePath + ref;
    if (!ref.startsWith("/")) ref = new URL(ref, `${SITE}${pagePath}`).pathname;
    const [pathAndQuery = "", hash] = ref.split("#");
    const path = pathAndQuery.split("?")[0] ?? "";
    const target = resolve(path);
    if (!target) {
      problems.push(`${page}: ${raw} → no file for ${path}`);
      continue;
    }
    if (hash && target.endsWith(".html") && !ids(readFileSync(target, "utf8")).has(hash)) {
      problems.push(`${page}: ${raw} → no #${hash} on ${path}`);
    }
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n✗ ${problems.length} broken link(s)`);
  process.exit(1);
}
console.log(`✓ links: ${pages.length} pages, every internal reference resolves`);
