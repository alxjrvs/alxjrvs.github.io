import { describe, expect, test } from "bun:test";
import { cleanSearch, normalisePath, route } from "./gateway";

const site = (url: string) => {
  const r = route(url);
  if (r.kind !== "site") throw new Error(`expected site, got ${JSON.stringify(r)}`);
  return r;
};

describe("public host guard", () => {
  test.each([
    "https://alxjrvs.com/_emdash/api/health",
    "https://alxjrvs.com//_emdash/api/health",
    "https://alxjrvs.com/%5Femdash/api/health",
    "https://alxjrvs.com/%5femdash/api/setup/status",
    "https://alxjrvs.com/%255Femdash/api/health",
    "https://alxjrvs.com///_emdash/api/mcp",
    "https://alxjrvs.com/_EMDASH/api/health",
    "https://alxjrvs.alxjrvs.workers.dev//_emdash/admin",
  ])("%s goes to the admin host", (url) => {
    const r = route(url);
    expect(r.kind).toBe("redirect");
    if (r.kind === "redirect") expect(new URL(r.location).hostname).toBe("admin.alxjrvs.com");
  });

  test.each([
    "https://alxjrvs.com/_server-islands/x",
    "https://alxjrvs.com/_actions/x",
    "https://alxjrvs.com//_whatever",
    "https://alxjrvs.com/_image?href=/_emdash/api/media/file/a.jpg&w=4000",
    "https://alxjrvs.com/_image?href=https://evil.example/x.jpg&w=640",
    "https://alxjrvs.com/_image?href=/assets/x.png&w=640",
  ])("%s is refused", (url) => {
    expect(route(url).kind).toBe("not-found");
  });

  test("uploaded media is served, marked as media", () => {
    const r = site("https://alxjrvs.com/_emdash/api/media/file/01ABC.jpg");
    expect(r.media).toBe(true);
    expect(r.url).toBe("https://alxjrvs.com/_emdash/api/media/file/01ABC.jpg");
  });

  test("/_image at an allowed width for media is served", () => {
    const r = site("https://alxjrvs.com/_image?href=/_emdash/api/media/file/a.jpg&w=640");
    expect(r.url).toContain("w=640");
  });
});

describe("canonical origin", () => {
  test("plain http on the apex redirects to https", () => {
    expect(route("http://alxjrvs.com/writing/ajar/?x=1")).toEqual({
      kind: "redirect",
      location: "https://alxjrvs.com/writing/ajar/?x=1",
      status: 301,
    });
  });

  test("workers.dev is rebuilt on the apex and noindexed", () => {
    const r = site("https://alxjrvs.alxjrvs.workers.dev/writing/");
    expect(r.url).toBe("https://alxjrvs.com/writing/");
    expect(r.noindex).toBe(true);
    expect(r.hsts).toBe(false);
  });

  test("the apex gets HSTS and stays indexable", () => {
    const r = site("https://alxjrvs.com/");
    expect(r.hsts).toBe(true);
    expect(r.noindex).toBe(false);
  });

  test("tracking parameters are dropped, others kept", () => {
    expect(site("https://alxjrvs.com/?fbclid=abc&utm_source=x").url).toBe("https://alxjrvs.com/");
    expect(site("https://alxjrvs.com/writing/?page=2&gclid=1").url).toBe(
      "https://alxjrvs.com/writing/?page=2",
    );
  });

  test("double slashes collapse", () => {
    expect(site("https://alxjrvs.com//writing//ajar/").url).toBe(
      "https://alxjrvs.com/writing/ajar/",
    );
  });
});

describe("admin host and dev", () => {
  test("admin pages go to the admin app", () => {
    expect(route("https://admin.alxjrvs.com/").kind).toBe("admin-home");
    expect(route("https://admin.alxjrvs.com/_emdash/admin/").kind).toBe("admin");
  });
  test("localhost is left alone", () => {
    expect(route("http://localhost:4321/_emdash/admin").kind).toBe("dev");
  });
});

describe("helpers", () => {
  test("normalisePath survives bad escapes", () => {
    expect(normalisePath("/%E0%A4%A")).toBe("/%E0%A4%A");
  });
  test("cleanSearch", () => {
    expect(cleanSearch("?utm_medium=a&mc_cid=b")).toBe("");
  });
});
