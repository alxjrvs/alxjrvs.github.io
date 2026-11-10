// Makes a `wrangler d1 export` loadable. The export lists each table with its
// rows in the order SQLite stores them, so a table can be filled before one it
// points at exists ("media" before "media_folders"), and the load stops with
// "no such table". This moves every CREATE TABLE to the top, ahead of all the
// rows; indexes and everything else keep their order.
//
//   bun scripts/order-dump.ts dump.sql > ordered.sql
//
// See README, "Restoring".
export {};
const path = process.argv[2];
if (!path) {
  console.error("usage: bun scripts/order-dump.ts <dump.sql>");
  process.exit(1);
}
const lines = (await Bun.file(path).text()).split("\n");
const isTable = (line: string) => /^CREATE TABLE /.test(line);
const pragmas = lines.filter((l) => /^PRAGMA /.test(l));
const tables = lines.filter(isTable);
const rest = lines.filter((l) => !isTable(l) && !/^PRAGMA /.test(l));
process.stdout.write([...pragmas, ...tables, ...rest].join("\n"));
