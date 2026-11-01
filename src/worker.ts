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
// Caching: Workers Cache keys on the path, not the hostname, so if it sat in
// front of this entry, a cached alxjrvs.com/ would be served for
// admin.alxjrvs.com/ without this code ever running. So the default entry
// is uncached (wrangler.jsonc `exports`) and always runs; public pages go
// through the `Site` entrypoint, which is cached, and the admin host never
// touches the cache.
import { WorkerEntrypoint } from "cloudflare:workers";
import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

const ADMIN_HOST = "admin.alxjrvs.com";
const PUBLIC_EMDASH = "/_emdash/api/media/file/";

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
  const url = new URL(request.url);
  if (url.hostname === ADMIN_HOST) {
    // EmDash and Astro's own endpoints all start with "/_"; anything else is
    // a public page.
    if (!url.pathname.startsWith("/_")) {
      return noStore(Response.redirect(`https://${ADMIN_HOST}/_emdash/admin/`, 302));
    }
    return noStore(await astro(request, env, ctx));
  }
  if (
    url.pathname.startsWith("/_emdash") &&
    !url.pathname.startsWith(PUBLIC_EMDASH) &&
    url.hostname !== "localhost"
  ) {
    return Response.redirect(`https://${ADMIN_HOST}${url.pathname}${url.search}`, 302);
  }
  return ctx.exports.Site.fetch(request);
};

export default {
  ...handler,
  fetch,
  scheduled: createScheduledHandler(),
};
