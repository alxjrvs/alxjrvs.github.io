// Responsive URLs for EmDash's uploaded images, made by Astro's /_image
// endpoint (the Cloudflare images binding) at the widths the gateway allows
// (src/gateway.ts). EmDash's own <Image> hands back the full-size file for
// every width when the media is served from this origin.
import type { MediaValue } from "emdash";
import { IMAGE_WIDTHS, MEDIA_PREFIX } from "../gateway";

/** The image's path on this site (/_emdash/api/media/file/…), if it has one. */
export function mediaPath(img: MediaValue): string | undefined {
  if (img.src) {
    try {
      const path = new URL(img.src, "https://alxjrvs.com").pathname;
      if (path.startsWith(MEDIA_PREFIX)) return path;
    } catch {}
  }
  const key = img.meta?.storageKey;
  return typeof key === "string" && key ? `${MEDIA_PREFIX}${key}` : undefined;
}

export interface Responsive {
  /** the full-size original */
  full: string;
  src: string;
  srcset: string;
}

/** A resized copy at each allowed width up to the original's. */
export function responsive(img: MediaValue): Responsive | undefined {
  const full = mediaPath(img);
  if (!full) return undefined;
  const max = img.width ?? Number.POSITIVE_INFINITY;
  const widths = IMAGE_WIDTHS.filter((w) => w <= max);
  if (!widths.length) return { full, src: full, srcset: "" };
  const at = (w: number) => `/_image?href=${encodeURIComponent(full)}&w=${w}&f=webp`;
  return {
    full,
    src: at(widths.find((w) => w >= 960) ?? (widths.at(-1) as number)),
    srcset: widths.map((w) => `${at(w)} ${w}w`).join(", "),
  };
}
