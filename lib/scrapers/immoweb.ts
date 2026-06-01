import type { RawProperty } from "./types";

/**
 * Immoweb scraper — https://www.immoweb.be
 *
 * Empirical finding (2026-05-27): the search page returns 200 OK with ~2.9MB of
 * HTML, but the listing cards are *empty SSR shells* — the actual data is hydrated
 * client-side via XHR. We never found a public, unauthenticated JSON endpoint
 * (8 candidate API paths all returned 404).
 *
 * Resolution: drive a real browser via Playwright. Gated on `USE_PLAYWRIGHT=true`
 * so that:
 *   - Vercel serverless deploys, which don't ship a Chromium binary, simply
 *     return [] (no crash, no install bloat)
 *   - GitHub Actions (which installs Chromium via `npx playwright install`)
 *     can run it during the scheduled scrape workflow
 *
 * Returns [] safely on ANY failure path. Never throws.
 */

const USE_PLAYWRIGHT = process.env.USE_PLAYWRIGHT === "true";
const MAX_PAGES_PER_AREA = 5;       // Be polite; Immoweb is large
const SCROLL_WAIT_MS = 1_200;
const PAGE_TIMEOUT_MS = 25_000;

export async function scrapeImmoweb(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  if (!USE_PLAYWRIGHT) {
    // In environments without Playwright (Vercel serverless, local dev without
    // the optional dep installed), this scraper is a no-op.
    return [];
  }

  // Load playwright via createRequire so tsx's transpiled context can resolve
  // the bare specifier. The simpler `await import("playwright")` fails in CI
  // because tsx serves our module from a `data:` URL whose base scheme isn't
  // hierarchical, so bare-specifier resolution can't kick in.
  let playwright: typeof import("playwright");
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    playwright = require("playwright");
  } catch (err) {
    console.error("[immoweb] playwright not available, skipping:", err instanceof Error ? err.message : err);
    return [];
  }

  const out: RawProperty[] = [];
  const seen = new Set<string>();
  let browser: import("playwright").Browser | null = null;

  try {
    browser = await playwright.chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "nl-BE",
      viewport: { width: 1280, height: 900 },
    });

    for (const area of areas) {
      try {
        for (let page = 1; page <= MAX_PAGES_PER_AREA; page++) {
          const url = `https://www.immoweb.be/nl/zoeken/huis-en-appartement/te-koop?countries=BE&postalCodes=${area.postalCode}&page=${page}&orderBy=relevance`;
          const tab = await ctx.newPage();
          try {
            await tab.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT_MS });

            // Wait for the listing cards to hydrate. Card selectors observed on
            // Immoweb's current frontend (subject to change).
            const cardSelector = "li.search-results__item, article[class*='card'], [data-test*='result']";
            await tab
              .waitForSelector(cardSelector, { timeout: 12_000 })
              .catch(() => null);

            // Scroll to trigger lazy load of below-the-fold cards
            await tab.evaluate(async () => {
              await new Promise<void>((resolve) => {
                let scrolled = 0;
                const id = setInterval(() => {
                  window.scrollBy(0, 800);
                  scrolled += 800;
                  if (scrolled > 5000) {
                    clearInterval(id);
                    resolve();
                  }
                }, 200);
              });
            });
            await tab.waitForTimeout(SCROLL_WAIT_MS);

            const items = await tab.evaluate(() => {
              const results: Array<{
                externalId: string;
                url: string;
                title: string;
                price: number | null;
                sqm: number | null;
                rooms: number | null;
                address: string;
                imageUrl: string | null;
              }> = [];

              const cards = document.querySelectorAll(
                "li.search-results__item, article[class*='card']"
              );
              cards.forEach((el) => {
                const link = el.querySelector("a[href*='/classified/']") as HTMLAnchorElement | null;
                if (!link) return;
                const href = link.href;
                const idMatch = href.match(/\/classified\/(\d+)/) || href.match(/\/(\d{7,})/);
                if (!idMatch) return;
                const externalId = `immoweb-${idMatch[1]}`;

                const text = (sel: string) => {
                  const node = el.querySelector(sel);
                  return node ? (node.textContent || "").trim() : "";
                };
                const priceText = text("[class*='price'], [data-test*='price']");
                const priceMatch = priceText.replace(/[^0-9]/g, "");
                const price = priceMatch ? parseInt(priceMatch, 10) : null;
                if (!price || price < 1000) return;

                const title = text("h2, h3, [class*='title']") || "Onbekend";
                const address = text("[class*='location'], [class*='address']");
                const meta = text("[class*='attributes'], [class*='meta']");
                const sqmMatch = meta.match(/(\d{2,4})\s*m/i);
                const sqm = sqmMatch ? parseInt(sqmMatch[1], 10) : null;
                const roomsMatch = meta.match(/(\d+)\s*(?:slpk|slaapkamer|chambre)/i);
                const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : null;

                const img = el.querySelector("img") as HTMLImageElement | null;
                const imageUrl = img?.src || img?.getAttribute("data-src") || null;

                results.push({ externalId, url: href, title, price, sqm, rooms, address, imageUrl });
              });
              return results;
            });

            // Stop on first empty page
            if (items.length === 0) {
              await tab.close();
              break;
            }

            for (const item of items) {
              if (seen.has(item.externalId)) continue;
              seen.add(item.externalId);
              out.push({
                externalId: item.externalId,
                source: "Immoweb",
                sourceUrl: "https://www.immoweb.be",
                url: item.url,
                title: item.title,
                price: item.price ?? 0,
                sqm: item.sqm ?? undefined,
                rooms: item.rooms ?? undefined,
                type: inferType(item.title),
                address: item.address,
                city: area.city,
                municipality: area.city,
                postalCode: area.postalCode,
                imageUrl: item.imageUrl ?? undefined,
                imageUrls: item.imageUrl ? [item.imageUrl] : [],
              });
            }

            console.log(`[immoweb] ${area.city} ${area.postalCode} p${page}: +${items.length}`);
          } finally {
            await tab.close().catch(() => null);
          }

          // Polite delay between pages
          await new Promise((r) => setTimeout(r, 2_000 + Math.random() * 1_500));
        }
      } catch (areaErr) {
        console.error(`[immoweb] area ${area.city} ${area.postalCode} failed:`, areaErr);
      }
    }
  } catch (err) {
    console.error("[immoweb] browser-level failure:", err instanceof Error ? err.message : err);
  } finally {
    if (browser) await browser.close().catch(() => null);
  }

  return out;
}

function inferType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("opbrengst") || t.includes("appartementsgebouw")) return "apartmentBuilding";
  if (t.includes("handelspand") || t.includes("kantoor") || t.includes("commercieel") || t.includes("bedrijf")) return "commercial";
  if (t.includes("grond") || t.includes("perceel") || t.includes("bos")) return "land";
  if (t.includes("appartement") || t.includes("studio") || t.includes("flat") || t.includes("duplex")) return "apartment";
  return "house";
}
