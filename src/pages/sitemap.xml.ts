// /sitemap.xml: the home page, the writing archive and every post. Redirect
// pages and the 404 stay out, as they did under jekyll-sitemap.
import type { APIRoute } from "astro";
import { getPosts } from "../lib/content";
import { absoluteUrl } from "../site";

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const urls = [
    { loc: absoluteUrl("/") },
    { loc: absoluteUrl("/writing/") },
    ...posts.map((p) => ({ loc: absoluteUrl(`/writing/${p.id}/`), lastmod: p.date.toISOString() })),
  ];
  const body = urls
    .map(
      (u) =>
        `<url>\n<loc>${u.loc}</loc>\n${"lastmod" in u ? `<lastmod>${u.lastmod}</lastmod>\n` : ""}</url>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
