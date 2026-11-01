// /projects.json: each published project's slug and link, for the
// Screenshots workflow (scripts/screenshots.mjs), which runs outside the site.
import type { APIRoute } from "astro";
import { getProjects } from "../lib/content";

export const GET: APIRoute = async (context) => {
  const projects = await getProjects(context);
  return Response.json(projects.map(({ id, link, shot }) => ({ slug: id, link, shot })));
};
