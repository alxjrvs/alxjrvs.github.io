// Site-wide settings: what `_config.yml` held before the move off Jekyll.

export const site = {
  title: "alxjrvs",
  tagline: "Enthusiast. I make stuff.",
  description: "Alex Jarvis makes stuff.",
  author: "alxjrvs",
  url: "https://alxjrvs.com",
  lang: "en",
  // Post dates are written and shown in this zone.
  timezone: "America/New_York",

  // The social preview card (Open Graph / Twitter) for every page. Made from
  // scripts/social-card.html by scripts/social-card.mjs; re-render it when the
  // palette, wordmark or tagline change.
  image: {
    path: "/assets/social.png",
    width: 1200,
    height: 630,
    alt: "alxjrvs, over a field of dice: Enthusiast. I make stuff.",
  },

  // Each item scrolls to a section of the home page. Items with `needsPosts`
  // only appear once there is a post, so the Writing link shows up on its own
  // with the first one.
  nav: [
    { name: "Projects", url: "/#projects" },
    { name: "Writing", url: "/#writing", needsPosts: true },
    { name: "About", url: "/#about" },
  ],

  // Cloudflare Web Analytics site token (Web Analytics → the alxjrvs.com site
  // → "Manage site" → the token in the JS snippet). It is public by design:
  // it ships in every page. Beacons are only accepted from alxjrvs.com, so
  // local builds and preview URLs never count. Empty means no beacon.
  analyticsToken: "4e465ddcabb44222801184fd7a6130d5",
} as const;

export const absoluteUrl = (path: string): string => new URL(path, site.url).href;
