import { NextResponse } from "next/server";
import { analyzeProperty } from "@/lib/ai";
import { requireUser } from "@/lib/session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const res = await analyzeProperty(id);
  if (!res.ok) return NextResponse.json({ ok: false, message: res.message }, { status: 500 });
  return NextResponse.json(res);
}
