import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import react from "@astrojs/react";
import { access, d1, r2 } from "@emdash-cms/cloudflare";
import { readFile } from "node:fs/promises";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { type Plugin, transformWithOxc } from "vite";

// `import js from "../client/x.ts?inline-script"` gives the file compiled to
// plain JavaScript, as a string, for <InlineScript>. Compiled here, at build
// time, because the pages render in the Worker, where the compiler can't run.
function inlineScripts(): Plugin {
  const SUFFIX = "?inline-script";
  return {
    name: "alxjrvs:inline-script",
    enforce: "pre",
    async load(id) {
      if (!id.endsWith(SUFFIX)) return null;
      const file = id.slice(0, -SUFFIX.length);
      this.addWatchFile(file);
      const { code } = await transformWithOxc(await readFile(file, "utf8"), file, { lang: "ts" });
      return `export default ${JSON.stringify(code)};`;
    },
  };
}

// Every page renders on request (all its words come from EmDash) and then
// sits in the Workers cache. EmDash purges a collection's tag whenever
// something in it is published or changed, so an edit shows up within
// seconds. "all" is never purged automatically: it's the emergency switch.
// The cache is kept short anyway, so a missed purge (a change written
// straight to the database, say) shows up within a minute: a copy is fresh
// for a minute, then the next visit gets it once more while a new one renders
// behind it. A long stale window keeps rarely visited pages fast without
// making them any less fresh than that.
const cached = {
  maxAge: 60,
  swr: 86400,
  tags: ["posts", "projects", "sections", "randomizers", "all"],
};

// Stamped into the stylesheet and favicon URLs (`?v=`), once per build, so a
// deploy's CSS is never hidden behind a cached copy and browsers can keep it
// otherwise.
const BUILD_ID = Date.now().toString(36);

// alxjrvs.com: an Astro site on the `alxjrvs` Worker (wrangler.jsonc).
// Static files in public/ are served as assets, without running the Worker.
// Every word on the site comes from EmDash, whose admin is served at
// admin.alxjrvs.com, behind Cloudflare Access (see src/worker.ts and README).
export default defineConfig({
  site: "https://alxjrvs.com",
  output: "server",
  adapter: cloudflare(),
  trailingSlash: "ignore",
  build: { format: "directory" },
  // The design ships its own fonts, CSS and inline scripts from public/ and
  // src/client/, at the URLs the Jekyll site used.
  compressHTML: false,
  devToolbar: { enabled: false },
  markdown: {
    // Code blocks are styled by site.css alone (no token colours), as before.
    syntaxHighlight: false,
  },
  integrations: [
    // EmDash's admin is a React app; the public pages ship no React.
    react(),
    emdash({
      // The CMS's own origin: redirects, preview links and CSRF checks use it.
      siteUrl: "https://admin.alxjrvs.com",
      database: d1({ binding: "DB", session: "auto", coalesce: true }),
      storage: r2({ binding: "MEDIA" }),
      // In production only Access can sign in (Google, alxjrvs@gmail.com),
      // and EmDash checks its token on every admin request. `astro dev`
      // falls back to a local passkey.
      auth: access({
        teamDomain: "alxjrvs.cloudflareaccess.com",
        audienceEnvVar: "CF_ACCESS_AUDIENCE",
      }),
    }),
  ],
  vite: { plugins: [inlineScripts()], define: { __BUILD_ID__: JSON.stringify(BUILD_ID) } },
  cache: { provider: cacheCloudflare() },
  routeRules: {
    "/": cached,
    "/writing": cached,
    "/writing/[slug]": cached,
    "/writing/tags/[tag]": cached,
    "/writing/threads": cached,
    "/writing/threads/[thread]": cached,
    "/feed.xml": cached,
    "/sitemap.xml": cached,
    "/projects.json": cached,
    "/llms.txt": cached,
  },
});
