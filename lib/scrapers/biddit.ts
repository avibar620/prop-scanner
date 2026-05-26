import type { RawProperty } from "./types";

/**
 * BidditImmo (auctions) scraper — stub.
 * Note: auction sites have strict ToS. Verify scraping policy before activating.
 */
export async function scrapeBiddit(
  areas: Array<{ city: string; postalCode: string }>
): Promise<RawProperty[]> {
  const out: RawProperty[] = [];
  try {
    for (const _area of areas) {
      // implement selectors here
    }
  } catch (err) {
    console.error("[biddit] scrape failed:", err);
  }
  return out;
}
