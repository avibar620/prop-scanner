// Test harness — runs every registered scraper against a sample area and reports counts.
// Usage: npx tsx scripts/test-scrapers.mjs
import { scrapeZimmo } from "../lib/scrapers/zimmo.ts";
import { scrapeImmoweb } from "../lib/scrapers/immoweb.ts";
import { scrapeRealo } from "../lib/scrapers/realo.ts";
import { scrapeImmo } from "../lib/scrapers/immo.ts";
import { scrapeLogicImmo } from "../lib/scrapers/logicimmo.ts";
import { scrapeEra } from "../lib/scrapers/era.ts";
import { scrapeCentury21 } from "../lib/scrapers/century21.ts";
import { scrapeBiddit } from "../lib/scrapers/biddit.ts";
import { scrapeHebbes } from "../lib/scrapers/hebbes.ts";
import { scrapeImmovlan } from "../lib/scrapers/immovlan.ts";
import { scrapeTroostwijk } from "../lib/scrapers/troostwijk.ts";
import { scrapeNotaris } from "../lib/scrapers/notaris.ts";
import { scrapeRemax } from "../lib/scrapers/remax.ts";
import { scrapeSothebys } from "../lib/scrapers/sothebys.ts";
import { scrapeEngelVoelkers } from "../lib/scrapers/engelvoelkers.ts";
import { scrapeTrevi } from "../lib/scrapers/trevi.ts";
import { scrapeLatourPetit } from "../lib/scrapers/latourpetit.ts";
import { scrapeImmoFrancken } from "../lib/scrapers/immofrancken.ts";
import { scrapeDewaele } from "../lib/scrapers/dewaele.ts";
import { scrapeConfidence } from "../lib/scrapers/confidence.ts";
import { scrapeSyndicOne } from "../lib/scrapers/syndicone.ts";
import { scrapeAxelImmo } from "../lib/scrapers/axelimmo.ts";
import { scrapeImmoWouters } from "../lib/scrapers/immowouters.ts";
import { scrapeImmoCorner } from "../lib/scrapers/immocorner.ts";
import { scrapeImmoPicke } from "../lib/scrapers/immopicke.ts";
import { scrape2dehands } from "../lib/scrapers/tweedehands.ts";
import { scrapeKapaza } from "../lib/scrapers/kapaza.ts";
import { scrapeImmoNervia } from "../lib/scrapers/immonervia.ts";
import { scrapeImmoMechelen } from "../lib/scrapers/immomechelen.ts";

const SCRAPERS = [
  ["Zimmo", scrapeZimmo],
  ["Immoweb", scrapeImmoweb],
  ["Realo", scrapeRealo],
  ["Immo.be", scrapeImmo],
  ["Logic-Immo", scrapeLogicImmo],
  ["ERA Belgium", scrapeEra],
  ["Century21 Belgium", scrapeCentury21],
  ["BidditImmo", scrapeBiddit],
  ["Hebbes", scrapeHebbes],
  ["Immovlan", scrapeImmovlan],
  ["Troostwijk", scrapeTroostwijk],
  ["Notaris.be", scrapeNotaris],
  ["RE/MAX Belgium", scrapeRemax],
  ["Sotheby's Belgium", scrapeSothebys],
  ["Engel & Völkers", scrapeEngelVoelkers],
  ["Trevi", scrapeTrevi],
  ["Latour & Petit", scrapeLatourPetit],
  ["Immo Francken", scrapeImmoFrancken],
  ["Dewaele", scrapeDewaele],
  ["Confidence Immo", scrapeConfidence],
  ["Syndic One", scrapeSyndicOne],
  ["Axel Immo", scrapeAxelImmo],
  ["Immo Wouters", scrapeImmoWouters],
  ["Immo Corner", scrapeImmoCorner],
  ["Immo Pické", scrapeImmoPicke],
  ["2dehands Immo", scrape2dehands],
  ["Kapaza", scrapeKapaza],
  ["Immo Nervia", scrapeImmoNervia],
  ["Immo Mechelen", scrapeImmoMechelen],
];

const SAMPLE_AREA = [{ city: "Antwerpen", postalCode: "2000" }];

console.log(`Testing ${SCRAPERS.length} scrapers against ${SAMPLE_AREA.length} sample area\n`);
console.log("Source                       Items   Time      Status");
console.log("---------------------------- ------- --------- ---------------");

const results = [];
for (const [name, fn] of SCRAPERS) {
  const start = Date.now();
  let items = [];
  let err = "";
  try {
    items = await Promise.race([
      fn(SAMPLE_AREA),
      new Promise((_, rej) => setTimeout(() => rej(new Error("30s timeout")), 30_000)),
    ]);
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  const ms = Date.now() - start;
  const status = err ? `ERROR ${err.slice(0,30)}` : items.length > 0 ? "WORKING ✓" : "STUB (returns [])";
  console.log(`${name.padEnd(28)} ${String(items.length).padStart(7)} ${String(ms).padStart(6)}ms  ${status}`);
  results.push({ name, count: items.length, ms, err });
}

const working = results.filter(r => r.count > 0);
const stubs = results.filter(r => r.count === 0 && !r.err);
const errs = results.filter(r => r.err);
console.log("\n=== SUMMARY ===");
console.log(`Total scrapers:         ${results.length}`);
console.log(`Working (returned data): ${working.length}  — ${working.map(r => `${r.name}(${r.count})`).join(", ")}`);
console.log(`Stubs (returned []):     ${stubs.length}`);
console.log(`Errors:                  ${errs.length}`);
console.log(`Total listings fetched:  ${results.reduce((a, r) => a + r.count, 0)}`);
