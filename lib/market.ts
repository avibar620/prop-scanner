import { prisma } from "@/lib/prisma";

/**
 * Market averages — winsorized, room-bucketed, with hierarchical fallback.
 *
 * Architecture (replaces naive avg of all properties in a postal+type group):
 *
 *  Level 1 (most specific): postalCode × type × roomsBucket
 *  Level 2:                 postalCode × type
 *  Level 3:                 city × type × roomsBucket
 *  Level 4 (most generic):  city × type
 *
 * For each level, compute a *winsorized* mean of pricePerSqm:
 *   - require ≥5 samples
 *   - drop outliers: anything outside [0.2 × init_avg, 3 × init_avg]
 *   - require ≥5 samples remaining after outlier drop
 *   - return rounded mean
 *
 * Per-property discountPct uses the most specific bucket available.
 * The MarketAverage table is populated at L2 (postal+type) for the admin UI
 * since the schema's @@unique is on (postalCode, type).
 */

type Sample = { id: string; pricePerSqm: number; city: string };

function roomsBucket(rooms: number | null): "1" | "2" | "3" | "4+" {
  if (rooms == null || rooms <= 1) return "1";
  if (rooms === 2) return "2";
  if (rooms === 3) return "3";
  return "4+";
}

function winsorizedAvg(samples: number[]): { avg: number; n: number } | null {
  if (samples.length < 5) return null;
  const init = samples.reduce((a, b) => a + b, 0) / samples.length;
  const lo = init * 0.2;
  const hi = init * 3;
  const filtered = samples.filter((v) => v >= lo && v <= hi);
  if (filtered.length < 5) return null;
  const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;
  return { avg: Math.round(avg), n: filtered.length };
}

function push<T>(m: Map<string, T[]>, key: string, val: T) {
  const arr = m.get(key);
  if (arr) arr.push(val);
  else m.set(key, [val]);
}

export async function recalculateMarketAverages(): Promise<{
  groupsComputed: number;
  propertiesUpdated: number;
  fallbackBreakdown: Record<"L1" | "L2" | "L3" | "L4" | "none", number>;
}> {
  const props = await prisma.property.findMany({
    where: { isActive: true, pricePerSqm: { not: null } },
    select: { id: true, city: true, postalCode: true, type: true, rooms: true, pricePerSqm: true },
  });

  const L1 = new Map<string, Sample[]>(); // postalCode|type|roomsBucket
  const L2 = new Map<string, Sample[]>(); // postalCode|type
  const L3 = new Map<string, Sample[]>(); // city|type|roomsBucket
  const L4 = new Map<string, Sample[]>(); // city|type

  for (const p of props) {
    if (!p.pricePerSqm) continue;
    const rb = roomsBucket(p.rooms);
    const s: Sample = { id: p.id, pricePerSqm: p.pricePerSqm, city: p.city };
    push(L1, `${p.postalCode}|${p.type}|${rb}`, s);
    push(L2, `${p.postalCode}|${p.type}`, s);
    push(L3, `${p.city}|${p.type}|${rb}`, s);
    push(L4, `${p.city}|${p.type}`, s);
  }

  // Cache winsorized averages per bucket key (compute once, lookup many)
  const avgL1 = new Map<string, number>();
  const avgL2 = new Map<string, number>();
  const avgL3 = new Map<string, number>();
  const avgL4 = new Map<string, number>();

  for (const [k, samples] of L1) {
    const r = winsorizedAvg(samples.map((s) => s.pricePerSqm));
    if (r) avgL1.set(k, r.avg);
  }
  for (const [k, samples] of L2) {
    const r = winsorizedAvg(samples.map((s) => s.pricePerSqm));
    if (r) avgL2.set(k, r.avg);
  }
  for (const [k, samples] of L3) {
    const r = winsorizedAvg(samples.map((s) => s.pricePerSqm));
    if (r) avgL3.set(k, r.avg);
  }
  for (const [k, samples] of L4) {
    const r = winsorizedAvg(samples.map((s) => s.pricePerSqm));
    if (r) avgL4.set(k, r.avg);
  }

  // Refresh the MarketAverage table from L2 (postalCode × type)
  await prisma.marketAverage.deleteMany({});
  let groupsComputed = 0;
  for (const [k, samples] of L2) {
    const avg = avgL2.get(k);
    if (!avg) continue;
    const [postalCode, type] = k.split("|");
    const city = samples[0]?.city ?? "?";
    await prisma.marketAverage.create({
      data: { city, postalCode, type, avgPricePerSqm: avg, sampleSize: samples.length },
    });
    groupsComputed += 1;
  }

  // Back-apply each property's discountPct using most-specific bucket available
  let propertiesUpdated = 0;
  const breakdown: Record<"L1" | "L2" | "L3" | "L4" | "none", number> = {
    L1: 0, L2: 0, L3: 0, L4: 0, none: 0,
  };
  for (const p of props) {
    if (!p.pricePerSqm) continue;
    const rb = roomsBucket(p.rooms);
    const avg =
      avgL1.get(`${p.postalCode}|${p.type}|${rb}`) ??
      avgL2.get(`${p.postalCode}|${p.type}`) ??
      avgL3.get(`${p.city}|${p.type}|${rb}`) ??
      avgL4.get(`${p.city}|${p.type}`);

    if (!avg) {
      breakdown.none += 1;
      // Clear stale discountPct so old (incorrect) values don't linger
      await prisma.property.update({
        where: { id: p.id },
        data: { pricePerSqmAvg: null, avgMarketPrice: null, discountPct: null },
      });
      continue;
    }

    // Track which level was used (informational)
    if (avgL1.has(`${p.postalCode}|${p.type}|${rb}`)) breakdown.L1 += 1;
    else if (avgL2.has(`${p.postalCode}|${p.type}`)) breakdown.L2 += 1;
    else if (avgL3.has(`${p.city}|${p.type}|${rb}`)) breakdown.L3 += 1;
    else breakdown.L4 += 1;

    const discountPct = ((p.pricePerSqm - avg) / avg) * 100;
    await prisma.property.update({
      where: { id: p.id },
      data: { pricePerSqmAvg: avg, avgMarketPrice: avg, discountPct },
    });
    propertiesUpdated += 1;
  }

  return { groupsComputed, propertiesUpdated, fallbackBreakdown: breakdown };
}

/**
 * Single-property lookup (postal+type → city+type fallback).
 */
export async function getMarketAverage(
  postalCode: string,
  type: string,
  city?: string
): Promise<{ avgPricePerSqm: number; sampleSize: number; level: "postal" | "city" } | null> {
  const direct = await prisma.marketAverage.findUnique({
    where: { postalCode_type: { postalCode, type } },
  });
  if (direct)
    return { avgPricePerSqm: direct.avgPricePerSqm, sampleSize: direct.sampleSize, level: "postal" };

  if (!city) return null;
  const cityRows = await prisma.marketAverage.findMany({ where: { city, type } });
  if (cityRows.length === 0) return null;
  const sum = cityRows.reduce((a, r) => a + r.avgPricePerSqm * r.sampleSize, 0);
  const samples = cityRows.reduce((a, r) => a + r.sampleSize, 0);
  return {
    avgPricePerSqm: Math.round(sum / samples),
    sampleSize: samples,
    level: "city",
  };
}
