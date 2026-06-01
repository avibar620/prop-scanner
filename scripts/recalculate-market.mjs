// Recompute market averages with the size-bucketed, capped algorithm.
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { PrismaClient } from "@prisma/client";
import { recalculateMarketAverages } from "../lib/market.ts";

const prisma = new PrismaClient();

// --- BEFORE stats ---
console.log("=== BEFORE ===");
const beforeTotal = await prisma.property.count();
const beforeWithDisc = await prisma.property.count({ where: { discountPct: { not: null } } });
const beforeBigDisc = await prisma.property.count({ where: { discountPct: { lte: -30 } } });
const beforeExtreme = await prisma.property.count({ where: { discountPct: { lte: -55 } } });
console.log(`  total:                 ${beforeTotal}`);
console.log(`  with discountPct:      ${beforeWithDisc}`);
console.log(`  >=30% under market:    ${beforeBigDisc}`);
console.log(`  >=55% under market:    ${beforeExtreme}  ← should be 0 after recalc`);

const insane = await prisma.$queryRaw`
  SELECT COUNT(*)::int n FROM "Property"
  WHERE "avgMarketPrice" IS NOT NULL AND sqm IS NOT NULL
    AND "avgMarketPrice" * sqm > price * 10
`;
console.log(`  market_estimate > price × 10: ${insane[0].n}  ← should be 0`);

// --- RUN ---
console.log("\n=== RECOMPUTING (winsorized + size-bucketed + ±55% cap) ===");
const start = Date.now();
const result = await recalculateMarketAverages();
console.log(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
console.log(`  groups in MarketAverage table:  ${result.groupsComputed}`);
console.log(`  properties with discount set:   ${result.propertiesUpdated}`);
console.log(`  capped (|disc|>55% → null):     ${result.cappedOut}`);
console.log(`  fallback levels:`);
for (const [k, v] of Object.entries(result.fallbackBreakdown)) {
  console.log(`    ${k}: ${v}`);
}

// --- AFTER stats ---
console.log("\n=== AFTER ===");
const afterWithDisc = await prisma.property.count({ where: { discountPct: { not: null } } });
const afterBigDisc = await prisma.property.count({ where: { discountPct: { lte: -30 } } });
const afterExtreme = await prisma.property.count({ where: { discountPct: { lte: -55 } } });
console.log(`  with discountPct:      ${afterWithDisc}`);
console.log(`  >=30% under market:    ${afterBigDisc}`);
console.log(`  >=55% under market:    ${afterExtreme}`);

const insaneAfter = await prisma.$queryRaw`
  SELECT COUNT(*)::int n FROM "Property"
  WHERE "avgMarketPrice" IS NOT NULL AND sqm IS NOT NULL
    AND "avgMarketPrice" * sqm > price * 10
`;
console.log(`  market_estimate > price × 10: ${insaneAfter[0].n}`);

// --- Top remaining discounts (sanity) ---
const top = await prisma.property.findMany({
  where: { discountPct: { lte: -30 } },
  orderBy: { discountPct: "asc" },
  take: 10,
  select: { title: true, price: true, sqm: true, pricePerSqm: true, pricePerSqmAvg: true, discountPct: true, city: true, type: true, rooms: true },
});
console.log(`\n=== Top 10 remaining ≥30% discounts ===`);
for (const e of top) {
  console.log(`  ${e.discountPct.toFixed(1)}% | ${e.type.padEnd(10)} ${e.city.padEnd(15)} | €${e.price.toLocaleString("nl-BE").padStart(10)} ${(e.sqm||"?").toString().padStart(4)}m² ${(e.rooms||"?").toString().padStart(2)}br | €/m²=${e.pricePerSqm||"?"} vs avg ${e.pricePerSqmAvg||"?"}`);
}

// --- 5 random sanity-check properties ---
const sample = await prisma.property.findMany({
  where: { discountPct: { not: null }, sqm: { not: null } },
  take: 5,
  orderBy: { id: "asc" },
});
console.log(`\n=== 5 random properties (sanity check) ===`);
for (const p of sample) {
  const totalMarket = (p.avgMarketPrice ?? 0) * (p.sqm ?? 0);
  const ratio = p.price > 0 ? (totalMarket / p.price).toFixed(2) : "?";
  console.log(`  €${p.price.toLocaleString("nl-BE")} ${p.sqm}m² | market €/m²=${p.avgMarketPrice} → est total €${totalMarket.toLocaleString("nl-BE")} | ratio=${ratio}× | disc=${p.discountPct?.toFixed(1)}%`);
}

await prisma.$disconnect();
