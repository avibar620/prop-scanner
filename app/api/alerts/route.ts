import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const rules = await prisma.alertRule.findMany({
    where: { userId: auth.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    postalCode?: string | null;
    city?: string | null;
    type?: string | null;
    maxPricePerSqm?: number | null;
    minDiscount?: number | null;
    alertMode?: string;
    isActive?: boolean;
  };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const rule = await prisma.alertRule.create({
    data: {
      userId: auth.id,
      name: body.name,
      postalCode: body.postalCode ?? null,
      city: body.city ?? null,
      type: body.type ?? null,
      maxPricePerSqm: body.maxPricePerSqm ?? null,
      minDiscount: body.minDiscount ?? null,
      alertMode: body.alertMode === "immediate" ? "immediate" : "summary",
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  // ensure user owns the rule
  const rule = await prisma.alertRule.findUnique({ where: { id } });
  if (!rule || rule.userId !== auth.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.alertRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
