import type { RawProperty } from "./types";

/**
 * Kapaza Immo scraper — stub.
 * URL: https://www.kapaza.be/nl/immo/te-koop. Adevinta-owned (same group as 2dehands).
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeKapaza(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
