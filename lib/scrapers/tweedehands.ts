import type { RawProperty } from "./types";
import { safeFetch, trim } from "./_helpers";
import type { CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

/**
 * 2dehands.be Immo scraper — https://www.2dehands.be
 *
 * EMPIRICALLY VERIFIED (2026-06-02):
 *   - Server-side rendered, 200 OK with browser UA
 *   - Category page: /l/immo/huizen-en-appartementen-te-koop/ (30 cards per page)
 *   - Pagination: /l/immo/huizen-en-appartementen-te-koop/p/N/
 *   - Card selector: .hz-Listing
 *   - URL pattern: /v/immo/{subcategory}/m{externalId}-{slug}
 *
 * Notes:
 *  - URL has no postal-code filter — we scrape the global list and derive postal
 *    from card location text, then fall back to a BE city→postal lookup table.
 *  - Listings whose location we cannot resolve to a Belgian postal are dropped.
 *  - Prices use Dutch number format ("€ 559.000,00"). Custom parser handles it.
 *  - We accept any `/v/immo/` subcategory except `buitenland` (foreign properties).
 */

const MAX_PAGES = 15;
const POLITE_DELAY_MIN_MS = 1_000;
const POLITE_DELAY_MAX_MS = 2_500;
const CATEGORY_URL = "https://www.2dehands.be/l/immo/huizen-en-appartementen-te-koop";

// Belgian postal codes for cities common on 2dehands listings.
// Key = lowercased city name; value = canonical 4-digit BE postal.
const BE_CITY_TO_POSTAL: Record<string, string> = {
  "antwerpen": "2000", "antwerp": "2000",
  "deurne": "2100", "borgerhout": "2140", "merksem": "2170", "ekeren": "2180",
  "berchem": "2600", "wilrijk": "2610", "hoboken": "2660", "borsbeek": "2150",
  "kontich": "2550", "edegem": "2650", "mortsel": "2640", "boechout": "2530",
  "lier": "2500", "duffel": "2570", "schoten": "2900", "brasschaat": "2930",
  "kapellen": "2950", "kalmthout": "2920", "essen": "2910",
  "gent": "9000", "ghent": "9000", "ledeberg": "9050", "drongen": "9031",
  "mariakerke": "9030", "sint-amandsberg": "9040", "melle": "9090",
  "brussel": "1000", "bruxelles": "1000", "brussels": "1000",
  "laken": "1020", "schaarbeek": "1030", "etterbeek": "1040",
  "elsene": "1050", "ixelles": "1050", "sint-gillis": "1060", "saint-gilles": "1060",
  "anderlecht": "1070", "molenbeek": "1080", "ganshoren": "1083",
  "leuven": "3000", "louvain": "3000", "heverlee": "3001",
  "brugge": "8000", "bruges": "8000", "sint-andries": "8200",
  "mechelen": "2800", "malines": "2800", "walem": "2801",
  "hasselt": "3500", "kortrijk": "8500", "courtrai": "8500",
  "aalst": "9300", "alost": "9300", "sint-niklaas": "9100",
  "roeselare": "8800", "genk": "3600", "turnhout": "2300",
  "namur": "5000", "namen": "5000", "liege": "4000", "luik": "4000",
  "mons": "7000", "bergen": "7000", "charleroi": "6000",
  "oostende": "8400", "ostende": "8400", "ostend": "8400",
  "lommel": "3920", "zele": "9240", "lokeren": "9160", "ronse": "9600",
  "tienen": "3300", "diest": "3290", "geel": "2440", "tongeren": "3700",
  "ieper": "8900", "ypres": "8900", "veurne": "8630", "diksmuide": "8600",
  "blankenberge": "8370", "knokke": "8300", "knokke-heist": "8300",
  "dendermonde": "9200", "ninove": "9400", "geraardsbergen": "9500",
  "halle": "1500", "vilvoorde": "1800", "asse": "1730", "dilbeek": "1700",
  "tervuren": "3080", "wezembeek-oppem": "1970", "kraainem": "1950",
  "waregem": "8790", "harelbeke": "8530", "izegem": "8870",
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function politeDelay(): Promise<void> {
  const ms = POLITE_DELAY_MIN_MS + Math.random() * (POLITE_DELAY_MAX_MS - POLITE_DELAY_MIN_MS);
  return sleep(ms);
}

/**
 * Parse Dutch-format euro price ("€ 559.000,00" → 559000).
 * Strips thousand-separator dots and discards the comma-decimal.
 */
function parseEuroPrice(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.match(/€\s*([\d.\s]+)(?:,\d{2})?/);
  if (!m) return undefined;
  const digits = m[1].replace(/[.\s]/g, "");
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 2dehands has no per-area URL — we ignore `areas` and pull the global list once per scrape.
 * The orchestrator may call us with multiple areas; we de-dupe internally.
 */
export async function scrape2dehands(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? `${CATEGORY_URL}/` : `${CATEGORY_URL}/p/${page}/`;
    const $ = await safeFetch(url, 25_000);
    if (!$) break;

    let rawCards = 0;
    const items: RawProperty[] = [];
    $(".hz-Listing").each((_, el) => {
      rawCards++;
      try {
        const parsed = parseCard($, el);
        if (!parsed) return;
        if (!seenIds.has(parsed.externalId)) {
          seenIds.add(parsed.externalId);
          items.push(parsed);
        }
      } catch (cardErr) {
        console.error(`[2dehands] card parse error:`, cardErr instanceof Error ? cardErr.message : cardErr);
      }
    });

    out.push(...items);
    console.log(`[2dehands] page ${page}: raw=${rawCards} kept=${items.length} cumulative=${out.length}`);

    if (rawCards === 0) break;
    if (rawCards < 15) break; // last (partial) page

    await politeDelay();
  }

  return out;
}

function parseCard($: CheerioAPI, el: Element): RawProperty | null {
  const $el = $(el);

  // Find an immo detail-page link inside this card. Accept any /v/immo/ subcategory
  // except `buitenland` (foreign properties). Skip non-immo categories (tuin, etc.)
  let link = "";
  $el.find("a[href]").each((_, a) => {
    const href = $(a).attr("href") || "";
    if (link) return;
    if (!href.startsWith("/v/immo/")) return;
    if (href.startsWith("/v/immo/buitenland/")) return;
    if (href.startsWith("/v/immo/buitenverblijven-te-koop/")) return; // vacation homes
    link = href;
  });
  if (!link) return null;

  const idMatch = link.match(/\/m(\d{6,})-/);
  if (!idMatch) return null;
  const externalId = `2dehands-${idMatch[1]}`;
  const fullUrl = `https://www.2dehands.be${link}`;

  const title = trim($el.find(".hz-Text--bodyLargeStrong").first().text()) || trim($el.find("h3").first().text());
  if (!title) return null;

  // Price: prefer the explicit .hz-Title field; reject text placeholders
  const priceText = trim($el.find(".hz-Title").first().text());
  if (/zie omschrijving|prijs o\.?t\.?k\.?|gratis/i.test(priceText)) return null;
  const price = parseEuroPrice(priceText);
  if (!price || price < 20_000) return null; // junk filter — real BE property is at least €20k

  // Location: hz-Listing-location-info renders as something like "Zele+Deel Lokeren"
  // Fall back to sellerInfo (which has "<seller name><location>" smushed).
  const locationText =
    trim($el.find("[class*='Location']").first().text()) ||
    trim($el.find(".hz-Listing-sellerInfo").first().text());

  // Skip non-Belgian listings (FR/ES/NL country codes or named countries)
  if (/,\s*(FR|ES|NL|DE|IT|PT|GR|UK|US|TR|MA)\s*$/i.test(locationText)) return null;
  if (/\b(France|Spain|Espagne|Italie|Italia|Allemagne|Portugal|Maroc|Marocco|Turkije|USA)\b/i.test(locationText)) return null;

  const primaryCity = locationText.split(/[+,]/)[0].trim();
  if (!primaryCity || primaryCity.length < 2) return null;

  // Postal code:
  //  1) Explicit 4-digit number in the location text itself (rare but happens, e.g. "9000 Gent")
  //  2) Lookup by city name in BE_CITY_TO_POSTAL
  // We deliberately do NOT scan title/altText for 4-digit numbers — too many false
  // positives like "1000 tot 1500 m²" (size range) or street numbers.
  let postalCode: string | undefined;
  const explicitPostal = locationText.match(/\b([1-9]\d{3})\b/);
  if (explicitPostal) {
    postalCode = explicitPostal[1];
  } else {
    const cityKey = primaryCity.toLowerCase().replace(/\s+/g, "-");
    postalCode = BE_CITY_TO_POSTAL[cityKey] ?? BE_CITY_TO_POSTAL[primaryCity.toLowerCase()];
  }
  if (!postalCode) return null;

  // sqm + rooms — use the img title attribute which is structured by 2dehands itself.
  // Example title: "Huis te koop, Immo, Huizen en Appartementen te koop, 1000 tot 1500 m², 82 m², 5 kamers, Hoekwoning"
  const altText = ($el.find("img").first().attr("title") || $el.find("img").first().attr("alt") || "");
  // Prefer "exact m²" (NN m² not "tot NN m²")
  const exactSqm = altText.match(/(?:^|,\s)(\d{2,4})\s*m²/);
  const sqm = exactSqm ? parseInt(exactSqm[1], 10) : undefined;
  const roomsMatch = altText.match(/(\d{1,2})\s*kamers?/i);
  const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;

  const type = inferType(title, altText);

  const $img = $el.find("img").first();
  const imageUrl = $img.attr("data-src") || $img.attr("src") || undefined;

  return {
    externalId,
    source: "2dehands Immo",
    sourceUrl: "https://www.2dehands.be",
    url: fullUrl,
    title,
    price,
    sqm,
    rooms,
    type,
    address: locationText || primaryCity,
    city: primaryCity,
    municipality: primaryCity,
    postalCode,
    imageUrl,
    imageUrls: imageUrl ? [imageUrl] : [],
  };
}

/**
 * Type inference. We strip the category name ("Huizen en Appartementen te koop")
 * before regex matching — it appears in every img-alt and otherwise pollutes the
 * signal. Then check title first (most specific), then the alt-text tail.
 */
function inferType(title: string, altText: string): string {
  // Most-specific signals first
  const titleLower = title.toLowerCase();
  if (/opbrengst|appartementsgebouw|meergezinswoning|meergezins/.test(titleLower)) return "apartmentBuilding";
  if (/handelspand|kantoor|commercieel|bedrijfsgebouw|loods|magazijn|winkel|horeca/.test(titleLower)) return "commercial";
  if (/bouwgrond|bouwperceel|landbouwgrond|tuingrond/.test(titleLower)) return "land";
  if (/\bappartement|\bstudio|\bflat\b|duplex|penthouse|\bloft/.test(titleLower)) return "apartment";
  if (/\bhuis\b|villa|hoekwoning|rijwoning|herenwoning|bungalow|woning/.test(titleLower)) return "house";

  // Fallback: examine alt text but strip the noisy category name
  const altClean = altText.toLowerCase().replace(/huizen en appartementen te koop/g, "");
  if (/opbrengst|appartementsgebouw|meergezins/.test(altClean)) return "apartmentBuilding";
  if (/handelspand|kantoor|commercieel|bedrijfsgebouw|loods|magazijn|winkel|horeca/.test(altClean)) return "commercial";
  if (/bouwgrond|bouwperceel|landbouwgrond/.test(altClean)) return "land";
  if (/\bappartement|\bstudio\b|duplex|penthouse|\bloft\b/.test(altClean)) return "apartment";
  if (/\bhuis\b|villa|hoekwoning|rijwoning|herenwoning|bungalow|woning/.test(altClean)) return "house";

  return "house";
}
