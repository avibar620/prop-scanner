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
  const seenIds = new Set<string>();

  for (const area of areas) {
    try {
      const citySlug = area.city.toLowerCase().replace(/\s+/g, "-");
      const baseUrl = `https://www.zimmo.be/nl/${citySlug}-${area.postalCode}/te-koop/`;

      let areaCount = 0;
      for (let page = 1; page <= MAX_PAGES_PER_AREA; page++) {
        const url = `${baseUrl}?p=${page}`;
        const $ = await safeFetch(url, 25_000);
        if (!$) break;

        // RAW count = how many cards Zimmo returned (drives pagination decisions)
        // DEDUPED count = how many we actually keep (drives output)
        let rawCount = 0;
        const items: RawProperty[] = [];
        $(".property-item").each((_, el) => {
          try {
            const parsed = parseCard($, el, area);
            if (!parsed) return;
            rawCount++;
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

        // Stop based on RAW card count from Zimmo, not on what survived dedup.
        // A page where every card was a dup is still a "full page" from Zimmo's POV.
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

function inferType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("opbrengst") || t.includes("appartementsgebouw")) return "apartmentBuilding";
  if (t.includes("handelspand") || t.includes("kantoor") || t.includes("commercieel")) return "commercial";
  if (t.includes("bouwgrond") || t.includes("grond")) return "land";
  if (t.includes("appartement") || t.includes("studio") || t.includes("flat")) return "apartment";
  if (t.includes("huis") || t.includes("woning") || t.includes("villa")) return "house";
  return "house";
}
