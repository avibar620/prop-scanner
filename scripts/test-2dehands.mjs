import { scrape2dehands } from "../lib/scrapers/tweedehands.ts";
const t0 = Date.now();
const items = await scrape2dehands([{ city: "Antwerpen", postalCode: "2000" }]);
console.log(`\n=== 2dehands test: ${items.length} listings in ${((Date.now() - t0) / 1000).toFixed(1)}s ===`);
const sample = items.slice(0, 5);
for (const p of sample) {
  console.log(`  ${p.externalId.padEnd(20)} ${p.postalCode} ${p.city.padEnd(20)} ${p.price.toString().padStart(8)} ${p.type.padEnd(8)} ${p.title.slice(0, 60)}`);
}
const byPostal = items.reduce((acc, p) => { acc[p.postalCode] = (acc[p.postalCode] ?? 0) + 1; return acc; }, {});
console.log(`\nPostals covered: ${Object.keys(byPostal).length}`);
console.log(`Top postals:`);
Object.entries(byPostal).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([p, n]) => console.log(`  ${p}: ${n}`));
const withImg = items.filter((p) => p.imageUrl).length;
const withSqm = items.filter((p) => p.sqm).length;
console.log(`\nWith image: ${withImg}/${items.length}`);
console.log(`With sqm:   ${withSqm}/${items.length}`);
console.log(`Antwerpen-area (2xxx): ${items.filter((p) => p.postalCode.startsWith("2")).length}`);
console.log(`Gent-area (9xxx):      ${items.filter((p) => p.postalCode.startsWith("9")).length}`);
console.log(`Brussel-area (1xxx):   ${items.filter((p) => p.postalCode.startsWith("1")).length}`);
