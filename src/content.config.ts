import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// One front-matter-only file per project, sorted by `order`. They render as
// cards on the home page; there are no per-project pages.
const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "*.md" }),
  schema: z.object({
    order: z.number(),
    title: z.string(),
    summary: z.string(),
    link: z.url(),
    link_label: z.string().optional(),
    // public/assets/work/<shot>.webp (+ -640), captured by the Screenshots workflow
    shot: z.string().optional(),
    kicker: z.string().optional(),
    accent: z.string(),
    accent_dark: z.string(),
  }),
});

// Posts are `YYYY-MM-DD-slug.md`. The id is the slug (the URL is
// /writing/<slug>/) and the date comes from the filename unless the front
// matter gives one with a time.
const DATED = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/;
const posts = defineCollection({
  loader: glob({
    base: "./src/content/posts",
    pattern: "[0-9][0-9][0-9][0-9]-*.md",
    generateId: ({ entry }) => entry.match(DATED)?.[2] ?? entry,
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // a project's file name, linking the post and its project both ways
    project: z.string().optional(),
    date: z.coerce.date().optional(),
  }),
});

export const collections = { projects, posts };
