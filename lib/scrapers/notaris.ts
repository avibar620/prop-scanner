import type { RawProperty } from "./types";

/**
 * Notaris.be scraper — STUB (data not reachable without JS).
 *
 * EMPIRICAL FINDINGS (2026-06-02):
 *  - `https://www.notaris.be/` itself is 200 OK with Drupal anti-bot HTML.
 *  - All `/nl/te-koop*` and `/nl/immo*` URLs return 404 — those paths don't exist.
 *  - The actual property portal is `https://immo.notaris.be/` (a separate subdomain).
 *  - `https://immo.notaris.be/nl/` returns 200 OK but is a thin shell — the actual
 *    listings are loaded via XHR into an Angular SPA after page render. No SSR.
 *  - Direct URL guesses (/nl/koop, /nl/zoeken/koop, /nl/realestate/list, etc.) all 404.
 *
 * CONCLUSION: Notaris.be does not expose a scrapable HTML listing index. To use this
 * source we would need Playwright (render the SPA) + reverse-engineer their internal
 * XHR endpoint. Deferred — not blocking; revisit when adding a second Playwright source.
 */
export async function scrapeNotaris(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
