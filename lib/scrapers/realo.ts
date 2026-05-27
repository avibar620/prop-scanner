import type { RawProperty } from "./types";

/**
 * Realo scraper — https://www.realo.be
 *
 * EMPIRICAL FINDING (2026-05-27): URL patterns we tested returned 404:
 *   - https://www.realo.be/nl/2000-antwerpen/te-koop → 404
 *   - https://www.realo.be/nl/koop?priceMin=... → 404
 *   - Sitemap https://www.realo.be/sitemap.xml → 302 redirect
 *
 * Realo has shifted to an API-first SPA architecture. Their public site
 * requires authentication or a different URL scheme we haven't reverse-engineered.
 * Stub until we find the working pattern. Returns [] safely.
 */
export async function scrapeRealo(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
