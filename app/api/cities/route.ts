import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/**
 * Returns the list of distinct cities from the Property table, with counts.
 * This is the source of truth for the FilterSidebar — the SearchArea table
 * is for the scraper's targeting (city + postal), but the Property.city
 * column is what filters actually run against.
 */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const grouped = await prisma.property.groupBy({
    by: ["city"],
    where: { isActive: true },
    _count: { city: true },
    orderBy: { _count: { city: "desc" } },
  });

  const cities = grouped
    .filter((g) => g.city)
    .map((g) => ({ city: g.city, count: g._count.city }));

  return NextResponse.json(cities);
}
