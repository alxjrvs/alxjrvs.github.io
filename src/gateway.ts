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
export const MEDIA_PREFIX = "/_emdash/api/media/file/";
/** The widths `/_image` will make on the public site (the comic's srcset). */
export const IMAGE_WIDTHS = [480, 640, 960, 1280, 1600];

const TRACKING = /^(utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|_ga|_gl|ref)$/i;

export type Route =
  | { kind: "redirect"; location: string; status: 301 | 302 }
  | { kind: "not-found" }
  | { kind: "admin" }
  | { kind: "admin-home" }
  | {
      kind: "site";
      /** the URL to hand to Astro: always on the canonical origin */
      url: string;
      /** uploaded media, which never changes in place */
      media: boolean;
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
    // a public page, which on this host means the admin.
    return url.pathname.startsWith("/_") ? { kind: "admin" } : { kind: "admin-home" };
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
  let media = false;
  let search = cleanSearch(url.search);

  if (lower.startsWith("/_")) {
    if (lower.startsWith(MEDIA_PREFIX)) {
      media = true;
    } else if (lower.startsWith("/_astro/")) {
      // Astro's hashed build assets.
    } else if (lower === "/_image" || lower === "/_image/") {
      if (!imageAllowed(url.search)) return { kind: "not-found" };
      search = url.search;
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

/** One day to start; raise it once the zone's DNS has been reviewed. No preload. */
export const HSTS = "max-age=86400";
export const MEDIA_CACHE = "public, max-age=31536000, immutable";
