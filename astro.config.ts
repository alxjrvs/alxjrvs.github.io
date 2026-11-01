import { defineConfig } from "astro/config";

// alxjrvs.com: fully static output in ./dist, served by Cloudflare as the
// assets of the `alxjrvs` Worker (wrangler.jsonc). No adapter, no server.
export default defineConfig({
  site: "https://alxjrvs.com",
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
});
