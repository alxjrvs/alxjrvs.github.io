// Every word on the site comes from EmDash (D1), edited and published at
// admin.alxjrvs.com: posts, project cards, page sections, the randomizers and
// the site settings. Only published entries ever come back from here. Each
// read is done once per request and adds its cache tags to the response, so
// publishing anything purges the cached pages that show it.
import {
  type CacheHint,
  extractPlainText,
  getEmDashCollection,
  getSiteSettingsWithCacheHint,
} from "emdash";
import { site } from "../site";

/** The bit of Astro / APIContext these need. */
export interface AstroLike {
  locals: object;
  cache?: { enabled?: boolean; set(hint: CacheHint): void };
}

const memo = new WeakMap<object, Map<string, Promise<unknown>>>();
function once<T>(astro: AstroLike, key: string, load: () => Promise<T>): Promise<T> {
  let cache = memo.get(astro.locals);
  if (!cache) {
    cache = new Map();
    memo.set(astro.locals, cache);
  }
  let value = cache.get(key) as Promise<T> | undefined;
  if (!value) {
    value = load();
    cache.set(key, value);
  }
  return value;
}

type Data = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);

// Every published entry of a collection, as { slug, data }.
function entries(astro: AstroLike, collection: string, orderBy: Record<string, "asc" | "desc">) {
  return once(astro, collection, async () => {
    const { entries, error, cacheHint } = await getEmDashCollection(collection, { orderBy });
    if (error) throw error;
    if (astro.cache?.enabled) astro.cache.set(cacheHint);
    return entries.map((e) => ({ slug: e.id, data: e.data as Data }));
  });
}

// --- Site settings ----------------------------------------------------------

export interface SiteText {
  /** "alxjrvs" */
  title: string;
  /** the meta description: "Alex Jarvis makes stuff." */
  description: string;
}

export function getSiteText(astro: AstroLike): Promise<SiteText> {
  return once(astro, "settings", async () => {
    const { data, cacheHint } = await getSiteSettingsWithCacheHint();
    if (astro.cache?.enabled) astro.cache.set(cacheHint);
    return { title: str(data.title) ?? "alxjrvs", description: str(data.tagline) ?? "" };
  });
}

// --- Projects ---------------------------------------------------------------

export interface Project {
  /** the slug, which posts use to point at their project */
  id: string;
  title: string;
  summary: string;
  link: string;
  link_label?: string | undefined;
  /** public/assets/work/<shot>.webp (+ -640), captured by the Screenshots workflow */
  shot?: string | undefined;
  kicker?: string | undefined;
  accent: string;
  accent_dark: string;
}

/** The project cards, in their `order`. */
export async function getProjects(astro: AstroLike): Promise<Project[]> {
  const all = await entries(astro, "projects", { order: "asc" });
  return all.map(({ slug, data }) => ({
    id: slug,
    title: str(data.title) ?? slug,
    summary: str(data.summary) ?? "",
    link: str(data.link) ?? "#",
    link_label: str(data.link_label),
    shot: str(data.shot),
    kicker: str(data.kicker),
    accent: str(data.accent) ?? "currentColor",
    accent_dark: str(data.accent_dark) ?? "currentColor",
  }));
}

// --- Sections ---------------------------------------------------------------

export interface Section {
  title: string;
  /** set on sections that get a header nav link */
  navLabel?: string | undefined;
  kicker?: string | undefined;
  dek?: string | undefined;
  /** Portable Text, rendered by emdash/ui's <PortableText> */
  body: unknown[];
}

async function sections(astro: AstroLike): Promise<Map<string, Section>> {
  const all = await entries(astro, "sections", { created_at: "asc" });
  return new Map(
    all.map(({ slug, data }) => [
      slug,
      {
        title: str(data.title) ?? "",
        navLabel: str(data.nav_label),
        kicker: str(data.kicker),
        dek: str(data.dek),
        body: Array.isArray(data.body) ? data.body : [],
      },
    ]),
  );
}

/** One section by slug (about, projects, writing, writing-archive, not-found). */
export async function getSection(astro: AstroLike, slug: string): Promise<Section | undefined> {
  return (await sections(astro)).get(slug);
}

// --- Randomizers ------------------------------------------------------------

export interface Randomizer {
  /** what it rolls, first item shown before any roll */
  items: string[];
  lead?: string | undefined;
  rare?: string | undefined;
  rareOdds?: number | undefined;
}

/** By slug: tagline-subjects, tagline-objects, likes-1, likes-2, likes-3. */
export async function getRandomizers(astro: AstroLike): Promise<Map<string, Randomizer>> {
  const all = await entries(astro, "randomizers", { created_at: "asc" });
  return new Map(
    all.map(({ slug, data }) => [
      slug,
      {
        items: (str(data.items) ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        lead: str(data.lead),
        rare: str(data.rare),
        rareOdds: typeof data.rare_odds === "number" ? data.rare_odds : undefined,
      },
    ]),
  );
}

/** Everything the die rolls, with fallbacks so a missing entry can't break the page. */
export async function getRolls(astro: AstroLike) {
  const r = await getRandomizers(astro);
  const items = (slug: string) => {
    const list = r.get(slug)?.items ?? [];
    return list.length ? list : ["stuff"];
  };
  const subjects = r.get("tagline-subjects");
  return {
    subjects: items("tagline-subjects"),
    objects: items("tagline-objects"),
    lead: r.get("tagline-objects")?.lead ?? "I make",
    rare: subjects?.rare ?? "",
    rareOdds: subjects?.rareOdds ?? 0,
    likesLead: r.get("likes-1")?.lead ?? "I like",
    likes: [items("likes-1"), items("likes-2"), items("likes-3")] as [string[], string[], string[]],
  };
}

// --- Posts ------------------------------------------------------------------

export interface Post {
  /** the slug: the URL is /writing/<id>/ */
  id: string;
  title: string;
  description?: string | undefined;
  /** a project's slug, linking the post and its project both ways */
  project?: string | undefined;
  /** when it was (first) published */
  date: Date;
  /** Portable Text, rendered by emdash/ui's <PortableText> */
  content: unknown;
}

/** Every published post, newest first. */
export async function getPosts(astro: AstroLike): Promise<Post[]> {
  const all = await entries(astro, "posts", { published_at: "desc" });
  return all.map(({ slug, data }) => {
    const date = data.publishedAt ?? data.createdAt;
    return {
      id: slug,
      title: str(data.title) ?? slug,
      description: str(data.description),
      project: str(data.project),
      date: date instanceof Date ? date : new Date(String(date)),
      content: data.content,
    };
  });
}

/** The header nav: every section with a nav label, Writing only once there's a post. */
export async function getNav(astro: AstroLike): Promise<{ name: string; url: string }[]> {
  const [all, posts] = await Promise.all([sections(astro), getPosts(astro)]);
  return ["projects", "writing", "about"].flatMap((slug) => {
    const label = all.get(slug)?.navLabel;
    if (!label || (slug === "writing" && posts.length === 0)) return [];
    return [{ name: label, url: `/#${slug}` }];
  });
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
export function readingMinutes(content: unknown): number {
  const text = Array.isArray(content) ? extractPlainText(content) : "";
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.floor(words / 220) + 1;
}
