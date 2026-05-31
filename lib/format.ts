export function formatEUR(n: number): string {
  return "€ " + n.toLocaleString("nl-BE");
}

export function formatPerSqm(n: number | null | undefined): string {
  if (n == null) return "—";
  return "€ " + n.toLocaleString("nl-BE") + "/m²";
}

/**
 * Relative time. Accepts either a single date OR (publishedAt, firstSeenAt) —
 * publishedAt wins when present, falls back to firstSeenAt.
 *
 * Tiers: <5min → "just now", <60min → minutes, <24h → hours, <7d → days, else weeks.
 */
export function relativeTime(
  date: Date | string | null | undefined,
  lang: "nl" | "en" | "he" = "nl",
  fallback?: Date | string | null
): string {
  const src = date ?? fallback;
  if (!src) return "";
  const d = typeof src === "string" ? new Date(src) : src;
  const diffMs = Date.now() - d.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "";
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  const labels = {
    nl: { just: "Zojuist", m: "min. geleden", h: "uur geleden", d: "dagen geleden", w: "weken geleden" },
    en: { just: "Just now", m: "min ago", h: "hours ago", d: "days ago", w: "weeks ago" },
    he: { just: "הרגע", m: "דקות", h: "שעות", d: "ימים", w: "שבועות" },
  } as const;
  const L = labels[lang];

  if (minutes < 5) return L.just;
  if (minutes < 60) return `${minutes} ${L.m}`;
  if (hours < 24) return `${hours} ${L.h}`;
  if (days < 7) return `${days} ${L.d}`;
  return `${weeks} ${L.w}`;
}

export function dealLevel(discountPct: number | null | undefined): {
  level: "excellent" | "good" | "ok" | "low";
  color: string;
} {
  const abs = Math.abs(discountPct ?? 0);
  if (abs > 35) return { level: "excellent", color: "var(--deal-excellent)" };
  if (abs >= 20) return { level: "good", color: "var(--deal-good)" };
  if (abs >= 10) return { level: "ok", color: "var(--deal-ok)" };
  return { level: "low", color: "var(--deal-low)" };
}

export function aiVerdict(score: number | null | undefined): {
  level: "excellent" | "good" | "warn" | "bad" | "none";
  label: string;
  bg: string;
  emoji: string;
} {
  if (score == null) return { level: "none", label: "", bg: "transparent", emoji: "" };
  if (score >= 8) return { level: "excellent", label: "Uitstekende deal", bg: "#E8F5EE", emoji: "✅" };
  if (score >= 6) return { level: "good", label: "Goede deal", bg: "#E8F0FE", emoji: "✓" };
  if (score >= 4) return { level: "warn", label: "Controleren vereist", bg: "#FFF8E1", emoji: "⚠️" };
  return { level: "bad", label: "Niet aanbevolen", bg: "#FDECEA", emoji: "❌" };
}
