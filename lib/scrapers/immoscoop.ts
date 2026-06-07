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

const MAX_PAGES_PER_AREA = 5;

function buildUrl(postalCode: string, page: number): string {
  // Immoscoop filters by `postcode` and paginates with `pagina` (Dutch URL).
  const params = new URLSearchParams({ postcode: postalCode });
  if (page > 1) params.set("pagina", String(page));
  return `https://www.immoscoop.be/nl/te-koop?${params.toString()}`;
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
        const $ = await scraperFetch$(buildUrl(area.postalCode, page), { render: true });
        if (!$) break;

        const cards = $(
          "[data-testid*='listing'],[data-testid*='card']," +
            "article[class*='card'],article[class*='listing']," +
            "div[class*='property-card'],div[class*='estate-card'],div[class*='result-item']"
        );

        if (cards.length === 0) break;

        let added = 0;
        cards.each((_, el) => {
          const $el = $(el);
          const a = $el.find("a[href]").first();
          const href = a.attr("href") ?? "";
          if (!href) return;

          // Immoscoop detail URLs commonly include a numeric / slug-id suffix.
          const idMatch = href.match(/\/(\d{5,})(?:$|\?|#|\/)/) ?? href.match(/-(\d{5,})(?:$|\?|#)/);
          if (!idMatch) return;
          const externalId = `immoscoop-${idMatch[1]}`;
          if (seen.has(externalId)) return;

          const url = href.startsWith("http") ? href : `https://www.immoscoop.be${href}`;
          const priceText = $el.find("[class*='price'],[data-testid*='price']").first().text();
          const price = parseEuroPrice(priceText);
          if (!price) return;

          const title =
            trim($el.find("[class*='title'],[data-testid*='title'],h2,h3").first().text()) ||
            `Immoscoop ${idMatch[1]}`;

          const locationText = trim($el.find("[class*='location'],[class*='address']").first().text()) || area.city;
          const meta = trim($el.find("[class*='feature'],[class*='attribute'],[class*='meta']").first().text());
          const sqmMatch = meta.match(/(\d{2,4})\s*m/i);
          const sqm = sqmMatch ? parseInt(sqmMatch[1], 10) : undefined;
          const roomsMatch = meta.match(/(\d{1,2})\s*(?:slpk|slaapkamer|chambre|bedroom|kamer)/i);
          const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;

          const img = $el.find("img").first();
          const imageUrl = img.attr("src") ?? img.attr("data-src") ?? undefined;

          const postalMatch = locationText.match(/\b([1-9]\d{3})\b/);
          const postalCode = postalMatch ? postalMatch[1] : area.postalCode;

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
            address: locationText || area.city,
            city: extractCity(locationText) || area.city,
            municipality: area.city,
            postalCode,
            imageUrl,
            imageUrls: imageUrl ? [imageUrl] : [],
          });
          added += 1;
        });

        console.log(`[immoscoop] ${area.city} ${area.postalCode} p${page}: +${added} (cards=${cards.length})`);
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
