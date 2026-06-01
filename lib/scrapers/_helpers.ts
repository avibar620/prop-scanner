import * as cheerio from "cheerio";

// Real browser UA — see comment below about TLS fingerprinting.
export const SCRAPER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const DEBUG = process.env.SCRAPER_DEBUG === "true";

/**
 * Safe HTTP GET that returns a Cheerio root, or null on any failure.
 *
 * Uses Node's built-in `fetch` (powered by undici), NOT axios. Discovered
 * empirically (2026-06-01): Zimmo returns HTTP 403 to axios requests but
 * 200 to fetch requests, from the same IP and same User-Agent. The cause
 * is TLS fingerprinting — axios uses Node's classic http/https module
 * whose ClientHello signature is well-known to anti-bot services like
 * Cloudflare. undici/fetch presents a different, more browser-like
 * fingerprint that the targets we care about don't (currently) flag.
 */
export async function safeFetch(
  url: string,
  timeoutMs = 15_000
): Promise<cheerio.CheerioAPI | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          "User-Agent": SCRAPER_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "nl-BE,nl;q=0.9,en;q=0.8",
          // We deliberately do NOT send `Accept-Encoding: br` — undici handles
          // gzip/deflate transparently; adding br can cause some servers to
          // return a body shape we can't parse.
        },
        signal: controller.signal,
        redirect: "follow",
      });
    } finally {
      clearTimeout(timer);
    }

    if (DEBUG) {
      console.log(`[fetch] ${res.status} ${url.slice(0, 100)}`);
    }
    if (res.status >= 400) {
      console.warn(`[fetch] HTTP ${res.status} ${url.slice(0, 100)}`);
      return null;
    }
    if (res.status >= 300) return null;
    const html = await res.text();
    return cheerio.load(html);
  } catch (err) {
    console.warn(`[fetch] error ${err instanceof Error ? err.message.slice(0, 80) : String(err).slice(0, 80)} ${url.slice(0, 80)}`);
    return null;
  }
}

export function parseIntSafe(s: string | undefined | null): number | undefined {
  if (!s) return undefined;
  const digits = s.replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function trim(s: string | undefined | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}
