import { prisma } from "@/lib/prisma";
import { sendPropertyAlert } from "@/lib/email";
import type { Property } from "@prisma/client";

/**
 * Match a property against every active AlertRule.
 * - "immediate" mode → push an alert email to the queue right away
 * - "summary" mode → queued by the summary cron run, not here
 */
export async function matchAlertsForProperty(property: Property): Promise<{ matches: number }> {
  const rules = await prisma.alertRule.findMany({ where: { isActive: true } });
  let matches = 0;

  for (const rule of rules) {
    if (rule.postalCode && rule.postalCode !== property.postalCode) continue;
    if (rule.city && rule.city.toLowerCase() !== property.city.toLowerCase()) continue;
    if (rule.type && rule.type !== property.type) continue;
    if (
      rule.maxPricePerSqm &&
      (property.pricePerSqm == null || property.pricePerSqm > rule.maxPricePerSqm)
    )
      continue;
    if (
      rule.minDiscount &&
      (property.discountPct == null || Math.abs(property.discountPct) < rule.minDiscount)
    )
      continue;

    matches += 1;
    if (rule.alertMode === "immediate") {
      await sendPropertyAlert(property, rule);
    }
  }
  return { matches };
}

/**
 * Walk every recently-seen property and run alert matching.
 * Used by the scan cron to drive immediate notifications.
 */
export async function checkAlertsForRecent(sinceMinutes = 180): Promise<{ matched: number }> {
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
  const recent = await prisma.property.findMany({
    where: { isActive: true, firstSeenAt: { gte: since } },
  });
  let matched = 0;
  for (const p of recent) {
    const r = await matchAlertsForProperty(p);
    matched += r.matches;
  }
  return { matched };
}

/**
 * Build the summary digest for a given slot:
 * recent properties matching ANY summary-mode alert rule.
 */
export async function buildSummaryProperties(): Promise<Property[]> {
  const summaryRules = await prisma.alertRule.findMany({
    where: { isActive: true, alertMode: "summary" },
  });
  if (summaryRules.length === 0) return [];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
  const recent = await prisma.property.findMany({
    where: { isActive: true, firstSeenAt: { gte: since } },
  });

  const matched: Property[] = [];
  for (const p of recent) {
    for (const rule of summaryRules) {
      if (rule.postalCode && rule.postalCode !== p.postalCode) continue;
      if (rule.city && rule.city.toLowerCase() !== p.city.toLowerCase()) continue;
      if (rule.type && rule.type !== p.type) continue;
      if (rule.maxPricePerSqm && (p.pricePerSqm == null || p.pricePerSqm > rule.maxPricePerSqm))
        continue;
      if (rule.minDiscount && (p.discountPct == null || Math.abs(p.discountPct) < rule.minDiscount))
        continue;
      matched.push(p);
      break; // one match per property is enough for the digest
    }
  }
  return matched;
}
