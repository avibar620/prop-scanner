import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { scraperFetch } from "../lib/scrapers/scraper-api.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";

mkdirSync("scrape-debug", { recursive: true });

const SITES = [
  { name: "realo", url: "https://www.realo.be/" },
  { name: "immoscoop", url: "https://www.immoscoop.be/" },
];

for (const { name, url } of SITES) {
  console.log(`\n=== ${name} (${url}) ===`);
  const html = await scraperFetch(url, { render: false, timeoutMs: 30_000 });
  if (!html) {
    console.log("  fetch failed");
    continue;
  }
  writeFileSync(`scrape-debug/${name}-home.html`, html);
  console.log(`  saved ${html.length} bytes to scrape-debug/${name}-home.html`);

  const $ = cheerio.load(html);

  // Form actions
  console.log("  forms:");
  $("form[action]").each((_, el) => {
    const action = $(el).attr("action");
    const method = $(el).attr("method") || "get";
    console.log(`    ${method.toUpperCase()} ${action}`);
  });

  // Links containing 'koop' / 'sale' / 'search' / 'zoek'
  const sigs = new Set();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (/koop|sale|search|zoek|listing|estate/i.test(href) && href.length < 200) {
      sigs.add(href);
    }
  });
  console.log(`  candidate hrefs (${sigs.size}):`);
  [...sigs].slice(0, 20).forEach((h) => console.log("    " + h));
}
