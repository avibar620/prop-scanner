// Cheap URL probe — render=false, just status codes — to find the right
// search-URL patterns for Realo + Immoscoop. ~1 credit/call vs ~10-25 for render.
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { scraperFetch } from "../lib/scrapers/scraper-api.ts";

const CANDIDATES = [
  // Realo
  { site: "realo", url: "https://www.realo.be/nl/te-koop?postalCode=2000" },
  { site: "realo", url: "https://www.realo.be/nl/zoeken?postalCode=2000" },
  { site: "realo", url: "https://www.realo.be/nl/zoeken?postcode=2000" },
  { site: "realo", url: "https://www.realo.be/nl/zoeken?postalCode=2000&transactionType=FORSALE" },
  { site: "realo", url: "https://www.realo.be/nl/2000-antwerpen/te-koop" },
  { site: "realo", url: "https://www.realo.be/nl/2000/te-koop" },
  { site: "realo", url: "https://www.realo.be/en/2000-antwerp/for-sale" },
  { site: "realo", url: "https://www.realo.be/" },
  // Immoscoop
  { site: "immoscoop", url: "https://www.immoscoop.be/nl/te-koop?postcode=2000" },
  { site: "immoscoop", url: "https://www.immoscoop.be/nl/zoeken?postcode=2000" },
  { site: "immoscoop", url: "https://www.immoscoop.be/te-koop?postcode=2000" },
  { site: "immoscoop", url: "https://www.immoscoop.be/zoek?postcode=2000" },
  { site: "immoscoop", url: "https://www.immoscoop.be/nl/koopwoningen?postcode=2000" },
  { site: "immoscoop", url: "https://www.immoscoop.be/" },
  // Immoweb — verify the working URL we used
  { site: "immoweb", url: "https://www.immoweb.be/nl/zoeken/huis-en-appartement/te-koop?countries=BE&postalCodes=2000" },
];

for (const { site, url } of CANDIDATES) {
  // render=false so each call is ~1 credit instead of ~10-25
  const html = await scraperFetch(url, { render: false, timeoutMs: 30_000 });
  if (html === null) {
    console.log(`[${site}] FAIL    ${url}`);
    continue;
  }
  // Sniff for shell vs 404 page
  const isLikelyNotFound =
    /404|not\s+found|page\s+not\s+found|pagina niet gevonden/i.test(html.slice(0, 4_000)) && html.length < 50_000;
  const tag = isLikelyNotFound ? "NF" : "OK";
  console.log(`[${site}] ${tag} ${html.length}B  ${url}`);
}
