import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const areas = await prisma.searchArea.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(areas);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    city?: string;
    postalCode?: string;
    region?: string;
    isActive?: boolean;
  };
  if (!body.name || !body.city) {
    return NextResponse.json({ error: "name + city required" }, { status: 400 });
  }
  const area = await prisma.searchArea.create({
    data: {
      name: body.name,
      city: body.city,
      postalCode: body.postalCode ?? null,
      region: body.region ?? null,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(area, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.searchArea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
