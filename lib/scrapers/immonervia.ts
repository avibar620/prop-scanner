import type { RawProperty } from "./types";

/**
 * Immo Nervia scraper — stub.
 * URL: https://www.immonervia.be/nl/te-koop. Small regional.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeImmoNervia(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
