import type { RawProperty } from "./types";

/** Immo.be scraper — stub. */
export async function scrapeImmo(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];
  try {
    for (const _area of areas) {
      // implement selectors here
    }
  } catch (err) {
    console.error("[immo] scrape failed:", err);
  }
  return out;
}
