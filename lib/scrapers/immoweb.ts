import type { RawProperty } from "./types";
import { scraperFetch, scraperApiAvailable } from "./scraper-api";
import * as cheerio from "cheerio";

/**
 * Immoweb scraper — https://www.immoweb.be
 *
 * Background: Immoweb's search page is a 2.9 MB SPA shell that hydrates from
 * an embedded JSON blob. Direct fetches from Vercel / GitHub IPs are blocked
 * by their anti-bot, and Playwright was a heavy dependency for serverless.
 *
 * Current approach (2026-06-08): ScraperAPI gateway with render=true so the
 * SPA hydrates before we get the HTML, then prefer JSON-from-page extraction
 * over selector scraping (cards have stable class hashing — JSON is sturdier).
 *
 * NEVER throws — returns RawProperty[] always, empty if anything goes wrong.
 */

const MAX_PAGES_PER_AREA = 5;
const POLITE_DELAY_MS = 300; // Small delay to spread out ScraperAPI requests

function buildSearchUrl(postalCode: string, page: number): string {
  // Immoweb pattern verified live; sale + houses/apartments combined.
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
        const html = await scraperFetch(buildSearchUrl(area.postalCode, page), { render: true });
        if (!html) break;

        const fromJson = extractFromEmbeddedJson(html, area);
        const fromHtml = fromJson.length > 0 ? [] : extractFromHtml(html, area);
        const found = [...fromJson, ...fromHtml];

        if (found.length === 0) break;

        let added = 0;
        for (const p of found) {
          if (seen.has(p.externalId)) continue;
          seen.add(p.externalId);
          out.push(p);
          added += 1;
        }

        console.log(`[immoweb] ${area.city} ${area.postalCode} p${page}: +${added} (json=${fromJson.length}, html=${fromHtml.length})`);

        // Stop when we get a clearly partial page (fewer than expected per Immoweb's grid).
        if (found.length < 10) break;

        await sleep(POLITE_DELAY_MS);
      }
    } catch (err) {
      console.error(`[immoweb] area ${area.city} ${area.postalCode} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return out;
}

/**
 * Immoweb embeds search results in a JSON blob inside the HTML. The script
 * tag pattern has changed across releases — try a few known shapes.
 */
function extractFromEmbeddedJson(
  html: string,
  area: { city: string; postalCode: string }
): RawProperty[] {
  const candidates: unknown[] = [];

  // 1. window.classifieds = [...]
  const m1 = html.match(/window\.classifieds\s*=\s*(\[[\s\S]*?\]);/);
  if (m1) {
    try {
      candidates.push(JSON.parse(m1[1]));
    } catch {}
  }

  // 2. window.__INITIAL_STATE__ = {...}
  const m2 = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});\s*</);
  if (m2) {
    try {
      candidates.push(JSON.parse(m2[1]));
    } catch {}
  }

  // 3. <script id="__NEXT_DATA__" type="application/json">{...}</script>
  const m3 = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
  if (m3) {
    try {
      candidates.push(JSON.parse(m3[1]));
    } catch {}
  }

  // 4. Inline JSON-LD ItemList objects
  const ldMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g);
  for (const m of ldMatches) {
    try {
      candidates.push(JSON.parse(m[1]));
    } catch {}
  }

  const out: RawProperty[] = [];
  for (const blob of candidates) {
    walk(blob, (node) => {
      // Heuristic: look for objects that smell like a classified listing.
      // Common Immoweb fields: id, price, type, transaction, location, media.
      if (!isObject(node)) return;
      const o = node as Record<string, unknown>;
      const id = pickFirst(o, ["id", "classifiedId", "listingId"]);
      if (typeof id !== "number" && typeof id !== "string") return;
      const numericId = String(id);
      // Filter out non-property objects that happen to have an `id` field.
      if (!/^\d{5,}$/.test(numericId)) return;

      const price = extractPrice(o);
      if (!price) return;

      const title = pickString(o, ["title", "subtype", "summary", "headerText"]) ?? `Immoweb ${numericId}`;
      const url = (() => {
        const u = pickString(o, ["url", "link", "shareUrl"]);
        if (u && u.startsWith("http")) return u;
        return `https://www.immoweb.be/nl/classified/${numericId}`;
      })();

      const sqm = pickNumber(o, ["netHabitableSurface", "habitableSurface", "surface", "totalSurface", "livableSurface"]);
      const rooms = pickNumber(o, ["bedroomCount", "bedrooms", "rooms"]);
      const image = pickString(o, ["pictureUrl", "imageUrl", "mainPicture", "mainImage", "image"]) ?? undefined;

      const loc = (o.location ?? o.address) as Record<string, unknown> | undefined;
      let locality = pickString(loc ?? {}, ["locality", "city", "town"]) ?? area.city;
      const zip = pickString(loc ?? {}, ["postalCode", "zip"]) ?? area.postalCode;
      const street = pickString(loc ?? {}, ["street", "streetName", "address"]);
      if (!locality) locality = area.city;

      out.push({
        externalId: `immoweb-${numericId}`,
        source: "Immoweb",
        sourceUrl: "https://www.immoweb.be",
        url,
        title,
        price,
        sqm: sqm ?? undefined,
        rooms: rooms ?? undefined,
        type: inferType(title),
        address: street ?? locality,
        city: locality,
        municipality: locality,
        postalCode: String(zip ?? area.postalCode),
        imageUrl: image,
        imageUrls: image ? [image] : [],
      });
    });
  }

  return out;
}

function extractFromHtml(html: string, area: { city: string; postalCode: string }): RawProperty[] {
  const $ = cheerio.load(html);
  const out: RawProperty[] = [];

  // Cards used to be li.search-results__item; the current build (2026) uses
  // article wrappers. Cover both.
  $("article[class*='card'], li.search-results__item, [data-testid*='property']").each((_, el) => {
    const $el = $(el);
    const link = $el.find("a[href*='/classified/']").attr("href");
    if (!link) return;
    const idMatch = link.match(/\/classified\/(\d{5,})/) ?? link.match(/\/(\d{7,})/);
    if (!idMatch) return;
    const externalId = `immoweb-${idMatch[1]}`;

    const url = link.startsWith("http") ? link : `https://www.immoweb.be${link}`;
    const priceText = $el.find("[class*='price'], [data-test*='price']").first().text();
    const price = parseEuroPrice(priceText);
    if (!price) return;

    const title = trim($el.find("h2, h3, [class*='title']").first().text()) || `Immoweb ${idMatch[1]}`;
    const meta = trim($el.find("[class*='attributes'], [class*='meta']").first().text());
    const sqmMatch = meta.match(/(\d{2,4})\s*m/i);
    const sqm = sqmMatch ? parseInt(sqmMatch[1], 10) : undefined;
    const roomsMatch = meta.match(/(\d{1,2})\s*(?:slpk|slaapkamer|chambre|bedroom)/i);
    const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : undefined;
    const img = $el.find("img").first();
    const imageUrl = img.attr("src") ?? img.attr("data-src") ?? undefined;

    out.push({
      externalId,
      source: "Immoweb",
      sourceUrl: "https://www.immoweb.be",
      url,
      title,
      price,
      sqm,
      rooms,
      type: inferType(title),
      address: area.city,
      city: area.city,
      municipality: area.city,
      postalCode: area.postalCode,
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
    });
  });

  return out;
}

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function walk(node: unknown, visit: (n: unknown) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (!isObject(node)) return;
  visit(node);
  for (const v of Object.values(node)) walk(v, visit);
}

function pickFirst(o: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (o[k] != null) return o[k];
  return undefined;
}

function pickString(o: Record<string, unknown>, keys: string[]): string | undefined {
  const v = pickFirst(o, keys);
  return typeof v === "string" ? v : undefined;
}

function pickNumber(o: Record<string, unknown>, keys: string[]): number | undefined {
  const v = pickFirst(o, keys);
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) ? n : undefined;
  }
  if (isObject(v)) {
    // Sometimes the API wraps prices: { mainValue: 250000, currency: "EUR" }
    const inner = pickFirst(v, ["mainValue", "value", "amount"]);
    if (typeof inner === "number") return inner;
    if (typeof inner === "string") {
      const n = parseInt(inner.replace(/[^0-9]/g, ""), 10);
      return Number.isFinite(n) ? n : undefined;
    }
  }
  return undefined;
}

function extractPrice(o: Record<string, unknown>): number | undefined {
  // Immoweb's `price` is often a nested object { mainValue, type, currency }
  const direct = pickNumber(o, ["price", "mainValue", "value", "amount", "askPrice"]);
  if (direct && direct >= 10_000) return direct;
  if (isObject(o.price)) {
    const inner = pickNumber(o.price as Record<string, unknown>, ["mainValue", "value", "amount"]);
    if (inner && inner >= 10_000) return inner;
  }
  return undefined;
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
