import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const notes = await prisma.note.findMany({
    where: { propertyId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { content?: string; tag?: string };
  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

  const note = await prisma.note.create({
    data: {
      propertyId: id,
      userId: auth.id,
      content,
      tag: body.tag ?? null,
    },
  });
  return NextResponse.json(note, { status: 201 });
}
