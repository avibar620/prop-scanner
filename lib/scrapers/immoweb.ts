import type { RawProperty } from "./types";
import { scraperFetch$, scraperApiAvailable } from "./scraper-api";
import type { CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

/**
 * Immoweb scraper — https://www.immoweb.be
 *
 * After empirical inspection (2026-06-07) of a live render via ScraperAPI:
 *   - No window.classifieds / __NEXT_DATA__ / __INITIAL_STATE__ / JSON-LD
 *     exists; window.search is hydrated client-side only.
 *   - 31 actual result cards per page, found via class `.card--result`.
 *   - Detail-page URL pattern: /nl/zoekertje/{type}/te-koop/{city}/{postal}/{id}
 *     ID is always a 7-8 digit integer at the end.
 *
 * So we ignore embedded JSON entirely and walk `a[href*='/zoekertje/']`,
 * then climb up to the surrounding `.card--result` for price + meta.
 *
 * NEVER throws — returns RawProperty[] always, [] on any failure.
 */

const MAX_PAGES_PER_AREA = 2; // Cap kept low to conserve ScraperAPI credits
const POLITE_DELAY_MS = 300;

function buildSearchUrl(postalCode: string, page: number): string {
  const params = new URLSearchParams({
    countries: "BE",
    postalCodes: postalCode,
    page: String(page),
    orderBy: "newest",
  });
  return `https://www.immoweb.be/nl/zoeken/huis-en-appartement/te-koop?${params.toString()}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrapeImmoweb(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  if (!scraperApiAvailable()) return [];

  const out: RawProperty[] = [];
  const seen = new Set<string>();

  for (const area of areas) {
    try {
      for (let page = 1; page <= MAX_PAGES_PER_AREA; page++) {
        const $ = await scraperFetch$(buildSearchUrl(area.postalCode, page), { render: true });
        if (!$) break;

        const items = extractCards($, area);
        let added = 0;
        for (const p of items) {
          if (seen.has(p.externalId)) continue;
          seen.add(p.externalId);
          out.push(p);
          added += 1;
        }
        console.log(`[immoweb] ${area.city} ${area.postalCode} p${page}: +${added} (raw=${items.length})`);
        if (items.length === 0) break;
        await sleep(POLITE_DELAY_MS);
      }
    } catch (err) {
      console.error(`[immoweb] area ${area.city} ${area.postalCode} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return out;
}

function extractCards($: CheerioAPI, area: { city: string; postalCode: string }): RawProperty[] {
  // Walk listing-detail anchors and dedupe by id (multiple anchors per card —
  // image, title, price overlay).
  const seenIds = new Set<string>();
  const out: RawProperty[] = [];

  $("a[href*='/zoekertje/']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    // Expected: /nl/zoekertje/{type}/te-koop/{city}/{postal}/{id}
    const m = href.match(/\/zoekertje\/([a-z-]+)\/[a-z-]+\/[a-z0-9-]+\/(\d{4})\/(\d{6,})/i);
    if (!m) return;
    const [, ttype, urlPostal, id] = m;
    if (seenIds.has(id)) return;
    seenIds.add(id);

    const url = href.startsWith("http") ? href : `https://www.immoweb.be${href}`;
    const card = closest($, el, ".card--result, .card--list-classified, article.card");
    const $card = card ?? $(el);

    const priceText =
      trim($card.find(".card--result__price, .card--list-classified__price, [class*='card--result__price'], [class*='price']").first().text());
    const price = parseEuroPrice(priceText);
    if (!price) return;

    const titleParts = [
      trim($card.find("[class*='card--result__title-locality'], [class*='title'], h2, h3").first().text()),
    ].filter(Boolean);
    const title = titleParts[0] || prettifyType(ttype);

    const meta = trim($card.find("[class*='card--result__information'], [class*='card--result__meta'], [class*='attributes']").first().text());
    const sqmMatch = meta.match(/(\d{2,4})\s*m/i);
    const sqm = sqmMatch ? parseInt(sqmMatch[1], 10) : undefined;
    const roomsMatch = meta.match(/(\d{1,2})\s*(?:slpk|slaapkamer|chambre|bedroom)/i);
    const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;

    const $img = $card.find("img").first();
    const imageUrl = $img.attr("src") ?? $img.attr("data-src") ?? $img.attr("data-srcset")?.split(" ")[0] ?? undefined;

    out.push({
      externalId: `immoweb-${id}`,
      source: "Immoweb",
      sourceUrl: "https://www.immoweb.be",
      url,
      title,
      price,
      sqm,
      rooms,
      type: inferType(ttype, title),
      address: area.city,
      city: area.city,
      municipality: area.city,
      postalCode: urlPostal || area.postalCode,
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
    });
  });
  return out;
}

function closest($: CheerioAPI, el: Element, selector: string) {
  const $el = $(el);
  const c = $el.closest(selector);
  return c.length > 0 ? c : null;
}

/**
 * Parse a Euro price out of free-form card text. Immoweb's price element
 * frequently smushes two copies together — verified live:
 *   `"€ 550.000 - € 1.050.000* Van 550000€ Tot 1050000€ Gesponsord"`
 *   or for single ranges: `"€ 1.650.000* € 1.650.000"` /
 *                          `"€ 1.650.0001.650.000"` (no separator)
 * Strategy: capture the longest "[digit][digit.space,comma]*" run after the
 * first €, then if the digit string is even-length and the first half
 * matches the second half, halve it (de-duplication). Final hard cap at
 * 8 digits to filter garbage.
 */
function parseEuroPrice(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.match(/€\s*([\d][\d.\s,]*)/);
  if (!m) return undefined;
  let digits = m[1].replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  if (digits.length >= 12 && digits.length % 2 === 0) {
    const h = digits.length / 2;
    if (digits.slice(0, h) === digits.slice(h)) digits = digits.slice(0, h);
  }
  if (digits.length > 8) digits = digits.slice(0, 8);
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n >= 10_000 ? n : undefined;
}

function trim(s: string | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function prettifyType(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferType(urlType: string, title: string): string {
  const u = urlType.toLowerCase();
  if (u.includes("appartement") || u.includes("studio")) return "apartment";
  if (u.includes("huis") || u.includes("woning") || u.includes("villa")) return "house";
  if (u.includes("opbrengst") || u.includes("appartementsgebouw")) return "apartmentBuilding";
  if (u.includes("kantoor") || u.includes("handelspand") || u.includes("commercieel") || u.includes("bedrijf")) return "commercial";
  if (u.includes("grond") || u.includes("perceel")) return "land";
  const t = title.toLowerCase();
  if (t.includes("appartement") || t.includes("studio") || t.includes("flat") || t.includes("duplex") || t.includes("penthouse")) return "apartment";
  if (t.includes("huis") || t.includes("woning") || t.includes("villa")) return "house";
  return "house";
}
