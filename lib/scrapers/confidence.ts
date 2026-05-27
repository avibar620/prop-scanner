import type { RawProperty } from "./types";

/**
 * Confidence Immo scraper — stub.
 * URL: https://www.confidence.be/nl/te-koop. Small agency.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeConfidence(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
