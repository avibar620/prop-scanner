import { prisma } from "@/lib/prisma";

/**
 * Recompute market averages from current Property rows, then back-apply
 * discountPct and pricePerSqmAvg to every property.
 *
 * Rules:
 *  - Group by (postalCode, type)
 *  - Minimum 3 samples required to count as a usable average
 *  - When a group has < 3 samples, fall back to the city-wide average for that type
 *  - When still empty, leave the property's discountPct alone
 */
export async function recalculateMarketAverages(): Promise<{
  groupsComputed: number;
  propertiesUpdated: number;
}> {
  const properties = await prisma.property.findMany({
    where: { isActive: true, pricePerSqm: { not: null } },
    select: {
      id: true,
      city: true,
      postalCode: true,
      type: true,
      pricePerSqm: true,
    },
  });

  // Group by postalCode + type
  const byPostal = new Map<string, { city: string; postalCode: string; type: string; samples: number[] }>();
  // Fallback: by city + type
  const byCity = new Map<string, { city: string; type: string; samples: number[] }>();

  for (const p of properties) {
    if (!p.pricePerSqm) continue;
    const k1 = `${p.postalCode}|${p.type}`;
    const k2 = `${p.city}|${p.type}`;
    if (!byPostal.has(k1))
      byPostal.set(k1, { city: p.city, postalCode: p.postalCode, type: p.type, samples: [] });
    if (!byCity.has(k2)) byCity.set(k2, { city: p.city, type: p.type, samples: [] });
    byPostal.get(k1)!.samples.push(p.pricePerSqm);
    byCity.get(k2)!.samples.push(p.pricePerSqm);
  }

  // Upsert MarketAverage rows (only groups with >= 3 samples)
  let groupsComputed = 0;
  for (const g of byPostal.values()) {
    if (g.samples.length < 3) continue;
    const avg = Math.round(g.samples.reduce((a, b) => a + b, 0) / g.samples.length);
    await prisma.marketAverage.upsert({
      where: { postalCode_type: { postalCode: g.postalCode, type: g.type } },
      update: { city: g.city, avgPricePerSqm: avg, sampleSize: g.samples.length },
      create: {
        city: g.city,
        postalCode: g.postalCode,
        type: g.type,
        avgPricePerSqm: avg,
        sampleSize: g.samples.length,
      },
    });
    groupsComputed += 1;
  }

  // Back-apply discountPct + pricePerSqmAvg to each property
  let propertiesUpdated = 0;
  for (const p of properties) {
    if (!p.pricePerSqm) continue;
    const avg = await resolveAverage(p.postalCode, p.city, p.type, byPostal, byCity);
    if (!avg) continue;
    const discountPct = ((p.pricePerSqm - avg) / avg) * 100;
    await prisma.property.update({
      where: { id: p.id },
      data: {
        pricePerSqmAvg: avg,
        avgMarketPrice: avg,
        discountPct,
      },
    });
    propertiesUpdated += 1;
  }

  return { groupsComputed, propertiesUpdated };
}

async function resolveAverage(
  postalCode: string,
  city: string,
  type: string,
  byPostal: Map<string, { samples: number[] }>,
  byCity: Map<string, { samples: number[] }>
): Promise<number | null> {
  const postalGroup = byPostal.get(`${postalCode}|${type}`);
  if (postalGroup && postalGroup.samples.length >= 3) {
    return Math.round(postalGroup.samples.reduce((a, b) => a + b, 0) / postalGroup.samples.length);
  }
  const cityGroup = byCity.get(`${city}|${type}`);
  if (cityGroup && cityGroup.samples.length >= 3) {
    return Math.round(cityGroup.samples.reduce((a, b) => a + b, 0) / cityGroup.samples.length);
  }
  return null;
}

/**
 * Fast lookup for a single property's market average.
 * Falls back from (postalCode, type) → (city, type) → null.
 */
export async function getMarketAverage(
  postalCode: string,
  type: string,
  city?: string
): Promise<{ avgPricePerSqm: number; sampleSize: number; level: "postal" | "city" } | null> {
  const direct = await prisma.marketAverage.findUnique({
    where: { postalCode_type: { postalCode, type } },
  });
  if (direct) return { avgPricePerSqm: direct.avgPricePerSqm, sampleSize: direct.sampleSize, level: "postal" };

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
