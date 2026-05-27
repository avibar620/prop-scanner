import type { RawProperty } from "./types";

/**
 * Notaris.be scraper — stub.
 * Official notarial sales register. URL: https://www.notaris.be/nl/te-koop. Public-interest data but redistribution may be regulated.
 *
 * STATUS: not yet implemented. Returns []. Wired into runAllScrapers manager,
 * registered in DataSource seed. Live selectors to be added per-site after
 * empirical verification (see Zimmo for a working pattern).
 */
export async function scrapeNotaris(
  _areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  return [];
}
