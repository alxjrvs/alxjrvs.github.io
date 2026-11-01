// The Atom feed at /feed.xml, the same shape jekyll-feed wrote.
import type { APIRoute } from "astro";
import { getPosts } from "../lib/content";
import { absoluteUrl, site } from "../site";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const GET: APIRoute = async () => {
  const posts = (await getPosts()).slice(0, 10);
  const self = absoluteUrl("/feed.xml");
  const updated = (posts[0]?.date ?? new Date()).toISOString();
  const entries = posts
    .map((post) => {
      const url = absoluteUrl(`/writing/${post.id}/`);
      const when = post.date.toISOString();
      return [
        "<entry>",
        `<title type="html">${esc(post.data.title)}</title>`,
        `<link href="${url}" rel="alternate" type="text/html" title="${esc(post.data.title)}" />`,
        `<published>${when}</published>`,
        `<updated>${when}</updated>`,
        `<id>${url}</id>`,
        `<author><name>${esc(site.author)}</name></author>`,
        post.data.description ? `<summary type="html">${esc(post.data.description)}</summary>` : "",
        "</entry>",
      ].join("");
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${site.lang}"><link href="${self}" rel="self" type="application/atom+xml" /><link href="${site.url}/" rel="alternate" type="text/html" hreflang="${site.lang}" /><updated>${updated}</updated><id>${self}</id><title type="html">${esc(site.title)}</title><subtitle>${esc(site.description)}</subtitle><author><name>${esc(site.author)}</name></author>${entries}</feed>`;
  return new Response(xml, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });
};
