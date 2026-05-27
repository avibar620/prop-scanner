import type { RawProperty } from "./types";

/**
 * Syndic One scraper — stub.
 * URL: https://www.syndicone.be. Building management firm — listings rare.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeSyndicOne(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
