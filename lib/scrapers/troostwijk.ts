import type { RawProperty } from "./types";

/**
 * Troostwijk Auctions scraper — stub.
 * Auction site (commercial real estate). URL: https://www.troostwijkauctions.com/nl/vastgoed/. ToS-sensitive.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeTroostwijk(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
