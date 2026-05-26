import type { RawProperty } from "./types";

/** Century21 Belgium scraper — stub. */
export async function scrapeCentury21(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];
  try {
    for (const _area of areas) {
      // implement selectors here
    }
  } catch (err) {
    console.error("[century21] scrape failed:", err);
  }
  return out;
}
