// `import js from "./client/x.ts?inline-script"`: the file compiled to plain
// JavaScript, as a string (inlineScripts() in astro.config.ts).
declare module "*?inline-script" {
  const code: string;
  export default code;
}

/** A per-build id (astro.config.ts), stamped into asset URLs as `?v=`. */
declare const __BUILD_ID__: string;
