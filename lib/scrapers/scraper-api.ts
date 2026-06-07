import * as cheerio from "cheerio";

/**
 * ScraperAPI gateway — https://www.scraperapi.com
 *
 * Routes a target URL through ScraperAPI's IP pool + headless rendering so
 * sites that block direct Vercel / GitHub Actions IPs (Immoweb, Realo,
 * Immoscoop, …) become reachable. Each call costs ScraperAPI credits — the
 * `render=true` flag (JS rendering) is ~5-25× a plain fetch, so use it
 * sparingly. `country_code=be` makes the outbound IP look Belgian so
 * country-gated sites don't reroute us to a non-BE catalogue.
 *
 * NEVER throws — returns `null` on any failure. Scrapers should treat that
 * as "page unreachable, move on" and return an empty array rather than
 * blowing up the whole orchestration.
 */

const ENDPOINT = "http://api.scraperapi.com";

export type FetchOptions = {
  /** Run a real browser on ScraperAPI's side (needed for SPA sites). */
  render?: boolean;
  /** Override default 60s timeout. */
  timeoutMs?: number;
  /** ISO country code; defaults to "be". */
  country?: string;
};

let warnedMissingKey = false;

function getKey(): string | null {
  const key = process.env.SCRAPER_API_KEY;
  if (!key || key === "PLACEHOLDER_FILL_THIS") {
    if (!warnedMissingKey) {
      console.warn("[scraperapi] SCRAPER_API_KEY not set — scrapers using this gateway will return [].");
      warnedMissingKey = true;
    }
    return null;
  }
  return key;
}

/** Returns the raw HTML body or `null` on any error. */
export async function scraperFetch(target: string, opts: FetchOptions = {}): Promise<string | null> {
  const key = getKey();
  if (!key) return null;

  const params = new URLSearchParams({
    api_key: key,
    url: target,
    country_code: opts.country ?? "be",
  });
  if (opts.render !== false) params.set("render", "true");

  const url = `${ENDPOINT}?${params.toString()}`;
  const timeout = opts.timeoutMs ?? 60_000;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      console.warn(`[scraperapi] ${res.status} for ${target.slice(0, 90)}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[scraperapi] error fetching ${target.slice(0, 90)}: ${msg.slice(0, 120)}`);
    return null;
  }
}

/** Convenience: returns a Cheerio root or `null` on failure. */
export async function scraperFetch$(target: string, opts: FetchOptions = {}): Promise<cheerio.CheerioAPI | null> {
  const html = await scraperFetch(target, opts);
  if (!html) return null;
  return cheerio.load(html);
}

/** Whether ScraperAPI is configured (used by scrapers to short-circuit). */
export function scraperApiAvailable(): boolean {
  return getKey() !== null;
}
