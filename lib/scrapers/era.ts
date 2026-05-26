import type { RawProperty } from "./types";

/** ERA Belgium scraper — stub. */
export async function scrapeEra(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];
  try {
    for (const _area of areas) {
      // implement selectors here
    }
  } catch (err) {
    console.error("[era] scrape failed:", err);
  }
  return out;
}
