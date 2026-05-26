import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const existing = await prisma.property.findUnique({ where: { id }, select: { isFavorite: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.property.update({
    where: { id },
    data: { isFavorite: !existing.isFavorite },
    select: { id: true, isFavorite: true },
  });
  return NextResponse.json(updated);
}
