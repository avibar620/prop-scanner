import type { RawProperty } from "./types";

/** Logic-Immo scraper — stub. */
export async function scrapeLogicImmo(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];
  try {
    for (const _area of areas) {
      // implement selectors here
    }
  } catch (err) {
    console.error("[logic-immo] scrape failed:", err);
  }
  return out;
}
