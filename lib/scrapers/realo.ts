import type { RawProperty } from "./types";

/**
 * Realo scraper — https://www.realo.be
 * Stub: returns []. Live selectors target https://www.realo.be/nl/{postal}
 */
export async function scrapeRealo(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];
  try {
    for (const _area of areas) {
      // implement selectors here
    }
  } catch (err) {
    console.error("[realo] scrape failed:", err);
  }
  return out;
}
