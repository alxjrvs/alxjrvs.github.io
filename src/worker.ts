// The Worker entry: Astro's request handler, plus the Cron Trigger that runs
// EmDash's scheduled publishing and maintenance (wrangler.jsonc `triggers`).
//
// The CMS lives on its own hostname, admin.alxjrvs.com, which Cloudflare
// Access guards as a whole (Google, alxjrvs@gmail.com only). Anywhere else
// (alxjrvs.com, workers.dev, PR previews) EmDash's routes are sent there, so
// the public site never exposes the admin or its API. The one exception is
// uploaded media, which posts on the public site link to.
import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

const ADMIN_HOST = "admin.alxjrvs.com";
const PUBLIC_EMDASH = "/_emdash/api/media/file/";

type Fetch = (request: Request, env: unknown, ctx: unknown) => Response | Promise<Response>;

const fetch: Fetch = (request, env, ctx) => {
  const url = new URL(request.url);
  const isAdminHost = url.hostname === ADMIN_HOST;
  if (isAdminHost && url.pathname === "/") {
    return Response.redirect(`https://${ADMIN_HOST}/_emdash/admin/`, 302);
  }
  if (
    !isAdminHost &&
    url.pathname.startsWith("/_emdash") &&
    !url.pathname.startsWith(PUBLIC_EMDASH) &&
    url.hostname !== "localhost"
  ) {
    return Response.redirect(`https://${ADMIN_HOST}${url.pathname}${url.search}`, 302);
  }
  return (handler.fetch as unknown as Fetch)(request, env, ctx);
};

export default {
  ...handler,
  fetch,
  scheduled: createScheduledHandler(),
};
