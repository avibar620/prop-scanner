import type { RawProperty } from "./types";

/**
 * Dewaele scraper — stub.
 * URL: https://www.dewaele.com/nl/te-koop. Regional Vlaanderen.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeDewaele(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
