import type { RawProperty } from "./types";

/** Hebbes scraper — stub. */
export async function scrapeHebbes(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];
  try {
    for (const _area of areas) {
      // implement selectors here
    }
  } catch (err) {
    console.error("[hebbes] scrape failed:", err);
  }
  return out;
}
