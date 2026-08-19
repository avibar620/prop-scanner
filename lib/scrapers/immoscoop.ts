import type { RawProperty } from "./types";
import { scraperFetch$, scraperApiAvailable } from "./scraper-api";

/**
 * Immoscoop scraper — https://www.immoscoop.be
 *
 * Routes through ScraperAPI (render=true) like the other big BE sites
 * because Immoscoop also gates direct IP fetches behind anti-bot.
 *
 * NEVER throws — returns [] on any failure path.
 */

// Immoscoop returns all listings for an area on page 1 (verified live
// 2026-06-07 — `?pagina=2` returns the same anchors). Stop at page 1.
const MAX_PAGES_PER_AREA = 1;

// Immoscoop search URL: /zoeken/te-koop/{postal}-{city-slug} (Dutch city
// names, lowercased, hyphenated). Pagination uses ?pagina=N.
function buildUrl(city: string, postalCode: string, page: number): string {
  const slug = city.toLowerCase().trim().replace(/\s+/g, "-");
  const base = `https://www.immoscoop.be/zoeken/te-koop/${postalCode}-${slug}`;
  return page > 1 ? `${base}?pagina=${page}` : base;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrapeImmoscoop(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  if (!scraperApiAvailable()) return [];

  const out: RawProperty[] = [];
  const seen = new Set<string>();

  for (const area of areas) {
    try {
      for (let page = 1; page <= MAX_PAGES_PER_AREA; page++) {
        const $ = await scraperFetch$(buildUrl(area.city, area.postalCode, page), { render: true });
        if (!$) break;

        // Anchor-first: each listing has exactly one `/te-koop/{postal}-{city}/{id}` link.
        // We walk anchors then ascend to the nearest card (.card_card__*) for metadata.
        const anchors = $("a[href^='/te-koop/']");
        const idToAnchor = new Map<string, ReturnType<typeof $>>();
        anchors.each((_, el) => {
          const href = $(el).attr("href") ?? "";
          const m = href.match(/\/te-koop\/[^/]+\/(\d{5,})(?:$|\?|#|\/)/);
          if (!m) return;
          if (!idToAnchor.has(m[1])) idToAnchor.set(m[1], $(el));
        });

        if (idToAnchor.size === 0) break;

        let added = 0;
        for (const [id, $a] of idToAnchor.entries()) {
          const href = $a.attr("href") ?? "";
          if (!href) continue;
          const externalId = `immoscoop-${id}`;
          if (seen.has(externalId)) continue;

          // The anchor itself contains the full card content (price, title,
          // attributes, image) — verified live 2026-06-07. No need to ascend.
          const card = $a;

          const url = href.startsWith("http") ? href : `https://www.immoscoop.be${href}`;

          // Price: Immoscoop renders it as just digits with €, in a known class.
          const priceText =
            trim(card.find("[class*='price'],[class*='Price']").first().text()) || trim(card.text());
          const price = parseEuroPrice(priceText);
          if (!price) continue;

          // Title: the card's heading element, fallback to anchor text.
          const title =
            trim(card.find("h1,h2,h3,h4,[class*='title']").first().text()) || trim($a.text()) || `Immoscoop ${id}`;

          // Immoscoop renders attributes as "Bewoonbare oppervlakte (m²)\n\n…
          // 59\n\nAantal slaapkamers\n\n…1Aantal badkamers…". The gap between
          // label and number is often 20+ whitespace chars — use \s* so it
          // can swallow any amount of whitespace.
          const cardText = card.text();
          const sqmAfter = cardText.match(/(?:Bewoonbare\s+oppervlakte|oppervlakte|surface)[^\d]{0,40}(\d{2,4})/i);
          const sqmBefore = cardText.match(/(\d{2,4})\s*m[²2]\b/i);
          const sqm = sqmAfter ? parseInt(sqmAfter[1], 10) : sqmBefore ? parseInt(sqmBefore[1], 10) : undefined;
          const roomsAfter = cardText.match(/(?:slaapkamers?|bedrooms?|chambres?)[^\d]{0,40}(\d{1,2})/i);
          const roomsBefore = cardText.match(/(\d{1,2})\s*(?:slpk|slaapkamer|kamer|bedroom)/i);
          const rooms = roomsAfter ? parseInt(roomsAfter[1], 10) : roomsBefore ? parseInt(roomsBefore[1], 10) : undefined;

          const img = card.find("img").first();
          const imageUrl = img.attr("src") ?? img.attr("data-src") ?? undefined;

          // The URL slug embeds postal: /te-koop/{postal}-{city}/{id}. That's
          // authoritative — prefer it over any rendered text.
          const urlPostalMatch = href.match(/\/te-koop\/(\d{4})-([a-z-]+)/i);
          const postalCode = urlPostalMatch ? urlPostalMatch[1] : area.postalCode;
          const citySlug = urlPostalMatch ? urlPostalMatch[2] : area.city.toLowerCase();
          const city = citySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

          seen.add(externalId);
          out.push({
            externalId,
            source: "Immoscoop",
            sourceUrl: "https://www.immoscoop.be",
            url,
            title,
            price,
            sqm,
            rooms,
            type: inferType(title),
            address: city,
            city,
            municipality: area.city,
            postalCode,
            imageUrl,
            imageUrls: imageUrl ? [imageUrl] : [],
          });
          added += 1;
        }

        console.log(`[immoscoop] ${area.city} ${area.postalCode} p${page}: +${added} (anchors=${idToAnchor.size})`);
        if (added === 0) break;
        await sleep(300);
      }
    } catch (err) {
      console.error(`[immoscoop] area ${area.city} ${area.postalCode} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return out;
}

function parseEuroPrice(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.match(/€\s*([\d.\s]+)(?:,\d{2})?|(\d[\d.\s]+)/);
  if (!m) return undefined;
  const digits = (m[1] ?? m[2] ?? "").replace(/[.\s]/g, "");
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n >= 10_000 ? n : undefined;
}

function trim(s: string | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function extractCity(locationText: string): string {
  const m = locationText.match(/([A-Za-zÀ-ÿ\s-]{3,})/);
  return m ? m[1].trim().slice(0, 40) : locationText;
}

function inferType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("opbrengst") || t.includes("appartementsgebouw") || t.includes("meergezins")) return "apartmentBuilding";
  if (t.includes("handelspand") || t.includes("kantoor") || t.includes("commercieel") || t.includes("bedrijf") || t.includes("loods") || t.includes("magazijn") || t.includes("winkel"))
    return "commercial";
  if (t.includes("bouwgrond") || t.includes("perceel") || t.includes("grond")) return "land";
  if (t.includes("appartement") || t.includes("studio") || t.includes("flat") || t.includes("duplex") || t.includes("penthouse")) return "apartment";
  if (t.includes("huis") || t.includes("woning") || t.includes("villa")) return "house";
  return "house";
}
