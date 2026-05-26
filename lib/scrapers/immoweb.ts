import type { RawProperty } from "./types";

/**
 * Immoweb scraper — https://www.immoweb.be
 * Stub: returns []. Live selectors target https://www.immoweb.be/nl/zoeken/
 */
export async function scrapeImmoweb(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];
  try {
    for (const _area of areas) {
      // const url = `https://www.immoweb.be/nl/zoeken/woning/te-koop?countries=BE&postalCodes=BE-${_area.postalCode}`;
      // ... cheerio selectors here ...
    }
  } catch (err) {
    console.error("[immoweb] scrape failed:", err);
  }
  return out;
}
