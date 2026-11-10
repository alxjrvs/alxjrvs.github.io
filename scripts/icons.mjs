// Makes the two icons that browsers and phones ask for by name, from the one
// real icon, public/assets/favicon.svg:
//
//   public/favicon.ico           16 and 32 px (PNG inside an ICO), for anything
//                                that requests /favicon.ico without reading the page
//   public/apple-touch-icon.png  180 px, square corners and no transparency,
//                                because iOS rounds and masks it itself
//
// Run it when the favicon changes: `bun add --no-save playwright@1.48.2 &&
// bunx playwright install chromium && bun run icons`.
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const svg = await readFile("public/assets/favicon.svg", "utf8");
const browser = await chromium.launch();

async function png(size, { square = false } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // The home-screen icon fills its square: drop the rounded corners.
  const art = square ? svg.replace(/ rx="\d+"/, "") : svg;
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${art}`,
  );
  const shot = await page.screenshot({ omitBackground: !square });
  await page.close();
  return shot;
}

// An ICO is a small directory followed by the images; PNG entries are allowed.
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0);
    e.writeUInt8(size, 1);
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

await writeFile(
  "public/favicon.ico",
  ico([
    { size: 16, data: await png(16) },
    { size: 32, data: await png(32) },
  ]),
);
await writeFile("public/apple-touch-icon.png", await png(180, { square: true }));
await browser.close();
console.log("✓ public/favicon.ico, public/apple-touch-icon.png");
