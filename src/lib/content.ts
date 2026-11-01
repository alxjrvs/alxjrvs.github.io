import { type CollectionEntry, getCollection } from "astro:content";
import { site } from "../site";

export type Project = CollectionEntry<"projects">;
export type Post = CollectionEntry<"posts"> & { date: Date };

export async function getProjects(): Promise<Project[]> {
  const all = await getCollection("projects");
  return all.sort((a, b) => a.data.order - b.data.order);
}

// Every post, newest first, each with its date resolved: the front matter's
// if it has one, otherwise the filename's (as midnight in the site's zone).
// (Read once per build: every page asks, for the nav.)
let posts: Promise<Post[]> | undefined;
export function getPosts(): Promise<Post[]> {
  posts ??= getCollection("posts").then((all) =>
    all
      .map((post) => ({ ...post, date: postDate(post) }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()),
  );
  return posts;
}

function postDate(post: CollectionEntry<"posts">): Date {
  if (post.data.date) return post.data.date;
  const day = post.filePath?.match(/(\d{4}-\d{2}-\d{2})-[^/]*$/)?.[1];
  if (!day) throw new Error(`Post ${post.id} has no date`);
  return zonedMidnight(day);
}

// Midnight on `day` in the site's zone, as an absolute time.
function zonedMidnight(day: string): Date {
  const utc = new Date(`${day}T00:00:00Z`);
  const there = new Date(utc.toLocaleString("en-US", { timeZone: site.timezone }));
  const here = new Date(utc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(utc.getTime() + (here.getTime() - there.getTime()));
}

function parts(date: Date): Record<string, string> {
  const out: Record<string, string> = {};
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: site.timezone,
    year: "numeric",
    month: "2-digit",
    day: "numeric",
  });
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return out;
}

/** "July 16, 2026" */
export function longDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: site.timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** "2026·07·16", the archive's date column */
export function dottedDate(date: Date): string {
  const p = parts(date);
  return `${p.year}·${p.month}·${(p.day ?? "").padStart(2, "0")}`;
}

/** "2026" */
export function year(date: Date): string {
  return parts(date).year ?? "";
}

// Minutes to read at 220 words a minute, rounded down, plus one.
export function readingMinutes(body: string | undefined): number {
  const words = (body ?? "").split(/\s+/).filter(Boolean).length;
  return Math.floor(words / 220) + 1;
}
