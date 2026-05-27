import type { RawProperty } from "./types";

/**
 * Trevi scraper — stub.
 * URL: https://www.trevi.be/nl/te-koop. Local agency.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeTrevi(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
