// Re-classify existing Property.type values from their title using the
// improved inferType() heuristic in zimmo.ts. Then recompute market averages.
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { PrismaClient } from "@prisma/client";
import { inferType } from "../lib/scrapers/zimmo.ts";
import { recalculateMarketAverages } from "../lib/market.ts";

const prisma = new PrismaClient();

const props = await prisma.property.findMany({
  where: { source: "Zimmo", isActive: true },
  select: { id: true, title: true, type: true, sqm: true },
});
console.log(`Re-classifying ${props.length} Zimmo properties...`);

const changes = {};
let changed = 0;
for (const p of props) {
  let newType = inferType(p.title);
  // Additional sanity: anything >3000m² listed as "house" is almost certainly land
  if (newType === "house" && p.sqm && p.sqm >= 3000) newType = "land";
  if (newType !== p.type) {
    const key = `${p.type} → ${newType}`;
    changes[key] = (changes[key] || 0) + 1;
    await prisma.property.update({
      where: { id: p.id },
      data: { type: newType },
    });
    changed += 1;
  }
}

console.log(`\nChanged ${changed} types:`);
for (const [k, n] of Object.entries(changes)) console.log(`  ${k}: ${n}`);

console.log(`\nRecomputing market averages with corrected types...`);
const r = await recalculateMarketAverages();
console.log(`  groups: ${r.groupsComputed}, properties scored: ${r.propertiesUpdated}`);
console.log(`  fallback breakdown: L1=${r.fallbackBreakdown.L1}, L2=${r.fallbackBreakdown.L2}, L3=${r.fallbackBreakdown.L3}, L4=${r.fallbackBreakdown.L4}, none=${r.fallbackBreakdown.none}`);

// Final stats
const total = await prisma.property.count();
const byType = await prisma.$queryRaw`SELECT type, COUNT(*)::int n FROM "Property" GROUP BY type ORDER BY n DESC`;
const count30 = await prisma.property.count({ where: { discountPct: { lte: -30 } } });
console.log(`\nTotal: ${total} | ≥30% disc: ${count30}`);
console.log(`By type:`);
for (const r of byType) console.log(`  ${r.type}: ${r.n}`);

await prisma.$disconnect();
