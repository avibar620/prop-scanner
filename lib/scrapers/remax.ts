import type { RawProperty } from "./types";

/**
 * RE/MAX Belgium scraper — stub.
 * URL: https://www.remax.be/nl/te-koop. SPA, needs Playwright likely.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeRemax(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
