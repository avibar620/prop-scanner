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

/** Returns the raw HTML body or `null` on any error. Retries once on 5xx or
 *  network/timeout failures — ScraperAPI sometimes flakes on heavy renders.
 */
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
  // render=true on big SPAs (Immoweb's 2.9MB) needs more than 60s sometimes.
  const timeout = opts.timeoutMs ?? (opts.render === false ? 30_000 : 90_000);

  async function once(): Promise<{ ok: boolean; html: string | null; status: number | null }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return { ok: false, html: null, status: res.status };
        // The timer MUST stay armed until the body is fully read. It used to be
        // cleared in a `finally` right after the headers arrived, which left
        // `res.text()` with no timeout at all — ScraperAPI would return 200
        // headers and then stall mid-body, hanging the whole scrape forever
        // (observed 2026-08-13: a run sat idle for 45 min at zero CPU).
        return { ok: true, html: await res.text(), status: 200 };
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[scraperapi] network/timeout for ${target.slice(0, 90)}: ${msg.slice(0, 100)}`);
      return { ok: false, html: null, status: null };
    }
  }

  let attempt = await once();
  // Retry once on 5xx or network errors — but NOT on 4xx (those are real
  // dead URLs and a retry just wastes credits).
  if (!attempt.ok && (attempt.status === null || (attempt.status >= 500 && attempt.status <= 599))) {
    console.warn(`[scraperapi] retry for ${target.slice(0, 90)}`);
    attempt = await once();
  }
  if (!attempt.ok) {
    console.warn(`[scraperapi] ${attempt.status ?? "ERR"} for ${target.slice(0, 90)}`);
    return null;
  }
  return attempt.html;
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
