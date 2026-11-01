// EmDash rich text (Portable Text) as plain HTML, for the Atom feed's full
// content, where the Astro components (components/Prose.astro) can't run.
// It covers what the site's posts use: paragraphs, headings, quotes, lists,
// bold/italic/code/strike/links, code blocks and images. Anything else is
// dropped rather than guessed at.
import {
  buildMarksTree,
  isPortableTextBlock,
  isPortableTextToolkitList,
  isPortableTextToolkitSpan,
  isPortableTextToolkitTextNode,
  nestLists,
  type ToolkitNestedPortableTextSpan,
  type ToolkitTextNode,
} from "@portabletext/toolkit";
import type { PortableTextBlock } from "@portabletext/types";
import { sanitizeHref } from "emdash";
import { absoluteUrl } from "../site";
import { mediaPath } from "./media";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const MARKS: Record<string, string> = {
  strong: "strong",
  em: "em",
  code: "code",
  "strike-through": "s",
  underline: "u",
};
const STYLES: Record<string, string> = {
  h1: "h2",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  blockquote: "blockquote",
};

type Node = ToolkitNestedPortableTextSpan | ToolkitTextNode | { _type: string };

function inline(node: Node): string {
  if (isPortableTextToolkitTextNode(node)) return esc(node.text).replace(/\n/g, "<br>");
  if (isPortableTextToolkitSpan(node)) {
    const inner = node.children.map((c) => inline(c as Node)).join("");
    if (node.markType === "link") {
      const href = sanitizeHref(String((node.markDef as { href?: string })?.href ?? ""));
      return `<a href="${esc(href.startsWith("/") ? absoluteUrl(href) : href)}">${inner}</a>`;
    }
    const tag = MARKS[node.markType];
    return tag ? `<${tag}>${inner}</${tag}>` : inner;
  }
  return "";
}

function block(b: PortableTextBlock): string {
  const text = buildMarksTree(b)
    .map((n) => inline(n as Node))
    .join("");
  const tag = STYLES[b.style ?? "normal"] ?? "p";
  return `<${tag}>${text}</${tag}>`;
}

function list(l: { listItem: string; children: unknown[] }): string {
  const tag = l.listItem === "number" ? "ol" : "ul";
  const items = l.children
    .map((c) => {
      const item = c as PortableTextBlock & { children: unknown[] };
      const text = buildMarksTree(item)
        .map((n) => inline(n as Node))
        .join("");
      const nested = (item.children as unknown[])
        .filter((x) => isPortableTextToolkitList(x as never))
        .map((x) => list(x as never))
        .join("");
      return `<li>${text}${nested}</li>`;
    })
    .join("");
  return `<${tag}>${items}</${tag}>`;
}

export function portableTextToHtml(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return nestLists(value as PortableTextBlock[], "html")
    .map((node) => {
      if (isPortableTextToolkitList(node)) return list(node as never);
      if (isPortableTextBlock(node)) return block(node);
      const n = node as { _type: string; code?: string; asset?: { url?: string }; alt?: string };
      if (n._type === "code" && n.code) return `<pre><code>${esc(n.code)}</code></pre>`;
      if (n._type === "image") {
        const url = n.asset?.url;
        const path = url ? mediaPath({ id: "", src: url }) : undefined;
        if (path) return `<p><img src="${esc(absoluteUrl(path))}" alt="${esc(n.alt ?? "")}"></p>`;
      }
      return "";
    })
    .join("\n");
}
