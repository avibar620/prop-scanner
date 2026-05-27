import type { RawProperty } from "./types";

/**
 * Latour & Petit scraper — stub.
 * URL: https://www.latouretpetit.be/nl/te-koop. Brussels agency.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeLatourPetit(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
