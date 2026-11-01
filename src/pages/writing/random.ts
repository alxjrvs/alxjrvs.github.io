// /writing/random: "roll for a piece". Sends you to a piece a new reader can
// start with (one on its own, or the first part of a thread), never the one
// you came from (?from=<slug>). Not cached, so every roll is a new one.
import type { APIRoute } from "astro";
import { getEntryPoints } from "../../lib/content";

export const GET: APIRoute = async (context) => {
  const from = context.url.searchParams.get("from");
  const all = await getEntryPoints(context);
  const pool = all.length > 1 ? all.filter((p) => p.id !== from) : all;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return new Response(null, {
    status: 302,
    headers: {
      Location: pick ? `/writing/${pick.id}/` : "/writing/",
      "Cache-Control": "no-store",
    },
  });
};
