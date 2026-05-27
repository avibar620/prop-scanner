import type { RawProperty } from "./types";

/**
 * Immo Mechelen scraper — stub.
 * URL: https://www.immomechelen.be/nl/te-koop. Small regional, Mechelen area.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeImmoMechelen(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
