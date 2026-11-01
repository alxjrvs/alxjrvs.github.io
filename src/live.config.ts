// Posts live in EmDash (D1), not the repo. This live collection is how Astro
// reads them at request time; see getPosts() in lib/content.ts.
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
