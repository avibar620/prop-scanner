import type { RawProperty } from "./types";

/**
 * 2dehands Immo scraper — stub.
 * URL: https://www.2dehands.be/l/immo/huizen-en-kamers-te-koop/. Adevinta-owned, actively litigates scrapers — DO NOT enable without legal review.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrape2dehands(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
