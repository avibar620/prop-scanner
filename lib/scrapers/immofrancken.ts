import type { RawProperty } from "./types";

/**
 * Immo Francken scraper — stub.
 * URL: https://www.immofrancken.be/nl/te-koop. Regional.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeImmoFrancken(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
