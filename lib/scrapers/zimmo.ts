import type { RawProperty } from "./types";
import { safeFetch, parseIntSafe, trim } from "./_helpers";
import type { CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

/**
 * Zimmo scraper — https://www.zimmo.be
 *
 * EMPIRICALLY VERIFIED (2026-05-27 + pagination 2026-05-31):
 *   - Server-side rendered HTML, 200 OK with browser UA
 *   - Listing cards: `.property-item` (21 per page)
 *   - Sub-selectors: .property-item_{link,price,title,address,meta-info,photo-container}
 *   - URL pattern: https://www.zimmo.be/nl/{city-lower}-{postalCode}/te-koop/
 *   - PAGINATION: simple `?p=N`. Last page returns < 21 items; next page returns 0.
 *     Gent 9000 = 45 pages (~942 listings). Smaller areas finish in 1-2 pages.
 */

const MAX_PAGES_PER_AREA = 12; // 12 × 21 = 252 listings per area (meets user's ≥200 goal)
const POLITE_DELAY_MIN_MS = 1_200;
const POLITE_DELAY_MAX_MS = 2_800;
const PAGE_SIZE = 21;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function politeDelay(): Promise<void> {
  const ms = POLITE_DELAY_MIN_MS + Math.random() * (POLITE_DELAY_MAX_MS - POLITE_DELAY_MIN_MS);
  return sleep(ms);
}

export async function scrapeZimmo(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];

  // De-dupe baseUrls across areas: for cities like Antwerpen, every sub-postal
  // area resolves to the same `/nl/antwerpen/te-koop/` URL, so we'd otherwise
  // hit it 14 times. Skip if we've already scraped this URL in this run.
  const scrapedBaseUrls = new Set<string>();

  for (const area of areas) {
    // seenIds is per-area: Zimmo's per-postal URLs are over-inclusive. The
    // earlier global-Set design caused later areas (e.g. 2018) to come up empty
    // because the first area "claimed" everything. With per-area Sets, every
    // area gets full coverage; upsert-by-externalId in the writer step
    // collapses duplicates.
    const seenIds = new Set<string>();

    try {
      const citySlug = area.city.toLowerCase().replace(/\s+/g, "-");

      // Multi-postal cities have broken per-postal URLs on Zimmo. Empirically
      // verified 2026-06-02:
      //   /antwerpen-2018/, /antwerpen-2100/ … all serve the SAME 2040 inventory
      //   /mechelen-2800/   == /mechelen-2801/ (both = 188 same listings)
      // The city-level URL `/nl/{city}/te-koop/` correctly aggregates inventory
      // across all sub-postals; our address-line parser then assigns each
      // listing to its real postal. For these cities we strip the postal.
      const MULTI_POSTAL_CITIES = new Set(["antwerpen", "brussel", "gent", "brugge", "mechelen", "leuven"]);
      const baseUrl = MULTI_POSTAL_CITIES.has(citySlug)
        ? `https://www.zimmo.be/nl/${citySlug}/te-koop/`
        : `https://www.zimmo.be/nl/${citySlug}-${area.postalCode}/te-koop/`;

      if (scrapedBaseUrls.has(baseUrl)) {
        console.log(`[zimmo] ${area.city} ${area.postalCode}: skipped (URL already scraped this run)`);
        continue;
      }
      scrapedBaseUrls.add(baseUrl);

      let areaCount = 0;
      for (let page = 1; page <= MAX_PAGES_PER_AREA; page++) {
        const url = `${baseUrl}?p=${page}`;
        const $ = await safeFetch(url, 25_000);
        if (!$) break;

        // Pagination is driven by how many cards Zimmo's HTML actually contains
        // — NOT by parseCard success count. A page with 21 cards where 1 has a
        // missing price still counts as a full page; we keep going to page+1.
        // (Previous bug: any single unparseable card would terminate pagination.)
        const cardEls = $(".property-item");
        const rawCount = cardEls.length;

        const items: RawProperty[] = [];
        cardEls.each((_, el) => {
          try {
            const parsed = parseCard($, el, area);
            if (!parsed) return;
            if (!seenIds.has(parsed.externalId)) {
              seenIds.add(parsed.externalId);
              items.push(parsed);
            }
          } catch (cardErr) {
            console.error(`[zimmo] card parse error:`, cardErr instanceof Error ? cardErr.message : cardErr);
          }
        });

        out.push(...items);
        areaCount += items.length;

        if (rawCount === 0) break;          // truly past the end
        if (rawCount < PAGE_SIZE) break;    // last partial page

        await politeDelay();
      }

      console.log(`[zimmo] ${area.city} ${area.postalCode}: ${areaCount} listings`);
      await politeDelay();
    } catch (areaErr) {
      console.error(`[zimmo] area ${area.city} ${area.postalCode} failed:`, areaErr);
    }
  }

  return out;
}

function parseCard(
  $: CheerioAPI,
  el: Element,
  area: { city: string; postalCode: string }
): RawProperty | null {
  const $el = $(el);

  const link =
    $el.find(".property-item_link").attr("href") ||
    $el.find('a[href*="/details/"]').attr("href") ||
    $el.find("a").first().attr("href");
  if (!link) return null;

  const fullUrl = link.startsWith("http") ? link : `https://www.zimmo.be${link}`;

  // Zimmo listing IDs look like /te-koop/{type}/LNQVG/ — short uppercase code after the type segment.
  // This is the most reliable & unique ID across all listings.
  const zimmoCodeMatch = fullUrl.match(/\/te-koop\/[a-z-]+\/([A-Z0-9]{4,8})(?:\/|\?|$)/);
  const numericIdMatch = fullUrl.match(/\/(\d{6,})(?:[/?]|$)/);
  // Strip ?p=N before hashing so the same listing on page 1 vs 2 collapses to the same id
  const cleanUrl = fullUrl.replace(/[?&]p=\d+/g, "").replace(/[?&]$/, "");
  const externalId = zimmoCodeMatch
    ? `zimmo-${zimmoCodeMatch[1]}`
    : numericIdMatch
    ? `zimmo-${numericIdMatch[1]}`
    : `zimmo-${Buffer.from(cleanUrl).toString("base64").replace(/[+/=]/g, "").slice(-24)}`;

  const priceText = trim($el.find(".property-item_price").text());
  const price = parseIntSafe(priceText);
  if (!price || price < 1000) return null;

  const title = trim($el.find(".property-item_title").text()) || trim($el.find("h2, h3").first().text()) || "Onbekend";
  const addressLine = trim($el.find(".property-item_address").text());
  const meta = trim($el.find(".property-item_meta-info").text());

  const sqmMatch = meta.match(/(\d{2,4})\s*m/i);
  const sqm = sqmMatch ? parseInt(sqmMatch[1], 10) : undefined;
  const roomsMatch = meta.match(/(\d{1,2})\s*$/);
  const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;

  const type = inferType(title);
  const imageUrl =
    $el.find("img").first().attr("src") ||
    $el.find("img").first().attr("data-src") ||
    undefined;

  let postalCode = area.postalCode;
  let city = area.city;
  let address = addressLine;
  const apMatch = addressLine.match(/(\d{4})\s+([A-Za-zÀ-ÿ\s-]+)/);
  if (apMatch) {
    postalCode = apMatch[1];
    city = apMatch[2].trim();
    address = trim(addressLine.replace(apMatch[0], "").replace(/,\s*$/, ""));
    if (!address) address = `${apMatch[1]} ${apMatch[2]}`.trim();
  }

  return {
    externalId,
    source: "Zimmo",
    sourceUrl: "https://www.zimmo.be",
    url: fullUrl,
    title,
    price,
    sqm,
    rooms,
    type,
    address: address || addressLine || "",
    city,
    municipality: city,
    postalCode,
    imageUrl,
    imageUrls: imageUrl ? [imageUrl] : [],
  };
}

/**
 * Heuristic type-from-title classifier (Dutch/Flemish Zimmo titles).
 * Order matters: most specific first. Last resort = "house".
 */
export function inferType(title: string): string {
  const t = title.toLowerCase();
  // Multi-unit residential
  if (t.includes("opbrengst") || t.includes("appartementsgebouw")) return "apartmentBuilding";
  // Commercial / industrial (broader catch — added bedrijf, loods, magazijn, garage, hangar, atelier)
  if (
    t.includes("handelspand") ||
    t.includes("kantoor") ||
    t.includes("commercieel") ||
    t.includes("commercieel gebouw") ||
    t.includes("bedrijf") ||           // bedrijfsgebouw, bedrijfspand
    t.includes("loods") ||
    t.includes("magazijn") ||
    t.includes("atelier") ||
    t.includes("hangar") ||
    t.includes("winkel") ||
    t.includes("horeca")
  ) return "commercial";
  // Land — added bos (forest), weide (meadow), perceel (plot), tuingrond, akker, landbouwgrond
  if (
    t.includes("bouwgrond") ||
    t.includes("bouwperceel") ||
    t.includes("perceel") ||
    t.includes("bos") ||
    t.includes("weide") ||
    t.includes("akker") ||
    t.includes("landbouwgrond") ||
    t.includes("tuingrond") ||
    t.includes("grond")               // generic "grond" last so specific terms win
  ) return "land";
  // Apartments
  if (t.includes("appartement") || t.includes("studio") || t.includes("flat") || t.includes("duplex") || t.includes("penthouse")) return "apartment";
  // Houses
  if (t.includes("huis") || t.includes("woning") || t.includes("villa") || t.includes("herenwoning") || t.includes("rijhuis")) return "house";
  return "house";
}
