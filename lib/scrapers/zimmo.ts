import type { RawProperty } from "./types";
// import { safeFetch, parseIntSafe, trim } from "./_helpers";

/**
 * Zimmo scraper — https://www.zimmo.be
 *
 * Stub: returns []. To activate live scraping, implement selectors against
 * https://www.zimmo.be/nl/{city}-{postalCode}/te-koop/ and map each result
 * card into a RawProperty. Wrap everything in try/catch and NEVER throw.
 */
export async function scrapeZimmo(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];
  try {
    for (const _area of areas) {
      // const url = `https://www.zimmo.be/nl/${_area.city.toLowerCase()}-${_area.postalCode}/te-koop/`;
      // const $ = await safeFetch(url);
      // if (!$) continue;
      // $(".property-item").each((_, el) => { ... });
    }
  } catch (err) {
    console.error("[zimmo] scrape failed:", err);
  }
  return out;
}
