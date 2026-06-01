import axios from "axios";
import * as cheerio from "cheerio";

// Real browser UA — sites like Zimmo serve full HTML to recognized browser UAs
// but truncated/blocked content to "PropScannerBot"-style identifiers, especially
// when the request comes from a datacenter IP (e.g. GitHub Actions).
export const SCRAPER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const DEBUG = process.env.SCRAPER_DEBUG === "true";

export async function safeFetch(
  url: string,
  timeoutMs = 15_000
): Promise<cheerio.CheerioAPI | null> {
  try {
    const res = await axios.get(url, {
      timeout: timeoutMs,
      headers: {
        "User-Agent": SCRAPER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "nl-BE,nl;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      validateStatus: (s) => s < 500,
    });
    if (DEBUG) {
      console.log(`[fetch] ${res.status} ${url.slice(0, 100)} (${typeof res.data === "string" ? res.data.length : 0} bytes)`);
    }
    if (typeof res.data !== "string") return null;
    if (res.status >= 400) {
      // Always log non-200 to help diagnose blocks in CI
      console.warn(`[fetch] HTTP ${res.status} ${url.slice(0, 100)}`);
      return null;
    }
    return cheerio.load(res.data);
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
