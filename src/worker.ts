// The Worker entry: Astro's request handler, plus the Cron Trigger that runs
// EmDash's scheduled publishing and maintenance (wrangler.jsonc `triggers`).
//
// The CMS lives on its own hostname, admin.alxjrvs.com, which Cloudflare
// Access guards as a whole (Google, alxjrvs@gmail.com only). Anywhere else
// (alxjrvs.com, workers.dev, PR previews) EmDash's routes are sent there, so
// the public site never exposes the admin or its API. The one exception is
// uploaded media, which posts on the public site link to. On the admin host,
// every page of the public site (/, /writing/, …) sends you to the admin.
//
// Everything else on the public hostnames is normalised first (src/gateway.ts):
// http goes to https, paths are decoded so `//_emdash` can't sneak past, and
// the request is rebuilt on https://alxjrvs.com without tracking parameters.
//
// Caching: Workers Cache keys on the path, not the hostname, so if it sat in
// front of this entry, a cached alxjrvs.com/ would be served for
// admin.alxjrvs.com/ without this code ever running. So the default entry
// is uncached (wrangler.jsonc `exports`) and always runs; public pages go
// through the `Site` entrypoint, which is cached, and the admin host never
// touches the cache.
import { WorkerEntrypoint } from "cloudflare:workers";
import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";
import { ADMIN_HOST, HSTS, MEDIA_CACHE, route, SECURITY_HEADERS } from "./gateway";

export { PluginBridge };

type Fetch = (request: Request, env: unknown, ctx: unknown) => Response | Promise<Response>;
const astro = handler.fetch as unknown as Fetch;

interface GatewayContext {
  exports: { Site: { fetch(request: Request): Promise<Response> } };
}

// Response headers that would let a cache keep a copy.
const CACHE_HEADERS = ["Cloudflare-CDN-Cache-Control", "CDN-Cache-Control", "Cache-Tag"];

function noStore(response: Response): Response {
  if (response.status === 101) return response; // a WebSocket upgrade
  const out = new Response(response.body, response);
  for (const name of CACHE_HEADERS) out.headers.delete(name);
  out.headers.set("Cache-Control", "private, no-store");
  return out;
}

/** The public site, behind Workers Cache. */
export class Site extends WorkerEntrypoint {
  override fetch(request: Request): Response | Promise<Response> {
    return astro(request, this.env, this.ctx);
  }
}

const fetch = async (request: Request, env: unknown, ctx: GatewayContext): Promise<Response> => {
  const r = route(request.url);
  switch (r.kind) {
    case "admin-home":
      return noStore(Response.redirect(`https://${ADMIN_HOST}/_emdash/admin/`, 302));
    case "admin":
      return noStore(await astro(request, env, ctx));
    case "dev":
      return ctx.exports.Site.fetch(request);
    case "redirect":
      return Response.redirect(r.location, r.status);
    case "not-found":
      return new Response("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    case "site": {
      const response = await ctx.exports.Site.fetch(new Request(r.url, request));
      if (response.status === 101) return response;
      const out = new Response(response.body, response);
      // EmDash's timings describe its internals, and would be cached with the page.
      out.headers.delete("Server-Timing");
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(name, value);
      if (r.hsts) out.headers.set("Strict-Transport-Security", HSTS);
      if (r.noindex) out.headers.set("X-Robots-Tag", "noindex");
      // Uploaded media is stored under a fresh id, so it never changes in place.
      if (r.media && response.status === 200) out.headers.set("Cache-Control", MEDIA_CACHE);
      return out;
    }
  }
};

export default {
  ...handler,
  fetch,
  scheduled: createScheduledHandler(),
};
