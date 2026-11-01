// /llms.txt (llmstxt.org): the site in plain Markdown for language models and
// anyone else reading by machine: who this is, the projects, the writing.
import type { APIRoute } from "astro";
import { getPosts, getProjects, getSiteText } from "../lib/content";
import { absoluteUrl, site } from "../site";

export const GET: APIRoute = async (context) => {
  const [projects, posts, text] = await Promise.all([
    getProjects(context),
    getPosts(context),
    getSiteText(context),
  ]);
  const lines = [
    `# ${site.author} (${text.title})`,
    "",
    `> ${text.description}`,
    "",
    `The personal site of ${site.author}. Contact: ${site.email.user} (at) ${site.email.domain.replace(".", " (dot) ")}. Elsewhere: ${site.sameAs.join(", ")}.`,
    "",
    "## Projects",
    "",
    ...projects.map((p) => `- [${p.title}](${p.link}): ${p.summary}`),
    "",
    "## Writing",
    "",
    ...posts.map((p) => {
      const what = p.pages.length ? " (comic)" : "";
      const desc = p.description ? `: ${p.description}` : "";
      return `- [${p.title}](${absoluteUrl(`/writing/${p.id}/`)})${what}${desc}`;
    }),
    "",
    "## Optional",
    "",
    `- [Atom feed, full text](${absoluteUrl("/feed.xml")})`,
    `- [Sitemap](${absoluteUrl("/sitemap.xml")})`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
