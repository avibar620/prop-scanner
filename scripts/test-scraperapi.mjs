// Smoke-test the ScraperAPI-backed scrapers against 3 cities only.
// No DB writes. Reports per-source counts + sample listings + dumps the
// first page's HTML to /tmp if a scraper returns 0 (so selectors can be
// debugged without burning more credits).
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { mkdirSync, writeFileSync } from "node:fs";

import { scrapeImmoweb } from "../lib/scrapers/immoweb.ts";
import { scrapeRealo } from "../lib/scrapers/realo.ts";
import { scrapeImmoscoop } from "../lib/scrapers/immoscoop.ts";
import { scraperFetch } from "../lib/scrapers/scraper-api.ts";

const AREAS = [
  { city: "Antwerpen", postalCode: "2000" },
  { city: "Brussel", postalCode: "1000" },
  { city: "Gent", postalCode: "9000" },
];

const OUT_DIR = "scrape-debug";
mkdirSync(OUT_DIR, { recursive: true });

async function dumpHtmlIfEmpty(label, fetcher) {
  console.log(`\n=== Dumping raw HTML sample for ${label} (debug) ===`);
  const html = await fetcher();
  if (html) {
    const path = `${OUT_DIR}/${label}.html`;
    writeFileSync(path, html);
    console.log(`  Saved ${html.length} bytes → ${path}`);
  } else {
    console.log("  scraperFetch returned null (gateway or upstream error).");
  }
}

async function runOne(label, fn, dumpUrl) {
  const t0 = Date.now();
  let items = [];
  try {
    items = await fn(AREAS);
  } catch (err) {
    console.log(`  THROW: ${err instanceof Error ? err.message : err}`);
  }
  const ms = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n=== ${label}: ${items.length} listings in ${ms}s ===`);

  if (items.length === 0 && dumpUrl) {
    await dumpHtmlIfEmpty(label.toLowerCase(), () => scraperFetch(dumpUrl, { render: true }));
    return;
  }

  // Report distribution + sample
  const byPostal = items.reduce((acc, p) => {
    acc[p.postalCode] = (acc[p.postalCode] ?? 0) + 1;
    return acc;
  }, {});
  console.log("  By postal:", JSON.stringify(byPostal));

  const withImg = items.filter((p) => p.imageUrl).length;
  const withSqm = items.filter((p) => p.sqm).length;
  const withRooms = items.filter((p) => p.rooms != null).length;
  console.log(`  withImg=${withImg}/${items.length}  withSqm=${withSqm}  withRooms=${withRooms}`);

  console.log("  First 3 listings:");
  for (const p of items.slice(0, 3)) {
    console.log(`    ${p.externalId.padEnd(22)} ${String(p.postalCode).padEnd(6)} ${p.type.padEnd(8)} €${p.price.toString().padStart(8)}  ${p.title.slice(0, 60)}`);
    console.log(`        url: ${p.url.slice(0, 100)}`);
  }
}

console.log(`SCRAPER_API_KEY: ${process.env.SCRAPER_API_KEY ? "present (" + process.env.SCRAPER_API_KEY.slice(0, 6) + "…)" : "MISSING"}`);
console.log(`Areas: ${AREAS.map((a) => `${a.city}-${a.postalCode}`).join(", ")}`);
console.log(`(MAX_PAGES_PER_AREA = 2 per scraper, render=true, country=be)`);

await runOne(
  "Immoweb",
  scrapeImmoweb,
  "https://www.immoweb.be/nl/zoeken/huis-en-appartement/te-koop?countries=BE&postalCodes=2000&page=1&orderBy=newest"
);
await runOne(
  "Realo",
  scrapeRealo,
  "https://www.realo.be/en/search/antwerp-2000"
);
await runOne(
  "Immoscoop",
  scrapeImmoscoop,
  "https://www.immoscoop.be/zoeken/te-koop/2000-antwerpen"
);

console.log("\nDone. If any scraper is 0, check scrape-debug/<source>.html and adjust selectors.");
