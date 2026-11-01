import { describe, expect, test } from "bun:test";
import { responsive } from "./media";
import { portableTextToHtml } from "./pt-html";

const span = (text: string, marks: string[] = []) => ({ _type: "span", _key: text, text, marks });

describe("portableTextToHtml", () => {
  test("paragraphs, headings, marks and links", () => {
    const html = portableTextToHtml([
      { _type: "block", _key: "a", style: "h2", markDefs: [], children: [span("Hi")] },
      {
        _type: "block",
        _key: "b",
        style: "normal",
        markDefs: [{ _key: "l", _type: "link", href: "/writing/" }],
        children: [span("a "), span("bold", ["strong"]), span(" & "), span("link", ["l"])],
      },
    ]);
    expect(html).toContain("<h2>Hi</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("&amp;");
    expect(html).toContain('<a href="https://alxjrvs.com/writing/">link</a>');
  });
  test("lists and code", () => {
    const html = portableTextToHtml([
      {
        _type: "block",
        _key: "1",
        style: "normal",
        listItem: "bullet",
        level: 1,
        markDefs: [],
        children: [span("one")],
      },
      {
        _type: "block",
        _key: "2",
        style: "normal",
        listItem: "bullet",
        level: 1,
        markDefs: [],
        children: [span("two")],
      },
      { _type: "code", _key: "c", code: "<b>" },
    ]);
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<pre><code>&lt;b&gt;</code></pre>");
  });
  test("nothing for non-arrays", () => {
    expect(portableTextToHtml(undefined)).toBe("");
  });
});

describe("responsive", () => {
  test("widths up to the original, through /_image", () => {
    const r = responsive({
      id: "x",
      src: "https://alxjrvs.com/_emdash/api/media/file/A.jpg",
      width: 1000,
    });
    expect(r?.full).toBe("/_emdash/api/media/file/A.jpg");
    expect(r?.srcset.split(", ").length).toBe(3);
    expect(r?.src).toContain("w=960");
  });
  test("storageKey fallback, and nothing for foreign media", () => {
    expect(responsive({ id: "x", meta: { storageKey: "B.png" } })?.full).toBe(
      "/_emdash/api/media/file/B.png",
    );
    expect(responsive({ id: "x", src: "https://example.com/c.jpg" })).toBeUndefined();
  });
});
