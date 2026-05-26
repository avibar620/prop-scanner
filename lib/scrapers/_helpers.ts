import axios from "axios";
import * as cheerio from "cheerio";

export const SCRAPER_USER_AGENT =
  "Mozilla/5.0 (compatible; PropScannerBot/1.0; +https://prop-scanner.local)";

export async function safeFetch(
  url: string,
  timeoutMs = 15_000
): Promise<cheerio.CheerioAPI | null> {
  try {
    const res = await axios.get(url, {
      timeout: timeoutMs,
      headers: { "User-Agent": SCRAPER_USER_AGENT, Accept: "text/html,*/*" },
      validateStatus: (s) => s < 500, // surface 4xx, swallow 5xx
    });
    if (typeof res.data !== "string") return null;
    return cheerio.load(res.data);
  } catch {
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
