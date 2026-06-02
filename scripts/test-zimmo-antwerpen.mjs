import { scrapeZimmo } from "../lib/scrapers/zimmo.ts";
const t0 = Date.now();
// Simulate 3 Antwerpen sub-postal areas — all should collapse to one URL.
const items = await scrapeZimmo([
  { city: "Antwerpen", postalCode: "2000" },
  { city: "Antwerpen", postalCode: "2018" },
  { city: "Antwerpen", postalCode: "2100" },
]);
console.log(`\n=== Zimmo Antwerpen test: ${items.length} listings in ${((Date.now() - t0) / 1000).toFixed(1)}s ===`);
const byPostal = items.reduce((acc, p) => { acc[p.postalCode] = (acc[p.postalCode] ?? 0) + 1; return acc; }, {});
console.log(`Postals covered: ${Object.keys(byPostal).length}`);
Object.entries(byPostal).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([p, n]) => console.log(`  ${p}: ${n}`));
console.log(`\nIncludes 2018? ${(byPostal["2018"] ?? 0) > 0 ? "YES (" + byPostal["2018"] + ")" : "NO"}`);
