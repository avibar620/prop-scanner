import type { RawProperty } from "./types";

/** Immovlan scraper — stub. */
export async function scrapeImmovlan(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];
  try {
    for (const _area of areas) {
      // implement selectors here
    }
  } catch (err) {
    console.error("[immovlan] scrape failed:", err);
  }
  return out;
}
