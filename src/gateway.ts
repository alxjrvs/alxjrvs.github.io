// What the Worker's front door (src/worker.ts) does with a request, as a pure
// function so it can be tested without the Workers runtime (gateway.test.ts).
//
// Every public request is normalised before it reaches Astro and the Workers
// cache, which keys on the path alone (not the scheme, host or headers):
//
// - plain http on alxjrvs.com is redirected to https;
// - the path is decoded and `//` collapsed, so `//_emdash` or `/%5Femdash`
//   can't slip past the checks below;
// - EmDash and Astro's own routes (everything under `/_`) are refused on the
//   public hostnames, except uploaded media, Astro's assets and `/_image` at
//   the widths the site uses; the rest of `/_emdash` goes to the admin host;
// - the request is rebuilt as https://alxjrvs.com + path, without tracking
//   parameters, so a page cached from workers.dev or plain http never carries
//   those origins in its links, and `?fbclid=…` doesn't miss the cache.

export const CANONICAL_HOST = "alxjrvs.com";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;
export const ADMIN_HOST = "admin.alxjrvs.com";
/** code.alxjrvs.com is a short, printable link to GitHub (it's on the business cards). */
export const CODE_HOST = "code.alxjrvs.com";
export const CODE_TARGET = "https://github.com/alxjrvs";
export const MEDIA_PREFIX = "/_emdash/api/media/file/";
/** The widths `/_image` will make on the public site (the comic's srcset). */
export const IMAGE_WIDTHS = [480, 640, 960, 1280, 1600];

// Paths only a vulnerability scanner asks for. There is no PHP, WordPress or
// dotfile here, so they get a plain 404 without rendering the 404 page (which
// reads the database for its encounter table).
const SCANNER =
  /\.(php\d?|aspx?|jsp|cgi|env|sql|bak|ya?ml|ini)$|^\/(wp-|wordpress|cgi-bin|vendor\/|phpmyadmin)|\/\.(git|env|aws|ssh|svn|vscode|DS_Store)/i;

// `_preview` is here too: a draft's preview link only works on the admin
// host (below), so on the public site the token is dropped and the page is
// the ordinary, published, cached one.
const TRACKING = /^(utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|_ga|_gl|ref|_preview)$/i;

export type Route =
  | { kind: "redirect"; location: string; status: 301 | 302 }
  | { kind: "not-found" }
  | { kind: "admin" }
  | { kind: "admin-home" }
  /** a draft's preview link: a public page, rendered on the admin host */
  | { kind: "preview" }
  | {
      kind: "site";
      /** the URL to hand to Astro: always on the canonical origin */
      url: string;
      /** uploaded media, which never changes in place */
      media: boolean;
      /** a resized copy of uploaded media (`/_image`), which doesn't either */
      image: boolean;
      /** a host other than alxjrvs.com (workers.dev, a PR preview) */
      noindex: boolean;
      /** alxjrvs.com over https, where HSTS belongs */
      hsts: boolean;
    }
  | { kind: "dev" };

/** The path as the router should judge it: decoded, with runs of `/` collapsed. */
export function normalisePath(pathname: string): string {
  let p = pathname;
  // Decode until stable (so %255F can't hide a %5F), but never past garbage.
  for (let i = 0; i < 3; i++) {
    let next: string;
    try {
      next = decodeURIComponent(p);
    } catch {
      break;
    }
    if (next === p) break;
    p = next;
  }
  p = p.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  return p.startsWith("/") ? p : `/${p}`;
}

/** The query string minus tracking parameters ("" when nothing is left). */
export function cleanSearch(search: string): string {
  const params = new URLSearchParams(search);
  for (const key of [...params.keys()]) if (TRACKING.test(key)) params.delete(key);
  const out = params.toString();
  return out ? `?${out}` : "";
}

function imageAllowed(search: string): boolean {
  const params = new URLSearchParams(search);
  const w = Number(params.get("w"));
  const href = params.get("href") ?? "";
  return IMAGE_WIDTHS.includes(w) && href.startsWith(MEDIA_PREFIX);
}

export function route(rawUrl: string): Route {
  const url = new URL(rawUrl);
  const host = url.hostname;

  if (host === ADMIN_HOST) {
    // EmDash and Astro's own endpoints all start with "/_"; anything else is
    // a public page, which on this host means the admin. The one exception
    // is the admin's Preview button, which opens the piece's own URL here
    // with a signed `_preview` token: that page is rendered, behind Access
    // like everything else on this host, and never cached.
    if (url.pathname.startsWith("/_")) return { kind: "admin" };
    return url.searchParams.has("_preview") ? { kind: "preview" } : { kind: "admin-home" };
  }
  if (host === CODE_HOST) {
    // 302, not 301: browsers keep a 301 forever, and the target may move.
    // A path carries over, so code.alxjrvs.com/vellum is that repo.
    const path = normalisePath(url.pathname);
    return {
      kind: "redirect",
      location: path === "/" ? CODE_TARGET : `${CODE_TARGET}${path}`,
      status: 302,
    };
  }
  if (host === "localhost" || host === "127.0.0.1") return { kind: "dev" };

  const isApex = host === CANONICAL_HOST;
  if (isApex && url.protocol === "http:") {
    return {
      kind: "redirect",
      location: `${CANONICAL_ORIGIN}${url.pathname}${url.search}`,
      status: 301,
    };
  }

  const path = normalisePath(url.pathname);
  const lower = path.toLowerCase();
  if (SCANNER.test(path)) return { kind: "not-found" };
  let media = false;
  let image = false;
  let search = cleanSearch(url.search);

  if (lower.startsWith("/_")) {
    if (lower.startsWith(MEDIA_PREFIX)) {
      media = true;
    } else if (lower.startsWith("/_astro/")) {
      // Astro's hashed build assets.
    } else if (lower === "/_image" || lower === "/_image/") {
      if (!imageAllowed(url.search)) return { kind: "not-found" };
      search = url.search;
      image = true;
    } else if (lower.startsWith("/_emdash")) {
      return {
        kind: "redirect",
        location: `https://${ADMIN_HOST}${path}${url.search}`,
        status: 302,
      };
    } else {
      return { kind: "not-found" };
    }
  }

  return {
    kind: "site",
    url: `${CANONICAL_ORIGIN}${path}${search}`,
    media,
    image,
    noindex: !isApex,
    hsts: isApex,
  };
}

/** Headers every public HTML response gets (static assets get theirs from public/_headers). */
export const SECURITY_HEADERS: Record<string, string> = {
  // A baseline that can't break the page: no framing, no <base> or plugin
  // tricks, forms only post here. Scripts and styles aren't restricted yet.
  "Content-Security-Policy":
    "frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

/** Thirty days, on this host only (no includeSubDomains, no preload). */
export const HSTS = "max-age=2592000";
export const MEDIA_CACHE = "public, max-age=31536000, immutable";

// A terminal asking for the home page (curl, Wget, HTTPie, xh) gets a short
// plain-text hello instead of a wall of HTML. Browsers, and anyone asking
// for HTML by name, get the site.
const TERMINALS = /^(curl|wget|httpie|xh)\//i;

export function terminalHello(path: string, userAgent: string, accept: string): string | undefined {
  if (path !== "/" || !TERMINALS.test(userAgent) || /text\/html/i.test(accept)) return undefined;
  return [
    "",
    "  alxjrvs  :  Alex Jarvis makes stuff.",
    "",
    "  I CAN SEE YOU (and your terminal). Hi.",
    "",
    `  projects   ${CANONICAL_ORIGIN}/#projects`,
    `  writing    ${CANONICAL_ORIGIN}/writing/`,
    `  feed       ${CANONICAL_ORIGIN}/feed.xml`,
    `  for bots   ${CANONICAL_ORIGIN}/llms.txt`,
    "  code       https://github.com/alxjrvs",
    "",
    "  Want dice in here too? https://randsum.dev",
    "",
  ].join("\n");
}
