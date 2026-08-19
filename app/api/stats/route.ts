import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  // Optional `since` (ISO date) — how many properties were first seen after the
  // caller's last visit. Powers the "✨ N new properties!" hint in the navbar.
  const sinceRaw = req.nextUrl.searchParams.get("since")?.trim();
  let since: Date | null = null;
  if (sinceRaw) {
    const d = new Date(sinceRaw);
    if (!Number.isNaN(d.getTime())) since = d;
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [count, agg, lastScan, newToday, newThisWeek, newSince] = await Promise.all([
    prisma.property.count({ where: { isActive: true } }),
    prisma.property.aggregate({
      where: { isActive: true },
      _avg: { discountPct: true },
    }),
    prisma.scanLog.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.property.count({ where: { isActive: true, firstSeenAt: { gte: dayAgo } } }),
    prisma.property.count({ where: { isActive: true, firstSeenAt: { gte: weekAgo } } }),
    since
      ? prisma.property.count({ where: { isActive: true, firstSeenAt: { gte: since } } })
      : Promise.resolve(0),
  ]);

  return NextResponse.json({
    totalProperties: count,
    avgDiscountPct: agg._avg.discountPct,
    lastScanAt: lastScan?.createdAt ?? null,
    newToday,
    newThisWeek,
    newSince,
  });
}
