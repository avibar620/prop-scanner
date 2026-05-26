import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const rows = await prisma.marketAverage.findMany({
    orderBy: [{ city: "asc" }, { postalCode: "asc" }, { type: "asc" }],
  });
  return NextResponse.json(rows);
}
