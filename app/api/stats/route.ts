import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const [count, agg, lastScan] = await Promise.all([
    prisma.property.count({ where: { isActive: true } }),
    prisma.property.aggregate({
      where: { isActive: true },
      _avg: { discountPct: true },
    }),
    prisma.scanLog.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({
    totalProperties: count,
    avgDiscountPct: agg._avg.discountPct,
    lastScanAt: lastScan?.createdAt ?? null,
  });
}
