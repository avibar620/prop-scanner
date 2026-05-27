import type { RawProperty } from "./types";

/**
 * Sotheby's Belgium scraper — stub.
 * URL: https://www.sothebysrealty.be/nl/te-koop. Luxury, low volume.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeSothebys(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
