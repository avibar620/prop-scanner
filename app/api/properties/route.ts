import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const PAGE_SIZE = 24;

const STREET_KEYWORDS = ["straat", "laan", "weg", "plein", "dreef", "steenweg", "kaai", "lei"];

function looksLikeStreet(q: string): boolean {
  const lower = q.toLowerCase();
  return STREET_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const postalCode = sp.get("postalCode")?.trim();
  const city = sp.get("city")?.trim();
  const type = sp.get("type")?.trim();
  const rooms = sp.get("rooms")?.trim();
  const minDiscount = sp.get("minDiscount") ? parseInt(sp.get("minDiscount")!, 10) : 0;
  const maxPricePerSqm = sp.get("maxPricePerSqm") ? parseInt(sp.get("maxPricePerSqm")!, 10) : 0;
  const source = sp.get("source")?.trim();
  const tag = sp.get("tag")?.trim();
  const favoritesOnly = sp.get("favorites") === "1" || sp.get("favorites") === "true";
  const aiOnly = sp.get("aiOnly") === "1" || sp.get("aiOnly") === "true";
  const sort = sp.get("sort") ?? "highestDiscount";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));

  const where: Prisma.PropertyWhereInput = { isActive: true };

  if (q) {
    where.OR = [
      { city: { contains: q, mode: "insensitive" } },
      { municipality: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
      { postalCode: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
    ];
  }

  // Street override: address-based search drops the discount floor unless user set it.
  const streetMode = q && looksLikeStreet(q) && minDiscount === 0;

  if (postalCode) where.postalCode = postalCode;
  if (city) where.city = { equals: city, mode: "insensitive" };
  if (type) where.type = type;
  if (rooms) {
    const n = parseInt(rooms, 10);
    if (!Number.isNaN(n)) {
      where.rooms = rooms === "4+" || n >= 4 ? { gte: 4 } : n;
    }
  }
  if (source) where.source = source;
  if (favoritesOnly) where.isFavorite = true;
  if (aiOnly) where.aiAnalysis = { not: null };
  if (tag) where.notes = { some: { tag } };

  if (!streetMode && minDiscount > 0) {
    where.discountPct = { lte: -minDiscount };
  }
  if (maxPricePerSqm > 0) {
    where.pricePerSqm = { lte: maxPricePerSqm };
  }

  // Sorting
  let orderBy: Prisma.PropertyOrderByWithRelationInput | Prisma.PropertyOrderByWithRelationInput[];
  switch (sort) {
    case "newest":
      orderBy = { firstSeenAt: "desc" };
      break;
    case "lowestPrice":
      orderBy = { price: "asc" };
      break;
    case "lowestPricePerSqm":
      orderBy = { pricePerSqm: "asc" };
      break;
    case "bestAiDeals":
      orderBy = [{ aiScore: "desc" }, { discountPct: "asc" }];
      break;
    case "highestDiscount":
    default:
      orderBy = { discountPct: "asc" }; // most negative = highest discount
  }

  const [total, items, statsAgg] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.property.aggregate({
      where: { isActive: true },
      _avg: { discountPct: true },
      _count: { id: true },
    }),
  ]);

  return NextResponse.json({
    properties: items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    stats: {
      totalProperties: statsAgg._count.id,
      avgDiscountPct: statsAgg._avg.discountPct,
    },
  });
}
