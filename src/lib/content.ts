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
  getTaxonomyTermsWithCacheHint,
  type ImageValue,
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

/** One section by slug (about, projects, writing, writing-archive, threads-archive, not-found). */
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

/** One row of the 404 page's encounter table. */
export interface Encounter {
  label: string;
  href: string;
}

// Used when the "encounters" Randomizer is missing or empty.
const ENCOUNTERS: Encounter[] = [
  { label: "A door, slightly ajar", href: "/writing/ajar/" },
  { label: "A wandering archive", href: "/writing/" },
  { label: "A pile of projects", href: "/#projects" },
  { label: "A thread worth pulling", href: "/writing/threads/" },
  { label: "A piece of writing, picked at random", href: "/writing/random" },
  { label: "Someone who'd like to meet you", href: "/#about" },
  { label: "A feed, still warm", href: "/feed.xml" },
  { label: "The way home", href: "/" },
];

/**
 * The 404 page's encounter table: the "encounters" Randomizer, one row per
 * line as `label | /path` (its lead is the table's name), or the defaults.
 * Rows that don't point somewhere on this site are dropped.
 */
export async function getEncounters(
  astro: AstroLike,
): Promise<{ lead: string; rows: Encounter[] }> {
  const r = (await getRandomizers(astro)).get("encounters");
  const rows = (r?.items ?? []).flatMap((line) => {
    const [label, href] = line.split("|").map((x) => x.trim());
    return label && href?.startsWith("/") && !href.startsWith("//") ? [{ label, href }] : [];
  });
  return { lead: r?.lead ?? "Roll for an encounter", rows: rows.length ? rows : ENCOUNTERS };
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
  /** its tags (EmDash's built-in Tags taxonomy), in the order they were added */
  tags: Tag[];
  /** a comic's pages, in reading order; a piece with any pages is a comic */
  pages: ComicPage[];
  /** the thread it belongs to (the Threads taxonomy), if any */
  thread?: Tag | undefined;
  /** its place in its thread, as set in the admin (gaps are fine) */
  part?: number | undefined;
  /** who made it, role by role, from its Bylines; empty for most pieces */
  credits: Credit[];
}

export interface Credit {
  /** "Author", "Artist and Letterer" */
  role: string;
  name: string;
  /** their site, if given */
  link?: string | undefined;
}

// The piece's Bylines (EmDash's own: picked in the editor's Bylines panel,
// each with a role label; people live under Bylines in the admin). Only ones
// set on purpose count; EmDash also infers one from the author, which would put
// "Alex Jarvis" on everything. EmDash allows one byline per person per piece,
// so someone with several roles gets them in one label ("Artist, Letterer" or
// "Artist and Letterer"); each role becomes its own credit line.
function creditsOf(data: Data): Credit[] {
  if (!Array.isArray(data.bylines)) return [];
  return data.bylines.flatMap((c: Data) => {
    const byline = c?.byline as Data | undefined;
    const name = str(byline?.displayName)?.trim();
    if (c?.source === "inferred" || !name) return [];
    const link = str(byline?.websiteUrl);
    const roles = (str(c.roleLabel) ?? "By")
      .split(/\s*(?:,|;|\/|&|\band\b)\s*/i)
      .map((r) => r.trim())
      .filter(Boolean);
    return (roles.length ? roles : ["By"]).map((role) => ({ role, name, link }));
  });
}

export interface ComicPage {
  /** EmDash's image value, rendered by emdash/ui's <Image> */
  image: ImageValue;
  /** what's on the page, for screen readers (falls back to the image's own alt) */
  alt: string;
}

function pagesOf(data: Data): ComicPage[] {
  if (!Array.isArray(data.pages)) return [];
  return data.pages.flatMap((row: Data) => {
    const image = row?.image as ImageValue | undefined;
    if (!image || typeof image !== "object" || !(image.id || image.src)) return [];
    return [{ image, alt: str(row.alt) ?? str(image.alt) ?? "" }];
  });
}

export interface Tag {
  /** the URL is /writing/tags/<slug>/ */
  slug: string;
  label: string;
  /** published pieces with this tag (only from getTags) */
  count?: number | undefined;
}

function termsOf(data: Data, taxonomy: string): Tag[] {
  const terms = (data.terms as Record<string, unknown> | undefined)?.[taxonomy];
  if (!Array.isArray(terms)) return [];
  return terms.flatMap((t: Data) => {
    const slug = str(t.slug);
    return slug ? [{ slug, label: str(t.label) ?? slug }] : [];
  });
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
      tags: termsOf(data, "tag"),
      pages: pagesOf(data),
      thread: termsOf(data, "thread")[0],
      part: typeof data.part === "number" ? data.part : undefined,
      credits: creditsOf(data),
    };
  });
}

/** Every tag on at least one published piece, by label, with its count. */
export function getTags(astro: AstroLike): Promise<Tag[]> {
  return once(astro, "tags", async () => {
    // The hint makes renaming a tag purge the pages that show it.
    const [{ cacheHint }, posts] = await Promise.all([
      getTaxonomyTermsWithCacheHint("tag", { includeCounts: false }),
      getPosts(astro),
    ]);
    if (astro.cache?.enabled) astro.cache.set(cacheHint);
    const tags = new Map<string, Tag & { count: number }>();
    for (const post of posts) {
      for (const t of post.tags) {
        const tag = tags.get(t.slug) ?? { ...t, count: 0 };
        tag.count++;
        tags.set(t.slug, tag);
      }
    }
    return [...tags.values()].sort((a, b) => a.label.localeCompare(b.label));
  });
}

// --- Threads ----------------------------------------------------------------

/** A chain of pieces that read together, in order. */
export interface Thread {
  /** the URL is /writing/threads/<slug>/ */
  slug: string;
  label: string;
  /** the term's description in the admin, shown as the thread's dek */
  description?: string | undefined;
  /** its published pieces, first part first */
  parts: Post[];
}

/** Where a piece sits in its thread: part `n` of `thread.parts.length`. */
export interface Place {
  thread: Thread;
  /** 1-based */
  n: number;
  prev?: Post | undefined;
  next?: Post | undefined;
}

/**
 * Every thread with at least one published piece, newest activity first.
 * Parts go by their Part number, then by publish date, so leaving Part empty
 * just means "in the order they came out".
 */
export function getThreads(astro: AstroLike): Promise<Thread[]> {
  return once(astro, "threads", async () => {
    const [{ data: terms, cacheHint }, posts] = await Promise.all([
      getTaxonomyTermsWithCacheHint("thread", { includeCounts: false }),
      getPosts(astro),
    ]);
    // The hint makes renaming a thread purge the pages that show it.
    if (astro.cache?.enabled) astro.cache.set(cacheHint);
    const about = new Map(
      (terms as { slug: string; description?: string }[]).map((t) => [t.slug, str(t.description)]),
    );
    const threads = new Map<string, Thread>();
    for (const post of posts) {
      if (!post.thread) continue;
      const { slug, label } = post.thread;
      const thread = threads.get(slug) ?? { slug, label, description: about.get(slug), parts: [] };
      thread.parts.push(post);
      threads.set(slug, thread);
    }
    const key = (p: Post) => p.part ?? Number.POSITIVE_INFINITY;
    const latest = (t: Thread) => Math.max(...t.parts.map((p) => p.date.getTime()));
    return [...threads.values()]
      .map((t) => ({
        ...t,
        parts: t.parts.toSorted((a, b) => key(a) - key(b) || a.date.getTime() - b.date.getTime()),
      }))
      .sort((a, b) => latest(b) - latest(a));
  });
}

/**
 * The pieces a new reader can start with: everything that isn't in a thread,
 * and the first part of each thread. Newest first, like getPosts.
 */
export async function getEntryPoints(astro: AstroLike): Promise<Post[]> {
  const [posts, threads] = await Promise.all([getPosts(astro), getThreads(astro)]);
  const firsts = new Set(threads.map((t) => t.parts[0]?.id));
  return posts.filter((p) => !p.thread || firsts.has(p.id));
}

/** A piece's place in its thread, or undefined if it isn't in one. */
export async function getPlace(astro: AstroLike, post: Post): Promise<Place | undefined> {
  if (!post.thread) return undefined;
  const thread = (await getThreads(astro)).find((t) => t.slug === post.thread?.slug);
  const i = thread?.parts.findIndex((p) => p.id === post.id) ?? -1;
  if (!thread || i < 0) return undefined;
  return { thread, n: i + 1, prev: thread.parts[i - 1], next: thread.parts[i + 1] };
}

/** Every piece's place, by piece id: for lists that show "Part 2 of 3". */
export async function getPlaces(astro: AstroLike): Promise<Map<string, Place>> {
  const places = new Map<string, Place>();
  for (const thread of await getThreads(astro)) {
    thread.parts.forEach((p, i) => {
      places.set(p.id, { thread, n: i + 1, prev: thread.parts[i - 1], next: thread.parts[i + 1] });
    });
  }
  return places;
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

/** "Oct 28", the index's date (the year is its group) */
export function shortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: site.timezone,
    month: "short",
    day: "numeric",
  });
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

/** How long a piece is, for list meta: "4 min" of reading, or a comic's "12 pages". */
export function measure(post: Post): string {
  const n = post.pages.length;
  if (n) return `${n} ${n === 1 ? "page" : "pages"}`;
  return `${readingMinutes(post.content)} min`;
}
