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
import { scrapeTroostwijk } from "./troostwijk";
import { scrapeNotaris } from "./notaris";
import { scrapeRemax } from "./remax";
import { scrapeSothebys } from "./sothebys";
import { scrapeEngelVoelkers } from "./engelvoelkers";
import { scrapeTrevi } from "./trevi";
import { scrapeLatourPetit } from "./latourpetit";
import { scrapeImmoFrancken } from "./immofrancken";
import { scrapeDewaele } from "./dewaele";
import { scrapeConfidence } from "./confidence";
import { scrapeSyndicOne } from "./syndicone";
import { scrapeAxelImmo } from "./axelimmo";
import { scrapeImmoWouters } from "./immowouters";
import { scrapeImmoCorner } from "./immocorner";
import { scrapeImmoPicke } from "./immopicke";
import { scrape2dehands } from "./tweedehands";
import { scrapeKapaza } from "./kapaza";
import { scrapeImmoNervia } from "./immonervia";
import { scrapeImmoMechelen } from "./immomechelen";
import { scrapeImmoscoop } from "./immoscoop";

type ScraperFn = (areas: Array<{ city: string; postalCode: string }>) => Promise<RawProperty[]>;

const SOURCE_TO_SCRAPER: Record<string, ScraperFn> = {
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
  Troostwijk: scrapeTroostwijk,
  "Notaris.be": scrapeNotaris,
  "RE/MAX Belgium": scrapeRemax,
  "Sotheby's Belgium": scrapeSothebys,
  "Engel & Völkers": scrapeEngelVoelkers,
  Trevi: scrapeTrevi,
  "Latour & Petit": scrapeLatourPetit,
  "Immo Francken": scrapeImmoFrancken,
  Dewaele: scrapeDewaele,
  "Confidence Immo": scrapeConfidence,
  "Syndic One": scrapeSyndicOne,
  "Axel Immo": scrapeAxelImmo,
  "Immo Wouters": scrapeImmoWouters,
  "Immo Corner": scrapeImmoCorner,
  "Immo Pické": scrapeImmoPicke,
  "2dehands Immo": scrape2dehands,
  Kapaza: scrapeKapaza,
  "Immo Nervia": scrapeImmoNervia,
  "Immo Mechelen": scrapeImmoMechelen,
  Immoscoop: scrapeImmoscoop,
};

export type RunSummary = {
  total: number;
  new: number;
  updated: number;
  errors: Array<{ source: string; message: string }>;
  perSource: Array<ScraperResult>;
};

/** Per-source timeout: don't let one slow site block the whole batch. */
const PER_SOURCE_TIMEOUT_MS = 30_000;

/** Max scrapers running at once: be polite to network + Vercel function limits. */
const CONCURRENCY = 5;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(timer); resolve(v); }).catch((e) => { clearTimeout(timer); reject(e); });
  });
}

/**
 * Run every ACTIVE scraper against the active SearchAreas. Concurrency-limited,
 * timeout-bounded, error-isolated. Upserts results, recomputes market averages.
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

  // Run scrapers in batches of CONCURRENCY
  const runners = sources.map((src) => async (): Promise<{ src: typeof src; items: RawProperty[]; ok: boolean; err?: string }> => {
    const fn = SOURCE_TO_SCRAPER[src.name];
    if (!fn) return { src, items: [], ok: false, err: "No scraper registered" };
    try {
      const items = await withTimeout(fn(areaInput), PER_SOURCE_TIMEOUT_MS, src.name);
      return { src, items, ok: true };
    } catch (e) {
      return { src, items: [], ok: false, err: e instanceof Error ? e.message : String(e) };
    }
  });

  for (let i = 0; i < runners.length; i += CONCURRENCY) {
    const batch = runners.slice(i, i + CONCURRENCY).map((r) => r());
    const settled = await Promise.allSettled(batch);

    for (const s of settled) {
      if (s.status === "rejected") {
        errors.push({ source: "unknown", message: String(s.reason) });
        continue;
      }
      const { src, items, ok, err } = s.value;
      let sourceNew = 0;
      let sourceUpd = 0;

      for (const raw of items) {
        try {
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
            await prisma.property.update({ where: { id: existing.id }, data: baseData });
            if (priceChanged) {
              await prisma.priceHistory.create({ data: { propertyId: existing.id, price: raw.price } });
            }
            sourceUpd += 1;
          } else {
            const created = await prisma.property.create({ data: { externalId: raw.externalId, ...baseData } });
            await prisma.priceHistory.create({ data: { propertyId: created.id, price: raw.price } });
            sourceNew += 1;
          }
        } catch (upsertErr) {
          console.error(`[upsert] ${raw.externalId}`, upsertErr);
        }
      }

      total += items.length;
      createdCount += sourceNew;
      updatedCount += sourceUpd;
      perSource.push({ source: src.name, ok, items, error: err });
      if (err) errors.push({ source: src.name, message: err });

      await prisma.dataSource.update({
        where: { id: src.id },
        data: { lastScanned: new Date(), totalFound: { increment: sourceNew } },
      });
      await prisma.scanLog.create({
        data: { source: src.name, status: ok ? "success" : "error", count: items.length, newCount: sourceNew, message: err ?? null },
      });
    }
  }

  if (total > 0) {
    await recalculateMarketAverages();
  }

  return { total, new: createdCount, updated: updatedCount, errors, perSource };
}
