import type { RawProperty } from "./types";

/**
 * Logic-Immo scraper — STUB (site shut down / merged into Zimmo).
 *
 * EMPIRICAL FINDINGS (2026-06-02):
 *   - https://www.logic-immo.be/ now 302-redirects to https://www.zimmo.be/fr/
 *   - https://www.logic-immo.be/rss/for-sale/ same redirect; no RSS feed exists.
 *   - Any search-page URL pattern we tested resolved to Zimmo's French homepage.
 *
 * Logic-Immo Belgium appears to have been merged with Zimmo (both are Mediahuis
 * properties). Since our Zimmo scraper already covers this inventory, scraping
 * Logic-Immo would just produce duplicate listings. No code change planned.
 */
export async function scrapeLogicImmo(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
