// Full Zimmo scrape against all active areas + replace demo properties + recalc market averages.
// Run locally against Neon. User has taken explicit responsibility for IP-block risk.
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { scrapeZimmo } from "../lib/scrapers/zimmo.ts";
import { scrapeImmoweb } from "../lib/scrapers/immoweb.ts";
import { scrape2dehands } from "../lib/scrapers/tweedehands.ts";
import { scrapeRealo } from "../lib/scrapers/realo.ts";
import { scrapeImmoscoop } from "../lib/scrapers/immoscoop.ts";

const prisma = new PrismaClient();
const start = Date.now();

// 1. Active areas
const areas = await prisma.searchArea.findMany({
  where: { isActive: true, postalCode: { not: null } },
  select: { city: true, postalCode: true },
});
const areaInput = areas.map((a) => ({ city: a.city, postalCode: a.postalCode }));
console.log(`Scraping ${areas.length} areas...`);
console.log(`Zimmo (cheerio):    starting...`);

const zimmoRaw = await scrapeZimmo(areaInput);
console.log(`Zimmo done:         ${zimmoRaw.length} listings in ${((Date.now() - start) / 1000).toFixed(1)}s`);

// 2b. Immoweb / Realo / Immoscoop — all via ScraperAPI gateway.
// Gated on SCRAPER_API_KEY: with no key set, each scraper returns [] without
// burning network calls, so this whole block is a safe no-op in dev.
const scraperApiActive =
  process.env.SCRAPER_API_KEY && process.env.SCRAPER_API_KEY !== "PLACEHOLDER_FILL_THIS";

const immowebStart = Date.now();
console.log(`Immoweb (ScraperAPI):   starting (key=${scraperApiActive ? "yes" : "MISSING — skip"})...`);
const immowebRaw = scraperApiActive ? await scrapeImmoweb(areaInput) : [];
console.log(`Immoweb done:           ${immowebRaw.length} listings in ${((Date.now() - immowebStart) / 1000).toFixed(1)}s`);

const realoStart = Date.now();
console.log(`Realo (ScraperAPI):     starting...`);
const realoRaw = scraperApiActive ? await scrapeRealo(areaInput) : [];
console.log(`Realo done:             ${realoRaw.length} listings in ${((Date.now() - realoStart) / 1000).toFixed(1)}s`);

const immoscoopStart = Date.now();
console.log(`Immoscoop (ScraperAPI): starting...`);
const immoscoopRaw = scraperApiActive ? await scrapeImmoscoop(areaInput) : [];
console.log(`Immoscoop done:         ${immoscoopRaw.length} listings in ${((Date.now() - immoscoopStart) / 1000).toFixed(1)}s`);

// 2c. 2dehands (global list — pulls ~70-100 listings/run regardless of area)
const tdhStart = Date.now();
console.log(`2dehands (cheerio):     starting...`);
const tdhRaw = await scrape2dehands(areaInput);
console.log(`2dehands done:          ${tdhRaw.length} listings in ${((Date.now() - tdhStart) / 1000).toFixed(1)}s`);

const rawAll = [...zimmoRaw, ...immowebRaw, ...realoRaw, ...immoscoopRaw, ...tdhRaw];
// Cross-source dedup by externalId. Zimmo now dedups only within each area, so
// the same listing can appear N times (once per area it was classified under) —
// keep the LAST occurrence so the most-specific area "wins" the postal assignment.
const byId = new Map();
for (const r of rawAll) byId.set(r.externalId, r);
const raw = [...byId.values()];
console.log(`\n✓ Scraped ${rawAll.length} raw entries → ${raw.length} unique listings in ${((Date.now() - start) / 1000).toFixed(1)}s`);

if (raw.length === 0) {
  console.error("FATAL: scraped 0 listings — both scrapers returned empty (likely anti-bot / IP block / selector drift). Aborting before any destructive op.");
  await prisma.$disconnect();
  process.exit(1);
}

// 3. Validation — accept images from any of our active source CDNs
const realImg = raw.filter((r) => {
  const u = r.imageUrl ?? "";
  return (
    u.includes("zimmo.be") ||
    u.includes("immoweb.be") ||
    u.includes("immoweb.net") ||
    u.includes("2dehands.com") ||
    u.includes("2dehands.be") ||
    u.includes("realo.be") ||
    u.includes("realocdn") ||
    u.includes("immoscoop.be")
  );
}).length;
const validPrice = raw.filter((r) => r.price > 1000).length;
console.log(`  Real (Zimmo or Immoweb) images: ${realImg}/${raw.length}`);
console.log(`  Valid prices:                   ${validPrice}/${raw.length}`);

if (raw.length >= 50 && realImg / raw.length < 0.7) {
  console.error("FATAL: < 70% of listings have real source images — possible parse failure. Aborting.");
  await prisma.$disconnect();
  process.exit(1);
}

// 4. Delete demo properties (anything with picsum.photos image — the seed signature)
const demosBefore = await prisma.property.count({
  where: { imageUrl: { contains: "picsum.photos" } },
});
console.log(`\n→ Deleting ${demosBefore} demo properties (with picsum images)...`);
const deleted = await prisma.property.deleteMany({
  where: { imageUrl: { contains: "picsum.photos" } },
});
console.log(`  Deleted ${deleted.count} demos (cascaded notes + priceHistory)`);

// 5. Upsert real
console.log(`\n→ Upserting ${raw.length} real listings into Neon...`);
let created = 0;
let updated = 0;
let failed = 0;
for (const r of raw) {
  try {
    const pricePerSqm = r.sqm && r.sqm > 0 ? Math.round(r.price / r.sqm) : null;
    const data = {
      source: r.source,
      sourceUrl: r.sourceUrl,
      url: r.url,
      title: r.title,
      price: r.price,
      pricePerSqm,
      sqm: r.sqm ?? null,
      rooms: r.rooms ?? null,
      type: r.type,
      address: r.address,
      city: r.city,
      municipality: r.municipality,
      postalCode: r.postalCode,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      imageUrl: r.imageUrl ?? null,
      imageUrls: r.imageUrls ?? [],
      publishedAt: r.publishedAt ?? null,
      agentEmail: r.agentEmail ?? null,
      agentName: r.agentName ?? null,
      agentPhone: r.agentPhone ?? null,
      lastSeenAt: new Date(),
      isActive: true,
    };
    const existing = await prisma.property.findUnique({
      where: { externalId: r.externalId },
      select: { id: true, price: true },
    });
    if (existing) {
      await prisma.property.update({ where: { id: existing.id }, data });
      if (existing.price !== r.price) {
        await prisma.priceHistory.create({ data: { propertyId: existing.id, price: r.price } });
      }
      updated++;
    } else {
      const c = await prisma.property.create({ data: { externalId: r.externalId, ...data } });
      await prisma.priceHistory.create({ data: { propertyId: c.id, price: r.price } });
      created++;
    }
  } catch (e) {
    failed++;
    if (failed <= 3) console.error(`  upsert failed for ${r.externalId}:`, e instanceof Error ? e.message : e);
  }
}
console.log(`  Created: ${created}, Updated: ${updated}, Failed: ${failed}`);

// 6. Recalc market averages — DELEGATES to the proper implementation in
// lib/market.ts (size buckets + winsorize + ±55% cap + 4-tier fallback).
// This ensures every scrape applies the same statistical safeguards as
// the standalone recalc script. Previously this file had its own inline
// naive recalc that ignored those safeguards.
console.log(`\n→ Recalculating market averages (winsorized, size-bucketed, capped)...`);
const { recalculateMarketAverages } = await import("../lib/market.ts");
const recalcResult = await recalculateMarketAverages();
console.log(`  groups: ${recalcResult.groupsComputed}, scored: ${recalcResult.propertiesUpdated}, capped(>55%→null): ${recalcResult.cappedOut}`);
const dcUpdated = recalcResult.propertiesUpdated;
console.log(`  Updated discountPct on ${dcUpdated} properties`);

// 7. Final stats
console.log(`\n=== FINAL STATS ===`);
const total = await prisma.property.count();
const agg = await prisma.property.aggregate({ _avg: { price: true, discountPct: true, pricePerSqm: true } });
const byCity = await prisma.$queryRaw`SELECT city, COUNT(*)::int as n FROM "Property" GROUP BY city ORDER BY n DESC LIMIT 10`;
const byType = await prisma.$queryRaw`SELECT type, COUNT(*)::int as n FROM "Property" GROUP BY type ORDER BY n DESC`;

console.log(`Total properties:     ${total}`);
console.log(`Avg price:            € ${Math.round(agg._avg.price || 0).toLocaleString("nl-BE")}`);
console.log(`Avg price/m²:         € ${Math.round(agg._avg.pricePerSqm || 0).toLocaleString("nl-BE")}`);
console.log(`Avg discount vs mkt:  ${(agg._avg.discountPct || 0).toFixed(2)}%`);
console.log(`\nTop 10 cities:`);
for (const r of byCity) console.log(`  ${r.city.padEnd(20)} ${r.n}`);
console.log(`\nBy type:`);
for (const r of byType) console.log(`  ${r.type.padEnd(20)} ${r.n}`);

console.log(`\nTotal elapsed: ${((Date.now() - start) / 1000).toFixed(1)}s`);
await prisma.$disconnect();
