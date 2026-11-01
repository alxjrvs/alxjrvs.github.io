// /sitemap.xml: the home page, the writing archive, every post, tag and thread page. Redirect
// pages and the 404 stay out, as they did under jekyll-sitemap.
import type { APIRoute } from "astro";
import { getPosts, getTags, getThreads } from "../lib/content";
import { absoluteUrl } from "../site";

export const GET: APIRoute = async (context) => {
  const [posts, tags, threads] = await Promise.all([
    getPosts(context),
    getTags(context),
    getThreads(context),
  ]);
  const urls = [
    { loc: absoluteUrl("/") },
    { loc: absoluteUrl("/writing/") },
    ...posts.map((p) => ({ loc: absoluteUrl(`/writing/${p.id}/`), lastmod: p.date.toISOString() })),
    ...tags.map((t) => ({ loc: absoluteUrl(`/writing/tags/${t.slug}/`) })),
    ...threads.map((t) => ({ loc: absoluteUrl(`/writing/threads/${t.slug}/`) })),
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
