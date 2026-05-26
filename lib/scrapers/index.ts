import { prisma } from "@/lib/prisma";
import { recalculateMarketAverages } from "@/lib/market";
import type { RawProperty, ScraperResult } from "./types";

import { scrapeZimmo } from "./zimmo";
import { scrapeImmoweb } from "./immoweb";
import { scrapeRealo } from "./realo";
import { scrapeImmo } from "./immo";
import { scrapeLogicImmo } from "./logicimmo";
import { scrapeEra } from "./era";
import { scrapeCentury21 } from "./century21";
import { scrapeBiddit } from "./biddit";
import { scrapeHebbes } from "./hebbes";
import { scrapeImmovlan } from "./immovlan";

const SOURCE_TO_SCRAPER: Record<string, (areas: Array<{ city: string; postalCode: string }>) => Promise<RawProperty[]>> = {
  Zimmo: scrapeZimmo,
  Immoweb: scrapeImmoweb,
  Realo: scrapeRealo,
  "Immo.be": scrapeImmo,
  "Logic-Immo": scrapeLogicImmo,
  "ERA Belgium": scrapeEra,
  "Century21 Belgium": scrapeCentury21,
  BidditImmo: scrapeBiddit,
  Hebbes: scrapeHebbes,
  Immovlan: scrapeImmovlan,
};

export type RunSummary = {
  total: number;
  new: number;
  updated: number;
  errors: Array<{ source: string; message: string }>;
  perSource: Array<ScraperResult>;
};

/**
 * Run every ACTIVE scraper against the active SearchAreas, upsert results,
 * recompute market averages, and queue alerts.
 */
export async function runAllScrapers(): Promise<RunSummary> {
  const [sources, areas] = await Promise.all([
    prisma.dataSource.findMany({ where: { isActive: true } }),
    prisma.searchArea.findMany({ where: { isActive: true } }),
  ]);

  const areaInput = areas.map((a) => ({ city: a.city, postalCode: a.postalCode ?? "" }));

  const perSource: ScraperResult[] = [];
  let total = 0;
  let createdCount = 0;
  let updatedCount = 0;
  const errors: RunSummary["errors"] = [];

  for (const src of sources) {
    const fn = SOURCE_TO_SCRAPER[src.name];
    if (!fn) {
      perSource.push({ source: src.name, ok: false, items: [], error: "No scraper registered" });
      continue;
    }

    let items: RawProperty[] = [];
    let ok = true;
    let errMsg: string | undefined;

    try {
      items = await fn(areaInput);
    } catch (err) {
      ok = false;
      errMsg = err instanceof Error ? err.message : String(err);
      errors.push({ source: src.name, message: errMsg });
    }

    let sourceNew = 0;
    let sourceUpd = 0;

    for (const raw of items) {
      const pricePerSqm = raw.sqm && raw.sqm > 0 ? Math.round(raw.price / raw.sqm) : null;
      const existing = await prisma.property.findUnique({ where: { externalId: raw.externalId } });

      const baseData = {
        source: raw.source,
        sourceUrl: raw.sourceUrl,
        url: raw.url,
        title: raw.title,
        price: raw.price,
        pricePerSqm,
        sqm: raw.sqm ?? null,
        rooms: raw.rooms ?? null,
        type: raw.type,
        address: raw.address,
        city: raw.city,
        municipality: raw.municipality,
        postalCode: raw.postalCode,
        lat: raw.lat ?? null,
        lng: raw.lng ?? null,
        imageUrl: raw.imageUrl ?? null,
        imageUrls: raw.imageUrls ?? [],
        publishedAt: raw.publishedAt ?? null,
        agentEmail: raw.agentEmail ?? null,
        agentName: raw.agentName ?? null,
        agentPhone: raw.agentPhone ?? null,
        lastSeenAt: new Date(),
        isActive: true,
      };

      if (existing) {
        const priceChanged = existing.price !== raw.price;
        await prisma.property.update({
          where: { id: existing.id },
          data: baseData,
        });
        if (priceChanged) {
          await prisma.priceHistory.create({
            data: { propertyId: existing.id, price: raw.price },
          });
        }
        sourceUpd += 1;
      } else {
        const created = await prisma.property.create({
          data: { externalId: raw.externalId, ...baseData },
        });
        await prisma.priceHistory.create({
          data: { propertyId: created.id, price: raw.price },
        });
        sourceNew += 1;
      }
    }

    total += items.length;
    createdCount += sourceNew;
    updatedCount += sourceUpd;
    perSource.push({ source: src.name, ok, items, error: errMsg });

    await prisma.dataSource.update({
      where: { id: src.id },
      data: {
        lastScanned: new Date(),
        totalFound: { increment: sourceNew },
      },
    });
    await prisma.scanLog.create({
      data: {
        source: src.name,
        status: ok ? "success" : "error",
        count: items.length,
        newCount: sourceNew,
        message: errMsg ?? null,
      },
    });
  }

  // Recompute market averages now that fresh data is in.
  if (total > 0) {
    await recalculateMarketAverages();
  }

  return { total, new: createdCount, updated: updatedCount, errors, perSource };
}
