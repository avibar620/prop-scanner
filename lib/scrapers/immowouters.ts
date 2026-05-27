import type { RawProperty } from "./types";

/**
 * Immo Wouters scraper — stub.
 * URL: https://www.immowouters.be/nl/te-koop. Small regional.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeImmoWouters(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
