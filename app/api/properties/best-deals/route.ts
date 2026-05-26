import { NextRequest, NextResponse } from "next/server";
import { getBestDeals } from "@/lib/ai";
import { requireUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10)));
  const deals = await getBestDeals(limit);
  return NextResponse.json({ deals });
}
