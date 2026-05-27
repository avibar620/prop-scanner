import type { RawProperty } from "./types";

/**
 * Axel Immo scraper — stub.
 * URL: https://www.axelimmo.be/nl/te-koop. Small regional.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeAxelImmo(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
