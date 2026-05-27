import type { RawProperty } from "./types";

/**
 * Immoweb scraper — https://www.immoweb.be
 *
 * EMPIRICAL FINDING (2026-05-27):
 *   - Server responds 200 OK with ~2.9MB HTML, but the listing cards are EMPTY SHELLS
 *     hydrated client-side. `li.search-results__item` has 12KB of structure per card
 *     but zero text content — data is fetched via XHR after page load.
 *   - The 5 cards visible in our SSR fetch had no embedded JSON state either.
 *   - REQUIRES Playwright headless browser OR reverse-engineering of their internal
 *     XHR API (https://api.immoweb.be/... — needs auth headers).
 *
 * Recommendation: implement after we commit to Playwright as a dependency.
 * Until then this returns [] safely.
 */
export async function scrapeImmoweb(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
