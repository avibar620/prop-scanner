// Recompute market averages using the new winsorized + room-bucketed algorithm.
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { recalculateMarketAverages } from "../lib/market.ts";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

console.log("Recomputing market averages (winsorized, room-bucketed, 4-tier fallback)...\n");
const start = Date.now();
const result = await recalculateMarketAverages();
console.log(`✓ Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
console.log(`  Groups computed (L2 / MarketAverage table): ${result.groupsComputed}`);
console.log(`  Properties with discountPct set:           ${result.propertiesUpdated}`);
console.log(`  Fallback breakdown:`);
for (const [k, v] of Object.entries(result.fallbackBreakdown)) {
  console.log(`    ${k}: ${v}`);
}

// Sanity check: extreme discounts
const extreme = await prisma.property.findMany({
  where: { discountPct: { lte: -50 } },
  orderBy: { discountPct: "asc" },
  take: 5,
  select: { title: true, price: true, sqm: true, pricePerSqm: true, pricePerSqmAvg: true, discountPct: true, city: true, postalCode: true, type: true, rooms: true },
});
console.log(`\nTop "discounts" after recalc (should be more reasonable):`);
for (const e of extreme) {
  console.log(`  ${e.discountPct.toFixed(1)}%  ${e.type.padEnd(10)} ${e.city.padEnd(15)} | €${e.price.toLocaleString("nl-BE")} ${e.sqm || "?"}m² ${e.rooms || "?"}br  €/m²=${e.pricePerSqm || "?"} vs avg €/m²=${e.pricePerSqmAvg || "?"}`);
}

// Filter check
const count30 = await prisma.property.count({ where: { discountPct: { lte: -30 } } });
const count20 = await prisma.property.count({ where: { discountPct: { lte: -20 } } });
const count10 = await prisma.property.count({ where: { discountPct: { lte: -10 } } });
const total = await prisma.property.count();
console.log(`\nDiscount distribution:`);
console.log(`  ≥10% under market: ${count10}/${total}`);
console.log(`  ≥20% under market: ${count20}/${total}`);
console.log(`  ≥30% under market: ${count30}/${total}`);

await prisma.$disconnect();
