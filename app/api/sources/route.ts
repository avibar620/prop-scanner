import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const sources = await prisma.dataSource.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(sources);
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as { id?: string; isActive?: boolean };
  if (!body.id || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "id + isActive required" }, { status: 400 });
  }
  const updated = await prisma.dataSource.update({
    where: { id: body.id },
    data: { isActive: body.isActive },
  });
  return NextResponse.json(updated);
}
