import type { RawProperty } from "./types";

/**
 * Engel & Völkers scraper — stub.
 * URL: https://www.engelvoelkers.com/nl-be/te-koop/. International chain, JS-heavy.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeEngelVoelkers(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
