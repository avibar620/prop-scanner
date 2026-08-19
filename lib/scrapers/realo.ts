import type { RawProperty } from "./types";
import { scraperFetch$, scraperApiAvailable } from "./scraper-api";

/**
 * Realo scraper — https://www.realo.be
 *
 * Earlier direct-fetch attempts returned 404 because Realo segments inventory
 * by city slug + locale and SSRs cards inside a hashed-class grid. Routing
 * through ScraperAPI with render=true gives us the fully-hydrated grid so
 * cheerio can pull listings cleanly.
 *
 * NEVER throws — returns [] on any failure path.
 */

const MAX_PAGES_PER_AREA = 2; // Cap kept low to conserve ScraperAPI credits

// Realo's search URL embeds an English city slug + postal: /en/search/{slug}-{postal}.
// Most BE city slugs are just the lowercased Dutch name; a few have anglicised
// slugs (Antwerpen→antwerp, Brussel→brussels, Gent→ghent, Luik→liege).
const REALO_CITY_SLUG: Record<string, string> = {
  antwerpen: "antwerp",
  brussel: "brussels",
  bruxelles: "brussels",
  gent: "ghent",
  ghent: "ghent",
  liège: "liege",
  luik: "liege",
  namen: "namur",
  bergen: "mons",
};

function buildUrl(city: string, postalCode: string, page: number): string {
  const key = city.toLowerCase().trim();
  const slug = REALO_CITY_SLUG[key] ?? key.replace(/\s+/g, "-");
  const base = `https://www.realo.be/en/search/${slug}-${postalCode}`;
  return page > 1 ? `${base}?page=${page}` : base;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrapeRealo(
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

        // Realo's actual card class (verified live 2026-06-07) is
        // .component-estate-grid-item. Cards wrap an <a href="/en/{postal}-{slug}/{id}">.
        const cards = $(".component-estate-grid-item:not(.component-estate-grid-item--notification)");

        if (cards.length === 0) break;

        let added = 0;
        cards.each((_, el) => {
          const $el = $(el);
          const a = $el.find("a[href*='/en/']").first();
          const href = a.attr("href") ?? "";
          if (!href) return;

          // /en/{postal}-{slug}/{id} — id is the last 6-9 digit segment
          const idMatch = href.match(/\/(\d{6,9})(?:$|\?|#|\/)/);
          if (!idMatch) return;
          const externalId = `realo-${idMatch[1]}`;
          if (seen.has(externalId)) return;

          const url = href.startsWith("http") ? href : `https://www.realo.be${href}`;
          const priceText = $el.find("[class*='price'],[class*='Price']").first().text();
          const price = parseEuroPrice(priceText);
          if (!price) return;

          const title =
            trim($el.find("[class*='title'],h2,h3,h4").first().text()) ||
            `Realo ${idMatch[1]}`;
          const locationText = trim($el.find("[class*='location'],[class*='address']").first().text()) || area.city;

          // Realo renders attributes inline ("3 beds 2 baths 409m2"). The m²
          // marker appears as either "m²" (superscript) or "m2" (ASCII) —
          // accept both. Same flexibility for the rooms label.
          const cardText = $el.text();
          const sqmMatch = cardText.match(/(\d{2,4})\s*m[²2]\b/i);
          const sqm = sqmMatch ? parseInt(sqmMatch[1], 10) : undefined;
          // Realo uses "3 beds" — match "bed" or "beds" plus the usual NL/FR labels.
          const roomsMatch = cardText.match(/(\d{1,2})\s*(?:bedrooms?|beds?\b|slpk|slaapkamers?|chambres?|kamers?)/i);
          const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;

          const img = $el.find("img").first();
          const imageUrl = img.attr("src") ?? img.attr("data-src") ?? undefined;

          // Prefer the URL-derived postal — the /en/{postal}-... slug is
          // authoritative for Realo, whereas the rendered location-text might
          // mention a parent municipality.
          const urlPostalMatch = href.match(/\/(\d{4})-/);
          const postalCode = urlPostalMatch ? urlPostalMatch[1] : area.postalCode;

          seen.add(externalId);
          out.push({
            externalId,
            source: "Realo",
            sourceUrl: "https://www.realo.be",
            url,
            title,
            price,
            sqm,
            rooms,
            type: inferType(title),
            address: locationText || area.city,
            city: extractCity(locationText) || area.city,
            municipality: area.city,
            postalCode,
            imageUrl,
            imageUrls: imageUrl ? [imageUrl] : [],
          });
          added += 1;
        });

        console.log(`[realo] ${area.city} ${area.postalCode} p${page}: +${added} (cards=${cards.length})`);
        if (added === 0) break;
        await sleep(300);
      }
    } catch (err) {
      console.error(`[realo] area ${area.city} ${area.postalCode} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return out;
}

function parseEuroPrice(s: string | undefined): number | undefined {
  if (!s) return undefined;
  // Match Dutch format ("€ 350.000,00") OR plain digits with separators.
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
  // "Antwerpen 2000" or "2000 Antwerpen" — return "Antwerpen".
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
