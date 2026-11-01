// The Atom feed at /feed.xml (also /rss.xml, redirected in public/_redirects).
// Each entry carries the whole piece: the words as HTML, and a comic's pages
// as images, so a feed reader shows the real thing, not a teaser.
import type { APIRoute } from "astro";
import { getPosts, getSiteText, type Post } from "../lib/content";
import { mediaPath } from "../lib/media";
import { esc, portableTextToHtml } from "../lib/pt-html";
import { absoluteUrl, site } from "../site";

function contentOf(post: Post): string {
  const pages = post.pages
    .map((p, i) => {
      const path = mediaPath(p.image);
      if (!path) return "";
      const alt = p.alt || `Page ${i + 1}`;
      return `<p><img src="${esc(absoluteUrl(path))}" alt="${esc(alt)}"></p>`;
    })
    .join("\n");
  const credits = post.credits.length
    ? `<p>${post.credits.map((c) => `${esc(c.role)}: ${esc(c.name)}`).join("<br>")}</p>`
    : "";
  return [credits, pages, portableTextToHtml(post.content)].filter(Boolean).join("\n");
}

export const GET: APIRoute = async (context) => {
  const [all, text] = await Promise.all([getPosts(context), getSiteText(context)]);
  const posts = all.slice(0, 10);
  const self = absoluteUrl("/feed.xml");
  const updated = (posts[0]?.date ?? new Date()).toISOString();
  const entries = posts
    .map((post) => {
      const url = absoluteUrl(`/writing/${post.id}/`);
      const when = post.date.toISOString();
      const title = post.thread ? `${post.title} (${post.thread.label})` : post.title;
      return [
        "<entry>",
        `<title type="html">${esc(title)}</title>`,
        `<link href="${url}" rel="alternate" type="text/html" title="${esc(post.title)}" />`,
        `<published>${when}</published>`,
        `<updated>${when}</updated>`,
        `<id>${url}</id>`,
        `<author><name>${esc(site.author)}</name><uri>${site.url}/</uri></author>`,
        post.description ? `<summary type="html">${esc(post.description)}</summary>` : "",
        `<content type="html">${esc(contentOf(post))}</content>`,
        "</entry>",
      ].join("");
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${site.lang}"><link href="${self}" rel="self" type="application/atom+xml" /><link href="${site.url}/" rel="alternate" type="text/html" hreflang="${site.lang}" /><updated>${updated}</updated><id>${self}</id><title type="html">${esc(text.title)}</title><subtitle>${esc(text.description)}</subtitle><author><name>${esc(site.author)}</name><uri>${site.url}/</uri></author>${entries}</feed>`;
  return new Response(xml, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });
};
